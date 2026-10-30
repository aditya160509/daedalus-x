"""Command line: `daedalus geometry import ...`, `daedalus cfd run ...`."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from daedalus import cfd, geometry


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="daedalus")
    sub = p.add_subparsers(dest="area", required=True)

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
    cr.add_argument("--no-early-stop", action="store_true", help="always run to max-iter")
    cr.add_argument("--resume-from", help="re-run an existing case from this step")

    cv = c.add_parser("viz", help="export pressure, streamlines and slices for the cockpit")
    cv.add_argument("case", type=Path, help="finished, reconstructed case directory")

    a = p.parse_args(argv)
    if a.area == "cfd" and a.cmd == "viz":
        from daedalus import viz  # heavy (VTK); only loaded when needed

        print(viz.export(a.case))
        return 0
    if a.area == "geometry":
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
    if a.no_early_stop:
        overrides["early_stop_tolerance"] = None
    cfg = cfd.CaseConfig.preset(a.fidelity, **overrides)
    if a.resume_from is None:
        cfd.write_case(a.case, a.design, cfg)
    res = cfd.run_case(a.case, cfg.n_procs, resume_from=a.resume_from)
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
