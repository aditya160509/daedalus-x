"""Per-run compute and wall-time summary, read from the OpenFOAM run logs (read-only)."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel

from daedalus.api.engineering import data_root

router = APIRouter(prefix="/v1", tags=["compute"])

_CELLS = re.compile(r"cells:\s+(\d+)")
_EXEC = re.compile(r"ExecutionTime = ([\d.eE+-]+) s\s+ClockTime = ([\d.eE+-]+) s")


class RunCompute(BaseModel):
    run_id: str
    status: Literal["succeeded", "failed", "running", "unknown"]
    acceptance: str | None
    cells: int | None
    iterations: int | None
    solver_cpu_s: float | None
    solver_wall_s: float | None
    source: str
    logs: list[str]


def _cells(run: Path) -> int | None:
    log = run / "log.checkMesh"
    if log.exists():
        found = _CELLS.findall(log.read_text(errors="replace"))
        if found:
            return int(found[-1])
    return None


def _solver_times(run: Path) -> tuple[float | None, float | None]:
    """Last ExecutionTime/ClockTime in the solver log: CPU and wall seconds of the whole solve."""
    log = run / "log.simpleFoam"
    if not log.exists():
        return None, None
    found = _EXEC.findall(log.read_text(errors="replace"))
    if not found:
        return None, None
    cpu, wall = found[-1]
    return float(cpu), float(wall)


def _iterations(run: Path) -> int | None:
    log = run / "log.simpleFoam"
    if not log.exists():
        return None
    times = re.findall(r"^Time = (\d+)", log.read_text(errors="replace"), re.MULTILINE)
    return int(times[-1]) if times else None


def summarise(run: Path) -> RunCompute:
    result_path = run / "daedalus_result.json"
    result: dict[str, Any] | None = (
        json.loads(result_path.read_text()) if result_path.exists() else None
    )
    if result is None:
        status: Literal["succeeded", "failed", "running", "unknown"] = (
            "running" if (run / "log.simpleFoam").exists() else "unknown"
        )
    else:
        status = "succeeded" if result.get("succeeded") else "failed"
    cpu, wall = _solver_times(run)
    cells = (result or {}).get("cells") or _cells(run)
    logs = sorted(p.name for p in run.glob("log.*"))
    return RunCompute(
        run_id=run.name,
        status=status,
        acceptance=(result or {}).get("acceptance"),
        cells=int(cells) if cells is not None else None,
        iterations=_iterations(run),
        solver_cpu_s=cpu,
        solver_wall_s=wall,
        source="log.simpleFoam, log.checkMesh (measured)",
        logs=logs,
    )


@router.get("/cfd/compute", response_model=list[RunCompute])
def cfd_compute() -> list[RunCompute]:
    """One row per CFD run: cells, solver wall time, iterations and status, from the run logs."""
    root = data_root() / "runs"
    if not root.exists():
        return []
    return [summarise(m.parent) for m in sorted(root.glob("*/daedalus_manifest.json"))]
