"""Frozen-turbulence drag adjoint on an isolated, quality-gated primal copy."""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import math
import re
import shlex
import shutil
import sys
from pathlib import Path
from typing import Any

from foamlib import FoamFile

from daedalus.cfd import HEADER, CfdError, StepLog, _run
from daedalus.contracts import AdjointResult, JobState
from daedalus.jobs import JobQueue, cpu_limit, data_root

ASSUMPTIONS = (
    "frozen-turbulence adjoint; sign: positive = pushing the surface outward increases drag",
    "Steady continuous adjoint of the saved RANS snapshot; not transient or physical validation.",
    "Primal fields and wheel/ground boundary conditions held fixed; no geometry update.",
    "Surface-area-normalised sensitivity distribution, not a finite design-change prediction.",
)


def _header(name: str, cls: str = "dictionary") -> str:
    return HEADER.format(template="daedalus-adjoint-v1", cls=cls, obj=name)


def optimisation_dict(manifest: dict[str, Any]) -> str:
    groups = manifest["car"]["groups"]
    if not groups or any(not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", g) for g in groups):
        raise ValueError("valid explicit car patch names required")
    patches = " ".join(groups)
    speed = float(manifest["reference"]["U_m_s"])
    area = float(manifest["reference"]["Aref_half_m2"])
    rho = float(manifest["config"]["rho_kg_m3"])
    if not all(math.isfinite(v) and v > 0 for v in (speed, area, rho)):
        raise ValueError("positive finite speed, half-area and density required")
    return (
        _header("optimisationDict")
        + f"""
optimisationManager singleRun;
primalSolvers
{{
    primal
    {{
        active false; type incompressible; solver simple;
        useSolverNameForFields false;
        solutionControls {{ nIters 0; }}
    }}
}}
adjointManagers
{{
    dragManager
    {{
        primalSolver primal;
        adjointSolvers
        {{
            dragAdjoint
            {{
                active true; type incompressible; solver adjointSimple;
                useSolverNameForFields false; computeSensitivities true;
                objectives
                {{
                    type incompressible;
                    objectiveNames
                    {{
                        drag
                        {{
                            type force; weight 1; patches ({patches}); direction (1 0 0);
                            Aref {area:.12g}; rhoInf {rho:.12g}; UInf {speed:.12g};
                        }}
                    }}
                }}
                ATCModel
                {{
                    ATCModel standard; extraConvection 0; nSmooth 0;
                    zeroATCPatchTypes (wall patch); maskType pointCells;
                }}
                solutionControls
                {{
                    consistent yes; nIters 1000; printMaxMags true;
                }}
            }}
        }}
    }}
}}
optimisation
{{
    designVariables
    {{
        sensitivityType multiple; sensitivityTypes (pointBased faceBased);
        patches ({patches});
        pointBased
        {{
            sensitivityType surfacePoints; patches ({patches}); includeSurfaceArea false;
            includeMeshMovement true;
            adjointMeshMovementSolver {{ tolerance 1e-7; iters 1000; }}
        }}
        faceBased
        {{
            sensitivityType surface; patches ({patches}); includeSurfaceArea false;
            includeMeshMovement true;
            adjointMeshMovementSolver {{ tolerance 1e-7; iters 1000; }}
        }}
    }}
}}
"""
    )


def _latest(case: Path) -> Path:
    times = [p for p in case.iterdir() if p.is_dir() and re.fullmatch(r"\d+(?:\.\d+)?", p.name)]
    if not times:
        raise ValueError("primal has no reconstructed solved time directory")
    latest = max(times, key=lambda p: float(p.name))
    if float(latest.name) <= 0 or not all((latest / f).is_file() for f in ("U", "p")):
        raise ValueError("a positive reconstructed time with U and p is required")
    return latest


def check_primal(case: Path) -> dict[str, Any]:
    manifest: dict[str, Any] = json.loads((case / "daedalus_manifest.json").read_text())
    result = json.loads((case / "daedalus_result.json").read_text())
    if (
        not result.get("succeeded")
        or not result.get("mesh_ok")
        or result.get("acceptance") not in ("accepted", "pending_review")
    ):
        raise ValueError(
            "adjoint requires an accepted or pending-review mesh-passing primal; "
            "rejected runs are excluded"
        )
    _latest(case)
    optimisation_dict(manifest)
    return manifest


def _adjoint_field(name: str, groups: list[str]) -> str:
    vector = name == "Ua"
    value = "uniform (0 0 0)" if vector else "uniform 0"
    patches = {
        "inlet": f"type adjointInletVelocity; value {value};" if vector else "type zeroGradient;",
        "outlet": f"type adjointOutletVelocity; inletValue {value}; value {value};"
        if vector
        else f"type adjointFarFieldPressure; value {value};",
        "symmetry": "type symmetryPlane;",
        "top": "type slip;" if vector else "type zeroGradient;",
        "side": "type slip;" if vector else "type zeroGradient;",
        **{
            g: f"type adjointWallVelocity; value {value};" if vector else "type zeroGradient;"
            for g in ["ground", *groups]
        },
    }
    boundary = "".join(f"{p} {{ {bc} }}\n" for p, bc in patches.items())
    return (
        _header(name, "volVectorField" if vector else "volScalarField")
        + f"dimensions [0 {1 if vector else 2} {-1 if vector else -2} 0 0 0 0];\n"
        f"internalField {value};\nboundaryField {{\n{boundary}}}\n"
    )


def prepare(primal: Path, target: Path | None = None) -> Path:
    primal = primal.resolve()
    manifest = check_primal(primal)
    latest = _latest(primal)
    target = target.resolve() if target else primal.with_name(primal.name + "_adjoint")
    if target == primal or target.is_relative_to(primal):
        raise ValueError("adjoint output must be outside the immutable primal case")
    if target.exists():
        raise FileExistsError(f"refusing to overwrite adjoint output {target}")
    target.mkdir(parents=True)
    try:
        for name in ("constant", "system", latest.name):
            shutil.copytree(primal / name, target / name)
        for name in ("daedalus_manifest.json", "daedalus_result.json"):
            shutil.copy2(primal / name, target / name)
        for path in (target / latest.name).iterdir():
            if path.is_file() and "sens" in path.name.lower():
                path.unlink()  # never inherit an older sensitivity result
        (target / "system/optimisationDict").write_text(optimisation_dict(manifest))
        (target / "constant/adjointRASProperties").write_text(
            _header("RASProperties")
            + "adjointRASModel adjointLaminar;\nadjointTurbulence off;\nprintCoeffs off;\n"
        )
        for name in ("Ua", "pa"):
            (target / latest.name / name).write_text(
                _adjoint_field(name, manifest["car"]["groups"])
            )
        control = FoamFile(target / "system/controlDict")
        with control:
            control["application"] = "adjointOptimisationFoam"
            control["startFrom"] = "startTime"
            control["startTime"] = float(latest.name)
            control["endTime"] = float(latest.name) + 1000
            control["writeInterval"] = 1000
            control["purgeWrite"] = 0
            control["functions"] = {}
        solution = FoamFile(target / "system/fvSolution")
        with solution:
            if "SIMPLE" in solution:
                del solution["SIMPLE"]
            solution["solvers", "pa"] = {
                "solver": "GAMG",
                "smoother": "GaussSeidel",
                "tolerance": 1e-7,
                "relTol": 0.01,
            }
            solution["solvers", "Ua"] = {
                "solver": "smoothSolver",
                "smoother": "GaussSeidel",
                "tolerance": 1e-8,
                "relTol": 0.1,
            }
            solution["solvers", "ma"] = {
                "solver": "PCG",
                "preconditioner": "DIC",
                "tolerance": 1e-9,
                "relTol": 0.01,
            }
            solution["relaxationFactors", "fields"] = {"pa": 0.7}
            solution["relaxationFactors", "equations", "Ua"] = 0.3
        schemes = FoamFile(target / "system/fvSchemes")
        schemes["divSchemes", "div(-phiMean,Ua)"] = ("bounded", "Gauss", "upwind")
        # Keep an auditable source identity without changing the primal manifest or its acceptance.
        source_hash = hashlib.sha256((primal / "daedalus_manifest.json").read_bytes()).hexdigest()
        (target / "adjoint_manifest.json").write_text(
            json.dumps(
                {
                    "primal_case": str(primal),
                    "primal_manifest_sha256": source_hash,
                    "source_time": latest.name,
                    "assumptions": ASSUMPTIONS,
                    "iterations": 1000,
                    "template": "daedalus-adjoint-v1",
                },
                indent=2,
            )
        )
    except BaseException:
        shutil.rmtree(target)
        raise
    return target


def discover_field(case: Path) -> Path:
    """Discover scalar face sensitivities, excluding vector/point fields and stale times."""
    for time in sorted(
        (p for p in case.iterdir() if p.is_dir() and re.fullmatch(r"\d+(?:\.\d+)?", p.name)),
        key=lambda p: float(p.name),
        reverse=True,
    ):
        candidates = []
        for path in time.iterdir():
            if (
                path.is_file()
                and re.match(r"(faceSensNormal|faceSensFlowDrag|sensSurfaceDrag)", path.name)
                and FoamFile(path)["FoamFile", "class"] == "volScalarField"
            ):
                candidates.append(path)
        if len(candidates) > 1:
            raise ValueError(f"ambiguous drag sensitivity fields: {[p.name for p in candidates]}")
        if candidates:
            return candidates[0]
    raise FileNotFoundError("no scalar face sensitivity found in adjoint time directories")


def residual_reduction(log: str) -> dict[str, float]:
    history: dict[str, list[float]] = {}
    pattern = r"Solving for (Ua[xyz]|pa), Initial residual = ([^,\s]+)"
    for name, number in re.findall(pattern, log):
        try:
            value = float(number)
        except ValueError:
            value = math.nan
        history.setdefault(name, []).append(value)
    ratios: dict[str, float] = {}
    for name, values in history.items():
        if not all(math.isfinite(v) and v >= 0 for v in values):
            continue
        # Already-zero channels pass only while they remain at numerical zero.
        ratio = (
            0.0
            if values[0] <= 1e-12 and values[-1] <= 1e-12
            else values[-1] / max(values[0], 1e-12)
        )
        if math.isfinite(ratio):
            ratios[name] = ratio
    return ratios


def commands(case: Path, procs: int) -> list[tuple[str, str]]:
    if procs < 1:
        raise ValueError("positive rank count required")
    n = cpu_limit(procs)
    suffix = ["-case", str(case.resolve())]
    if n == 1:
        return [("adjoint", shlex.join(["adjointOptimisationFoam", *suffix]))]
    return [
        ("adjoint_decompose", shlex.join(["decomposePar", "-force", *suffix])),
        (
            "adjoint",
            shlex.join(["mpirun", "-np", str(n), "adjointOptimisationFoam", "-parallel", *suffix]),
        ),
        ("adjoint_reconstruct", shlex.join(["reconstructPar", "-latestTime", *suffix])),
    ]


def run(case: Path, procs: int = 8) -> AdjointResult:
    case = case.resolve()
    if not (case / "adjoint_manifest.json").exists():
        raise ValueError("prepare an isolated adjoint copy first")
    if (case / "adjoint_result.json").exists():
        raise FileExistsError(
            "adjoint already attempted; prepare a new copy instead of overwriting"
        )
    check_primal(case)
    root = data_root()
    queue = JobQueue(root)
    with (root / "jobs/worker.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise ValueError("stop the jobs worker before running an adjoint") from exc
        queue.recover()
        if any(
            j.kind in ("cfd_run", "cfd_viz") and j.state == JobState.RUNNING for j in queue.list()
        ):
            raise ValueError("a CFD subprocess still owns the machine")
        FoamFile(case / "system/decomposeParDict")["numberOfSubdomains"] = cpu_limit(procs)
        steps: list[StepLog] = []
        error = None
        field = None
        try:
            for name, command in commands(case, procs):
                _run(case, name, command, steps)
            field = str(discover_field(case).relative_to(case))
        except (CfdError, FileNotFoundError, ValueError) as exc:
            error = str(exc)
        log_path = case / "log.adjoint"
        reductions = (
            residual_reduction(log_path.read_text(errors="replace")) if log_path.exists() else {}
        )
        converged = all(
            name in reductions and reductions[name] <= 1e-3 for name in ("Uax", "Uay", "Uaz", "pa")
        )
        result = AdjointResult(
            succeeded=error is None,
            converged=converged,
            field=field,
            residual_ratios=reductions,
            error=error,
            n_procs=cpu_limit(procs),
            assumptions=ASSUMPTIONS,
        )
        (case / "adjoint_result.json").write_text(result.model_dump_json(indent=2))
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="daedalus adjoint")
    parser.add_argument("command", choices=("prepare", "run", "export"))
    parser.add_argument("case", type=Path)
    parser.add_argument("--out", type=Path, help="new isolated copy for prepare")
    parser.add_argument("--procs", type=int, default=8)
    args = parser.parse_args(argv)
    try:
        if args.command == "prepare":
            print(prepare(args.case, args.out))
        elif args.command == "run":
            result = run(args.case, args.procs)
            print(result.model_dump_json(indent=2))
            return 0 if result.succeeded and result.converged else 1
        else:
            from daedalus import viz

            record = AdjointResult.model_validate_json(
                (args.case / "adjoint_result.json").read_text()
            )
            if not record.succeeded or not record.converged:
                raise ValueError("converged adjoint required for sensitivity export")
            print(viz.export(args.case))
    except (ValueError, FileNotFoundError, FileExistsError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0
