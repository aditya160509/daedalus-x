"""Design and CFD-run read endpoints over the local data directory (spec §11.1)."""

from __future__ import annotations

import json
import os
import re
import tempfile
import threading
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from daedalus.cfd import CfdError, read_dat

router = APIRouter(prefix="/v1", tags=["engineering"])

_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,80}$")
MAX_HISTORY_POINTS = 600
_FIELD_EXPORT_LOCK = threading.Lock()  # native field reads are memory-heavy


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


class DesignPart(BaseModel):
    label: str
    group: str
    volume_m3: float
    bbox_min_m: list[float]
    bbox_max_m: list[float]


class DesignGeometry(BaseModel):
    design_id: str
    source_file: str
    source_sha256: str
    transform: dict[str, Any]
    length_m: float
    width_m: float
    height_m: float
    frontal_area_m2: float
    parts: list[DesignPart]
    groups: dict[str, list[str]]
    warnings: list[str]


@router.get("/designs/{design_id}/geometry.json", response_model=DesignGeometry)
def design_geometry(design_id: str) -> DesignGeometry:
    """Full import record, including per-part volume and watertight warnings."""
    path = _safe_dir("designs", design_id) / "geometry.json"
    if not path.exists():
        raise HTTPException(404, "geometry record not found")
    try:
        raw = json.loads(path.read_text())
        return DesignGeometry(design_id=design_id, **raw)
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(422, f"invalid geometry record: {exc}") from exc


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
    except (CfdError, OSError, ValueError, IndexError):  # a history file being written mid-read
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


@router.get("/cfd/runs/{run_id}/vtk/{filename}")
def run_vtk_layer(run_id: str, filename: str) -> FileResponse:
    """Decimated, zlib-compressed VTK XML layer for the 3D flow viewer (cached under viz/vtk)."""
    from daedalus.viz.vtkexport import LAYERS, export_layer

    layer, _, ext = filename.partition(".")
    if LAYERS.get(layer) != ext:
        raise HTTPException(404, f"unknown layer {filename!r}")
    run = _safe_dir("runs", run_id)
    try:
        with _FIELD_EXPORT_LOCK:
            path = export_layer(run, layer)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return FileResponse(
        path, media_type="text/xml", headers={"Cache-Control": "private, max-age=300"}
    )


@router.get("/cfd/compare/cp/metadata")
def compare_cp_metadata(base: str, other: str) -> dict[str, object]:
    from daedalus.viz.compare import compare_sources

    try:
        a, b = compare_sources(_safe_dir("runs", base), _safe_dir("runs", other))
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(422, str(exc)) from exc
    return {
        "base": a,
        "other": b,
        "coordinate_frame": "engineering metres, symmetry y=0",
        "definition": "Cp(other) - Cp(base), Cp = p/(0.5 U_inf^2)",
        "method": "identical indexed surface; no interpolation; mesh check on VTP request",
    }


@router.get("/cfd/compare/cp/surface.vtp")
def compare_cp_surface(base: str, other: str) -> Response:
    from daedalus.viz.compare import build_comparison
    from daedalus.viz.vtkexport import _write

    try:
        with _FIELD_EXPORT_LOCK:
            surface, meta = build_comparison(_safe_dir("runs", base), _safe_dir("runs", other))
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "delta.vtp"
                _write(surface, path)
                data = path.read_bytes()
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(422, str(exc)) from exc
    return Response(
        data,
        media_type="text/xml",
        headers={
            "Cache-Control": "no-store",
            "X-Delta-Cp-Max": str(meta["max_abs_delta_cp"]),
            "X-Base-Time": meta["base"]["field_time"],
            "X-Other-Time": meta["other"]["field_time"],
            "X-Geometry-Sha256": meta["base"]["geometry_sha256"],
        },
    )


_RENDER_LOCK = threading.Lock()  # one offscreen render at a time (memory-heavy)


@router.get("/cfd/runs/{run_id}/render")
async def run_render(
    run_id: str, view: str = Query("iso", pattern="^(iso|side|top|front)$")
) -> FileResponse:
    """Photo-style hero still (car Cp + streamtubes), cached under runs/<id>/render/."""
    run = _safe_dir("runs", run_id)
    out = run / "render" / f"{view}.png"
    if not out.exists():
        if not (run / "daedalus_result.json").exists():
            raise HTTPException(409, "run has not finished; no field to render")

        def _go() -> Path:
            from daedalus.viz.render import cached_render

            with _RENDER_LOCK:
                return cached_render(run, view)

        try:
            out = await run_in_threadpool(_go)
        except Exception as exc:  # surface renderer failure as 500 detail
            raise HTTPException(500, f"render failed: {exc}") from exc
    return FileResponse(out, media_type="image/png", headers={"Cache-Control": "max-age=3600"})
