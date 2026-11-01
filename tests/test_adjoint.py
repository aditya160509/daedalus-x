"""Adjoint setup and diagnostic gates; no solver or fabricated physical map."""

import hashlib
import json
import os
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from foamlib import FoamFile

from daedalus.adjoint import (
    _adjoint_field,
    check_primal,
    commands,
    discover_field,
    optimisation_dict,
    prepare,
    residual_reduction,
)
from daedalus.cfd import CaseConfig, write_case
from daedalus.viz.sensitivity import normalise_outward


def manifest() -> dict[str, Any]:
    return {
        "car": {"groups": ["body", "wheels_front"]},
        "reference": {"U_m_s": 20.0, "Aref_half_m2": 0.001},
        "config": {"rho_kg_m3": 1.204},
    }


def test_optimisation_dict_parses_frozen_primal_two_map_types(tmp_path: Path) -> None:
    path = tmp_path / "optimisationDict"
    path.write_text(optimisation_dict(manifest()))
    data: Any = FoamFile(path).as_dict()
    assert data["optimisationManager"] == "singleRun"
    assert data["primalSolvers"]["primal"]["active"] is False
    adj = data["adjointManagers"]["dragManager"]["adjointSolvers"]["dragAdjoint"]
    assert adj["solutionControls"]["nIters"] == 1000
    force = adj["objectives"]["objectiveNames"]["drag"]
    assert force["type"] == "force" and force["Aref"] == 0.001
    assert np.array_equal(force["direction"], [1, 0, 0])
    assert (
        data["optimisation"]["designVariables"]["pointBased"]["sensitivityType"] == "surfacePoints"
    )
    assert data["optimisation"]["designVariables"]["faceBased"]["sensitivityType"] == "surface"
    for name in ("Ua", "pa"):
        field = tmp_path / name
        field.write_text(_adjoint_field(name, ["body", "wheels_front"]))
        assert FoamFile(field)["boundaryField", "symmetry", "type"] == "symmetryPlane"


def _field(path: Path, cls: str = "volScalarField") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"FoamFile {{ version 2.0; format ascii; class {cls}; object {path.name}; }}\n")


def test_field_discovery_uses_latest_scalar_and_rejects_ambiguity(tmp_path: Path) -> None:
    _field(tmp_path / "1500/faceSensFlowDrag")
    _field(tmp_path / "2500/faceSensNormaldragAdjointfaceBased")
    _field(tmp_path / "2500/faceSensNormalVecdragAdjoint", "volVectorField")
    _field(tmp_path / "2500/pointSensNormaldragAdjoint", "pointScalarField")
    assert discover_field(tmp_path).name == "faceSensNormaldragAdjointfaceBased"
    _field(tmp_path / "2500/sensSurfaceDrag")
    with pytest.raises(ValueError, match="ambiguous"):
        discover_field(tmp_path)


def test_no_field_is_not_a_zero_map(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError, match="no scalar face"):
        discover_field(tmp_path)


def test_outward_sign_p99_and_symmetric_clipping() -> None:
    raw = np.array([-100.0, -2.0, 0.0, 2.0, 100.0])
    values, scale = normalise_outward(raw)
    assert scale == pytest.approx(100.0)
    assert values[0] == 1.0 and values[-1] == -1.0
    assert normalise_outward(np.zeros(5))[1] == 0.0
    with pytest.raises(ValueError, match="finite"):
        normalise_outward(np.array([np.nan]))


def test_rank_cap_shell_quoting_and_residual_drop(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(os, "cpu_count", lambda: 10)
    plan = commands(tmp_path / "case with spaces", 64)
    assert len(plan) == 3 and "-np 8 " in plan[1][1]
    assert "'" in plan[1][1]
    log = "\n".join(
        f"Solving for {name}, Initial residual = {r}"
        for r in (1.0, 1e-4)
        for name in ("Uax", "Uay", "Uaz", "pa")
    )
    assert residual_reduction(log) == dict.fromkeys(("Uax", "Uay", "Uaz", "pa"), 1e-4)
    assert residual_reduction("no residuals") == {}
    assert residual_reduction(log + "\nSolving for pa, Initial residual = nan").get("pa") is None
    assert (
        residual_reduction(
            "Solving for pa, Initial residual = 0\nSolving for pa, Initial residual = 1e-4"
        )["pa"]
        > 1
    )

    assert len(commands(tmp_path, 1)) == 1


def test_prepare_preserves_source_and_refuses_rejected_primal(tmp_path: Path) -> None:
    design = tmp_path / "design"
    (design / "cfd").mkdir(parents=True)
    (design / "cfd/body.stl").write_text("solid body\nendsolid body\n")
    (design / "geometry.json").write_text(
        json.dumps({"length_m": 0.2, "width_m": 0.07, "height_m": 0.05, "frontal_area_m2": 0.002})
    )
    case = tmp_path / "primal"
    write_case(case, design, CaseConfig())
    (case / "100").mkdir()
    for name in ("U", "p"):
        (case / "100" / name).write_bytes((case / "0" / name).read_bytes())
    result = case / "daedalus_result.json"
    result.write_text(json.dumps({"succeeded": True, "mesh_ok": False, "acceptance": "rejected"}))
    with pytest.raises(ValueError, match="rejected"):
        check_primal(case)
    assert not (tmp_path / "primal_adjoint").exists()
    result.write_text(
        json.dumps({"succeeded": True, "mesh_ok": True, "acceptance": "pending_review"})
    )
    before = {
        p.relative_to(case): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in case.rglob("*")
        if p.is_file()
    }
    target = prepare(case)
    after = {
        p.relative_to(case): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in case.rglob("*")
        if p.is_file()
    }
    assert before == after
    functions = FoamFile(target / "system/controlDict")["functions"]
    assert isinstance(functions, FoamFile.SubDict) and functions.as_dict() == {}
    assert FoamFile(target / "system/controlDict")["startTime"] == 100
    assert FoamFile(target / "system/fvSolution")["solvers", "Ua", "solver"] == "smoothSolver"
    assert FoamFile(target / "system/fvSchemes")["divSchemes", "div(-phiMean,Ua)"] == (
        "bounded",
        "Gauss",
        "upwind",
    )
    assert FoamFile(target / "constant/adjointRASProperties")["adjointRASModel"] == "adjointLaminar"
    assert (target / "100/Ua").exists() and not (target / "0").exists()
    with pytest.raises(FileExistsError):
        prepare(case)


def test_unrun_or_unconverged_adjoint_never_exports_a_map(tmp_path: Path) -> None:
    from daedalus.contracts import AdjointResult
    from daedalus.viz.binary import _Buffer
    from daedalus.viz.sensitivity import add_sensitivity

    (tmp_path / "adjoint_manifest.json").write_text("{}")
    layers: dict[str, Any] = {}
    buf = _Buffer()
    status = add_sensitivity(tmp_path, ["body"], buf, layers)
    assert status is not None and status["status"] == "unavailable"
    result = AdjointResult(
        succeeded=True,
        converged=False,
        field=None,
        residual_ratios={},
        error=None,
        n_procs=1,
        assumptions=(),
    )
    (tmp_path / "adjoint_result.json").write_text(result.model_dump_json())
    status = add_sensitivity(tmp_path, ["body"], buf, layers)
    assert status is not None and status["status"] == "unavailable"
    assert "sensitivity" not in layers and buf.size == 0
