"""Versioned mesh/speed study plans, queued execution and conditional GCI reports."""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import cast

import numpy as np

from daedalus.cfd import CarGeometry, CaseConfig, Domain
from daedalus.contracts import GridConvergence, JobState
from daedalus.jobs import Job, JobQueue, data_root

STUDY_ID = re.compile(r"^[a-z0-9_]{3,40}$")


def convergence(
    values: tuple[float, float, float], spacings: tuple[float, float, float]
) -> GridConvergence:
    """Fine, medium, coarse; unequal spacing ratios use the general Richardson equation."""
    from scipy.optimize import brentq

    if not all(math.isfinite(x) for x in (*values, *spacings)):
        raise ValueError("grid values and spacings must be finite")
    fine, medium, coarse = values
    h1, h2, h3 = spacings
    if not 0 < h1 < h2 < h3:
        raise ValueError("spacings must be positive and ordered fine < medium < coarse")
    e21, e32 = medium - fine, coarse - medium
    if abs(e32) < 1e-14 or abs(e21) < 1e-14 or abs(fine) < 1e-14:
        return GridConvergence(
            status="indeterminate", reason="differences or normalization unresolved"
        )
    ratio = e21 / e32
    if ratio <= 0:
        return GridConvergence(
            status="oscillatory", reason="successive differences change sign", ratio=ratio
        )
    if ratio >= 1:
        return GridConvergence(
            status="divergent", reason="differences do not decrease with refinement", ratio=ratio
        )
    r21, r32 = h2 / h1, h3 / h2
    if min(r21, r32) < 1.1:
        return GridConvergence(
            status="indeterminate", reason="refinement ratio below 1.1", ratio=ratio
        )

    def residual(p: float) -> float:
        return float(
            r21**p * math.expm1(p * math.log(r32)) / math.expm1(p * math.log(r21)) - e32 / e21
        )

    try:
        p = float(brentq(residual, 1e-5, 30))
    except ValueError:
        return GridConvergence(
            status="indeterminate", reason="no supported positive observed order", ratio=ratio
        )
    extrapolated = fine + (fine - medium) / (r21**p - 1)
    gci12 = 1.25 * abs((fine - medium) / fine) / (r21**p - 1) * 100
    gci23 = 1.25 * abs((medium - coarse) / medium) / (r32**p - 1) * 100 if medium else None
    return GridConvergence(
        status="monotonic",
        reason="conditional Richardson estimate; not physical validation",
        ratio=ratio,
        order=p,
        extrapolated_cd=extrapolated,
        gci_fine_pct=gci12,
        asymptotic_ratio=gci23 / (r21**p * gci12) if gci23 is not None else None,
    )


def speed_sensitivity(
    reynolds: list[float], cd: list[float], intervals: list[tuple[float, float]]
) -> dict[str, object]:
    """OLS in log(Re); interval uses the larger of residual and declared mean-CI uncertainty."""
    from scipy.stats import t

    if len(cd) < 3 or len(cd) != len(reynolds) or len(cd) != len(intervals):
        raise ValueError("speed fit needs at least three aligned observations and intervals")
    if any(not math.isfinite(v) or v <= 0 for v in reynolds):
        raise ValueError("Re must be finite and positive")
    x, y = np.log(np.asarray(reynolds, float)), np.asarray(cd, float)
    if not np.all(np.isfinite(x)) or not np.all(np.isfinite(y)) or np.ptp(x) <= 0:
        raise ValueError("Re and Cd must be finite with distinct positive Re")
    widths = np.array([(b - a) / 2 for a, b in intervals])
    if np.any(widths < 0) or not np.all(np.isfinite(widths)):
        raise ValueError("Cd confidence intervals must be finite and ordered")
    design = np.column_stack([np.ones(len(x)), x - x.mean()])
    beta = np.linalg.lstsq(design, y, rcond=None)[0]
    inv = np.linalg.inv(design.T @ design)
    residual_var = float(np.sum((y - design @ beta) ** 2) / (len(x) - 2))
    # Each CFD CI uses t(9); preserve that uncertainty floor even for an exact line fit.
    known = inv @ design.T @ np.diag((widths / t.ppf(0.975, 9)) ** 2) @ design @ inv
    se = math.sqrt(max(float(known[1, 1]), residual_var * float(inv[1, 1])))
    delta = float(t.ppf(0.975, len(x) - 2)) * se
    slope = float(beta[1])
    return {
        "slope": slope,
        "slope_ci95": [slope - delta, slope + delta],
        "re_insensitive_within_ci": slope - delta <= 0 <= slope + delta,
        "interpretation": (
            "zero-compatible slope means no resolved speed effect; not proof of invariance"
        ),
    }


def submit(
    queue: JobQueue, design: str, prefix: str, *, fidelity: str = "final", procs: int = 8
) -> dict[str, object]:
    if not STUDY_ID.fullmatch(prefix):
        raise ValueError("study prefix must match ^[a-z0-9_]{3,40}$")
    car = CarGeometry.from_design_dir(queue.item_path("designs", design))
    cfg = CaseConfig.preset(fidelity, acceptance_mode="averaged")
    target = queue.path_under_root(f"studies/{prefix}")
    if target.exists():
        raise FileExistsError("study already exists; choose a new prefix")
    specs = [
        ("grid_fine", cfg.base_cell_m, 20.0),
        ("grid_medium", cfg.base_cell_m * 1.5, 20.0),
        ("grid_coarse", cfg.base_cell_m * 1.5**2, 20.0),
        ("speed_15", cfg.base_cell_m * 1.5, 15.0),
        ("speed_25", cfg.base_cell_m * 1.5, 25.0),
    ]
    target.mkdir(parents=True)
    plan: dict[str, object] = {
        "study_id": prefix,
        "design": design,
        "fidelity": fidelity,
        "reference_domain": vars(Domain.around(car, cfg)),
        "length_m": car.length_m,
        "nu_m2_s": cfg.nu_m2_s,
        "runs": [],
        "state": "queued",
        "provenance": "simulated",
    }
    jobs: list[Job] = []
    cases: list[dict[str, object]] = []
    try:
        for label, cell, speed in specs:
            job = queue.submit(
                "cfd_run",
                {
                    "design": design,
                    "run": f"{prefix}_{label}",
                    "speed": speed,
                    "fidelity": fidelity,
                    "procs": procs,
                    "base_cell_m": cell,
                    "domain_cell_m": cfg.base_cell_m,
                    "acceptance_mode": "averaged",
                },
            )
            jobs.append(job)
            cases.append(
                {
                    "label": label,
                    "run_id": f"{prefix}_{label}",
                    "job_id": job.id,
                    "base_cell_m": cell,
                    "speed_m_s": speed,
                }
            )
    except (ValueError, FileExistsError):
        for job in jobs:
            if queue.get(job.id).state == JobState.QUEUED:
                queue.cancel(job.id)
        plan["state"] = "submission_failed"
        raise
    finally:
        plan["runs"] = cases
        (target / "plan.json").write_text(json.dumps(plan, indent=2))
    return plan


def report(root: Path, prefix: str) -> dict[str, object]:
    if not STUDY_ID.fullmatch(prefix):
        raise ValueError("invalid study prefix")
    target = (root / "studies" / prefix).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError("study escapes workspace")
    plan = json.loads((target / "plan.json").read_text())
    cases: list[dict[str, object]] = []
    for case in plan["runs"]:
        result_path = root / "runs" / case["run_id"] / "daedalus_result.json"
        row = dict(case)
        row.update(
            {
                "cells": None,
                "cd": None,
                "ci95": None,
                "quality_eligible": False,
                "acceptance": "not_run",
            }
        )
        if result_path.exists():
            result = json.loads(result_path.read_text())
            row.update(
                {
                    "cells": result.get("cells"),
                    "cd": result.get("cd_mean"),
                    "ci95": result.get("cd_ci95"),
                    "acceptance": result.get("acceptance"),
                    "quality_eligible": result.get("succeeded", False)
                    and result.get("mesh_ok", False)
                    and result.get("acceptance") in ("accepted", "pending_review")
                    and result.get("cd_mean") is not None
                    and result.get("cd_ci95") is not None
                    and isinstance(result.get("cells"), int)
                    and result["cells"] > 0,
                }
            )
        cases.append(row)
    lookup = {str(row["label"]): row for row in cases}
    grid = [
        lookup[label] for label in ("grid_fine", "grid_medium", "grid_coarse") if label in lookup
    ]
    speeds = [lookup[label] for label in ("speed_15", "grid_medium", "speed_25") if label in lookup]
    gci = None
    speed = None
    if len(grid) == 3 and all(row["quality_eligible"] for row in grid):
        values = tuple(float(cast(float, row["cd"])) for row in grid)
        h = tuple(float(cast(int, row["cells"])) ** (-1 / 3) for row in grid)
        if h[0] < h[1] < h[2]:
            gci = convergence(
                cast(tuple[float, float, float], values), cast(tuple[float, float, float], h)
            ).model_dump()
        else:
            gci = GridConvergence(
                status="indeterminate", reason="cell counts do not refine monotonically"
            ).model_dump()
    if len(speeds) == 3 and all(row["quality_eligible"] for row in speeds):
        speed = speed_sensitivity(
            [
                float(cast(float, row["speed_m_s"])) * plan["length_m"] / plan["nu_m2_s"]
                for row in speeds
            ],
            [float(cast(float, row["cd"])) for row in speeds],
            [
                (cast(list[float], row["ci95"])[0], cast(list[float], row["ci95"])[1])
                for row in speeds
            ],
        )
    result: dict[str, object] = {
        "study_id": prefix,
        "provenance": "simulated",
        "cases": cases,
        "gci": gci,
        "speed_check": speed,
        "state": "evaluated" if gci and speed else "incomplete",
        "note": (
            "Fixed domain; GCI uses effective 3D cell-count spacing. Local wall-treatment "
            "assumptions require review. Pending review is not physical validation."
        ),
    }
    (target / "grid.json").write_text(json.dumps(result, indent=2, allow_nan=False))
    return result


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="daedalus grid")
    sub = p.add_subparsers(dest="action", required=True)
    submit_parser = sub.add_parser("submit")
    submit_parser.add_argument("--design", required=True)
    submit_parser.add_argument("--prefix", required=True)
    submit_parser.add_argument("--fidelity", choices=("quick", "final"), default="final")
    submit_parser.add_argument("--procs", type=int, default=8)
    report_parser = sub.add_parser("report")
    report_parser.add_argument("--prefix", required=True)
    args = p.parse_args(argv)
    root = data_root()
    result = (
        submit(JobQueue(root), args.design, args.prefix, fidelity=args.fidelity, procs=args.procs)
        if args.action == "submit"
        else report(root, args.prefix)
    )
    print(json.dumps(result, indent=2))
    return 0
