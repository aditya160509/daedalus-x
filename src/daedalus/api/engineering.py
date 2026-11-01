"""Design and CFD-run read endpoints over the local data directory (spec §11.1)."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from daedalus.cfd import read_dat

router = APIRouter(prefix="/v1", tags=["engineering"])

_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,80}$")
MAX_HISTORY_POINTS = 600


def data_root() -> Path:
    default = Path(__file__).resolve().parents[3] / "data"
    return Path(os.environ.get("DAEDALUS_DATA", default))


def _safe_dir(kind: str, item_id: str) -> Path:
    if not _ID.match(item_id):
        raise HTTPException(400, f"invalid {kind} id")
    path = (data_root() / kind / item_id).resolve()
    if path.parent != (data_root() / kind).resolve() or not path.is_dir():
        raise HTTPException(404, f"{kind[:-1]} {item_id!r} not found")
    return path


class DesignSummary(BaseModel):
    design_id: str
    source_file: str
    source_sha256: str
    length_m: float
    width_m: float
    height_m: float
    frontal_area_m2: float
    groups: dict[str, list[str]]
    warnings: list[str]
    provenance: str = "estimated"  # reference geometry until canonical team CAD is imported


@router.get("/designs", response_model=list[DesignSummary])
def list_designs() -> list[DesignSummary]:
    root = data_root() / "designs"
    out: list[DesignSummary] = []
    for d in sorted(root.glob("*/geometry.json")) if root.exists() else []:
        g = json.loads(d.read_text())
        out.append(
            DesignSummary(
                design_id=d.parent.name,
                source_file=g["source_file"],
                source_sha256=g["source_sha256"],
                length_m=g["length_m"],
                width_m=g["width_m"],
                height_m=g["height_m"],
                frontal_area_m2=g["frontal_area_m2"],
                groups=g["groups"],
                warnings=g["warnings"],
            )
        )
    return out


@router.get("/designs/{design_id}/display.glb")
def design_glb(design_id: str) -> FileResponse:
    path = _safe_dir("designs", design_id) / "display.glb"
    if not path.exists():
        raise HTTPException(404, "display model not generated")
    return FileResponse(path, media_type="model/gltf-binary")


class Series(BaseModel):
    iteration: list[int]
    values: dict[str, list[float]]


class CfdRunDetail(BaseModel):
    run_id: str
    state: str  # running | succeeded | failed
    manifest: dict[str, Any]
    result: dict[str, Any] | None
    coefficients: Series | None
    residuals: Series | None
    provenance: str = "simulated"


def _downsample(n: int) -> np.ndarray:
    if n <= MAX_HISTORY_POINTS:
        return np.arange(n)
    return np.unique(np.linspace(0, n - 1, MAX_HISTORY_POINTS).round().astype(int))


def _series(path: Path | None, columns: list[str]) -> Series | None:
    if path is None or not path.exists():
        return None
    try:
        names, data = read_dat(path)
    except Exception:
        return None
    idx = _downsample(len(data))
    vals: dict[str, list[float]] = {}
    for c in columns:
        if c in names:
            vals[c] = [float(v) for v in data[idx, names.index(c)]]
    return Series(iteration=[int(v) for v in data[idx, 0]], values=vals)


def _run_state(run: Path) -> str:
    result = run / "daedalus_result.json"
    if result.exists():
        return "succeeded" if json.loads(result.read_text())["succeeded"] else "failed"
    return "running"


@router.get("/cfd/runs")
def list_runs() -> list[dict[str, Any]]:
    root = data_root() / "runs"
    out: list[dict[str, Any]] = []
    for m in sorted(root.glob("*/daedalus_manifest.json")) if root.exists() else []:
        run = m.parent
        res_path = run / "daedalus_result.json"
        res = json.loads(res_path.read_text()) if res_path.exists() else None
        out.append(
            {
                "run_id": run.name,
                "state": _run_state(run),
                "speed_m_s": json.loads(m.read_text())["config"]["speed_m_s"],
                "cd": res and res.get("cd"),
                "acceptance": res and res.get("acceptance"),
                "has_viz": (run / "viz/viz.json").exists(),
            }
        )
    return out


@router.get("/cfd/runs/{run_id}", response_model=CfdRunDetail)
def get_run(run_id: str) -> CfdRunDetail:
    run = _safe_dir("runs", run_id)
    manifest = json.loads((run / "daedalus_manifest.json").read_text())
    res_path = run / "daedalus_result.json"
    pp = run / "postProcessing"
    coeff = next(iter(sorted(pp.glob("forceCoeffs/*/coefficient.dat"))), None)
    resid = next(iter(sorted(pp.glob("residuals/*/solverInfo.dat"))), None)
    return CfdRunDetail(
        run_id=run_id,
        state=_run_state(run),
        manifest=manifest,
        result=json.loads(res_path.read_text()) if res_path.exists() else None,
        coefficients=_series(coeff, ["Cd", "Cl"]),
        residuals=_series(resid, ["Ux_initial", "p_initial", "k_initial", "omega_initial"]),
    )


@router.get("/cfd/runs/{run_id}/viz.json")
def run_viz_meta(run_id: str) -> FileResponse:
    path = _safe_dir("runs", run_id) / "viz/viz.json"
    if not path.exists():
        raise HTTPException(404, "no flow-field export for this run; run `daedalus cfd viz`")
    return FileResponse(path, media_type="application/json")


@router.get("/cfd/runs/{run_id}/viz.bin")
def run_viz_bin(run_id: str) -> FileResponse:
    path = _safe_dir("runs", run_id) / "viz/viz.bin"
    if not path.exists():
        raise HTTPException(404, "no flow-field export for this run; run `daedalus cfd viz`")
    return FileResponse(path, media_type="application/octet-stream")


@router.get("/studies")
def list_studies() -> list[dict[str, object]]:
    from daedalus.gridstudy import report

    root = data_root()
    studies = root / "studies"
    return [report(root, plan.parent.name) for plan in sorted(studies.glob("*/plan.json"))]


@router.get("/studies/{study_id}")
def get_study(study_id: str) -> dict[str, object]:
    from daedalus.gridstudy import report

    _safe_dir("studies", study_id)
    try:
        return report(data_root(), study_id)
    except FileNotFoundError as exc:
        raise HTTPException(404, "study plan not found") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("/cfd/runs/{run_id}/buildup.json")
def run_drag_buildup(run_id: str) -> FileResponse:
    path = _safe_dir("runs", run_id) / "viz/buildup.json"
    if not path.exists():
        raise HTTPException(404, "no drag build-up; export flow with wallShearStress first")
    return FileResponse(path, media_type="application/json")
