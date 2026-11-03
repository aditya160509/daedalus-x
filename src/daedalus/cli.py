"""Command line: `daedalus geometry import ...`, `daedalus cfd run ...`."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if args and args[0] == "adjoint":
        from daedalus.adjoint import main as adjoint_main

        return adjoint_main(args[1:])
    if args and args[0] == "grid":
        from daedalus.gridstudy import main as grid_main

        return grid_main(args[1:])
    if args and args[0] == "jobs":
        from daedalus.jobs import main as jobs_main

        return jobs_main(args[1:])
    from daedalus import cfd

    p = argparse.ArgumentParser(prog="daedalus")
    sub = p.add_subparsers(dest="area", required=True)
    sub.add_parser("adjoint", help="prepare, solve or export a frozen-turbulence drag adjoint")
    sub.add_parser("grid", help="queue a mesh/speed study or report its results")
    sub.add_parser("jobs", help="durable job submission, worker and listing")

    g = sub.add_parser("geometry").add_subparsers(dest="cmd", required=True)
    gi = g.add_parser("import", help="STEP assembly -> engineering frame, CFD STLs, GLB")
    gi.add_argument("step", type=Path)
    gi.add_argument("out", type=Path)
    gi.add_argument("--forward", required=True, help="source axis pointing to the nose, e.g. -Y")
    gi.add_argument("--up", required=True, help="source axis pointing up, e.g. +Z")

    c = sub.add_parser("cfd").add_subparsers(dest="cmd", required=True)
    cr = c.add_parser("run", help="generate, mesh, solve and evaluate one case")
    cr.add_argument("design", type=Path, help="design directory from `geometry import`")
    cr.add_argument("case", type=Path, help="new case directory (must not exist)")
    cr.add_argument("--speed", type=float, default=20.0, help="freestream speed, m/s")
    cr.add_argument("--procs", type=int, default=6)
    cr.add_argument(
        "--fidelity",
        choices=sorted(cfd.FIDELITY),
        default="final",
        help="quick: coarse mesh for design screening; final: reported numbers",
    )
    cr.add_argument("--max-iter", type=int, help="override the fidelity's iteration cap")
    cr.add_argument("--base-cell", type=float, help="override background cell size, m")
    cr.add_argument(
        "--domain-cell", type=float, help="fixed domain rounding cell size for grid studies"
    )
    stopping = cr.add_mutually_exclusive_group()
    stopping.add_argument("--no-early-stop", action="store_true", help="always run to max-iter")
    stopping.add_argument(
        "--early-stop-tolerance", type=float, help="Cd stopping tolerance in (0, 0.1)"
    )
    cr.add_argument("--early-stop-window", type=int, help="Cd averaging window, >=20 iterations")
    cr.add_argument(
        "--acceptance-mode",
        choices=("steady", "averaged"),
        help="default: averaged for wheel geometry, steady otherwise",
    )
    cr.add_argument("--resume-from", help="re-run an existing case from this step")
    cr.add_argument("--ground-offset", type=float, help="ground plane rise into the wheels, m")
    cr.add_argument(
        "--mesh-only", action="store_true", help="stop after checkMesh (mesh-quality iteration)"
    )

    cv = c.add_parser("viz", help="export pressure, streamlines and slices for the cockpit")
    cv.add_argument("case", type=Path, help="finished, reconstructed case directory")

    a = p.parse_args(argv)
    if a.area == "cfd" and a.cmd == "viz":
        from daedalus import viz  # heavy (VTK); only loaded when needed

        print(viz.export(a.case))
        return 0
    if a.area == "geometry":
        from daedalus import geometry

        r = geometry.import_car(a.step, a.out, forward_axis=a.forward, up_axis=a.up)
        print(
            json.dumps(
                {
                    "size_m": [r.length_m, r.width_m, r.height_m],
                    "frontal_area_m2": r.frontal_area_m2,
                    "groups": r.groups,
                    "warnings": r.warnings,
                },
                indent=2,
            )
        )
        return 0
    overrides: dict[str, object] = {"speed_m_s": a.speed, "n_procs": a.procs}
    if a.max_iter is not None:
        overrides["max_iterations"] = a.max_iter
    if a.base_cell is not None:
        overrides["base_cell_m"] = a.base_cell
    if a.domain_cell is not None:
        overrides["domain_cell_m"] = a.domain_cell
    if a.acceptance_mode is not None:
        overrides["acceptance_mode"] = a.acceptance_mode
    if a.ground_offset is not None:
        overrides["ground_offset_m"] = a.ground_offset
    if a.early_stop_tolerance is not None:
        overrides["early_stop_tolerance"] = a.early_stop_tolerance
    if a.early_stop_window is not None:
        overrides["early_stop_window"] = a.early_stop_window
    if a.no_early_stop:
        overrides["early_stop_tolerance"] = None
    cfg = cfd.CaseConfig.preset(a.fidelity, **overrides)
    if a.resume_from is None:
        cfd.write_case(a.case, a.design, cfg)
    res = cfd.run_case(
        a.case,
        cfg.n_procs,
        resume_from=a.resume_from,
        stop_after="checkMesh" if a.mesh_only else None,
    )
    if a.mesh_only:
        print(json.dumps({"mesh_ok": res.mesh_ok, "failures": res.mesh_failures}, indent=2))
        return 0 if res.mesh_ok else 1
    if res.succeeded:
        from daedalus import viz

        try:
            viz.export(a.case)
        except Exception as e:  # visual export must never mask a solver result
            print(f"warning: flow-field export failed: {e}", file=sys.stderr)
    print(json.dumps(asdict(res), indent=2))
    return 0 if res.succeeded else 1


if __name__ == "__main__":
    sys.exit(main())
