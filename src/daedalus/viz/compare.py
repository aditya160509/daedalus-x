"""Strict, same-mesh surface Cp comparison for two solved half-car cases."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

import numpy as np
import pyvista as pv

from . import CAR_GROUPS, _reader
from .vtkexport import _latest_time, _surface

FRAME_TEMPLATE = "daedalus-halfcar-v4"  # engineering frame in metres, symmetry y = 0


def _source(case: Path) -> dict[str, Any]:
    manifest = json.loads((case / "daedalus_manifest.json").read_text())
    if manifest.get("template") != FRAME_TEMPLATE:
        raise ValueError(f"{case.name}: unsupported or unknown coordinate frame template")
    groups = manifest.get("car", {}).get("groups", [])
    if not groups or len(set(groups)) != len(groups) or any(g not in CAR_GROUPS for g in groups):
        raise ValueError(f"{case.name}: missing or unsupported car patch names")
    speed = float(manifest.get("reference", {}).get("U_m_s", 0))
    if not np.isfinite(speed) or speed <= 0:
        raise ValueError(f"{case.name}: positive finite reference speed required")
    pressure = (case / "0/p").read_text()
    if not re.search(
        r"dimensions\s*\[\s*0\s+2\s+-2\s+0\s+0\s+0\s+0\s*\]", pressure
    ) or not re.search(r"outlet\s*\{\s*type\s+fixedValue\s*;\s*value\s+uniform\s+0\s*;", pressure):
        raise ValueError(f"{case.name}: unsupported pressure units or outlet reference")
    source = hashlib.sha256()
    for group in sorted(groups):
        source.update(group.encode() + b"\0")
        source.update(
            hashlib.sha256((case / "constant/triSurface" / f"{group}.stl").read_bytes()).digest()
        )
    time = _latest_time(case)
    if time is None:
        raise FileNotFoundError(f"{case.name}: no solved field time")
    field_path = time / "p"
    with field_path.open("rb") as field:
        header = field.read(8192).decode("utf-8", errors="replace")
        field.seek(0)
        tail = b""
        outlet = False
        while chunk := field.read(65536):
            text = (tail + chunk).decode("utf-8", errors="replace")
            if re.search(
                r"outlet\s*\{\s*type\s+fixedValue\s*;\s*value\s+uniform\s+0(?:\.0*)?\s*;", text
            ):
                outlet = True
                break
            tail = chunk[-1024:]
    if not re.search(r"dimensions\s*\[\s*0\s+2\s+-2\s+0\s+0\s+0\s+0\s*\]", header) or not outlet:
        raise ValueError(f"{case.name}: solved pressure units or outlet reference are unsupported")
    result_path = case / "daedalus_result.json"
    result = json.loads(result_path.read_text()) if result_path.is_file() else {}
    if result.get("succeeded") is not True:
        raise ValueError(f"{case.name}: comparison requires a completed solver run")
    return {
        "run_id": case.name,
        "template": manifest["template"],
        "groups": groups,
        "geometry_sha256": source.hexdigest(),
        "pressure_sha256": hashlib.sha256(pressure.encode()).hexdigest(),
        "speed_m_s": speed,
        "field_time": time.name,
        "acceptance": result.get("acceptance", "not evaluated"),
        "provenance": "simulated",
    }


def compare_sources(base: Path, other: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    a, b = _source(base), _source(other)
    if a["geometry_sha256"] != b["geometry_sha256"]:
        raise ValueError(
            "Source geometry hashes differ; comparison requires identical per-part STL files"
        )
    if a["pressure_sha256"] != b["pressure_sha256"]:
        raise ValueError(
            "Pressure boundary definitions differ; comparison requires the same reference"
        )
    return a, b


def delta_surface(a: pv.PolyData, b: pv.PolyData) -> tuple[pv.PolyData, float]:
    """Compute Cp(B)-Cp(A) only for identical indexed surfaces; never interpolate."""
    if (
        not a.n_points
        or a.n_points != b.n_points
        or not np.array_equal(a.points, b.points)
        or not np.array_equal(a.faces, b.faces)
    ):
        raise ValueError("Surface meshes are not identical; interpolation is not supported")
    if "Cp" not in a.point_data or "Cp" not in b.point_data:
        raise ValueError("Both surfaces must have point Cp arrays")
    ap, bp = np.asarray(a.point_data["Cp"], float), np.asarray(b.point_data["Cp"], float)
    if (
        ap.shape != (a.n_points,)
        or bp.shape != (b.n_points,)
        or not np.isfinite(ap).all()
        or not np.isfinite(bp).all()
    ):
        raise ValueError("Surface Cp values must be finite scalar arrays")
    delta = bp - ap
    out = a.copy(deep=True)
    out.clear_data()
    out.point_data["DeltaCp"] = delta.astype(np.float32)
    return out, float(np.max(np.abs(delta)))


def build_comparison(base: Path, other: Path) -> tuple[pv.PolyData, dict[str, Any]]:
    a, b = compare_sources(base, other)
    surfaces = []
    for case, source in ((base, a), (other, b)):
        mesh = _reader(case, source["groups"], time_value=float(source["field_time"]))
        boundary = mesh["boundary"]
        for group in source["groups"]:
            patch = boundary[group]
            if patch is None or "p" not in patch.point_data:
                raise ValueError(f"{case.name}: missing point pressure on {group}")
            pressure = np.asarray(patch.point_data["p"], float)
            if pressure.ndim != 1 or not np.isfinite(pressure).all():
                raise ValueError(f"{case.name}: invalid point pressure on {group}")
        surfaces.append(_surface(boundary, source["groups"], 0.5 * source["speed_m_s"] ** 2))
        del patch, boundary, mesh  # release this native field before reading the other source
    surface, maximum = delta_surface(*surfaces)
    return surface, {
        "base": a,
        "other": b,
        "field": "DeltaCp",
        "definition": "Cp(other) - Cp(base), Cp = p/(0.5 U_inf^2)",
        "max_abs_delta_cp": maximum,
        "coordinate_frame": "engineering metres, symmetry y=0",
        "method": "identical indexed surface; no interpolation",
    }
