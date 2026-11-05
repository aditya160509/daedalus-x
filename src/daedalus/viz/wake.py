"""Wake survey: momentum-deficit drag and total-pressure loss behind the car.

The far-field drag of a body equals the momentum and pressure it removes from the stream:
``D = rho * integral[(p_inf - p) + u (U_inf - u)] dA`` over a plane behind the car
(incompressible, steady, kinematic OpenFOAM ``p``).
Comparing it with the surface-force drag is an independent check of
the solution; the total-pressure loss map shows *where* in the wake the drag is lost.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pyvista as pv

from . import _reader

RHO = 1.204
STATIONS = (0.25, 0.5, 1.0)  # distance behind the car, in car lengths
NY, NZ = 48, 32
VERSION = 2


def _plane(car: dict[str, Any], x: float) -> tuple[np.ndarray, float, int, int]:
    w, h = car["width_m"], car["height_m"]
    ys = np.linspace(-(w / 2 + 0.04), w / 2 + 0.04, NY)
    zs = np.linspace(0.0005, h + 0.05, NZ)
    yy, zz = np.meshgrid(ys, zs)
    pts = np.column_stack([np.full(yy.size, x), np.abs(yy.ravel()), zz.ravel()])
    da = float((ys[1] - ys[0]) * (zs[1] - zs[0]))
    return pts, da, NY, NZ


def survey(internal: pv.DataSet, car: dict[str, Any], u_inf: float) -> dict[str, object]:
    """Momentum-deficit drag at each station and the total-pressure-loss map at the nearest."""
    length = car["length_m"]
    q = 0.5 * u_inf**2
    stations = []
    loss_map: list[list[float | None]] | None = None
    deficit_map: list[list[float | None]] | None = None
    for s in STATIONS:
        pts, da, ny, nz = _plane(car, length + s * length)
        sampled = pv.PolyData(pts).sample(internal)
        valid = np.asarray(sampled.point_data["vtkValidPointMask"], bool)
        u = np.asarray(sampled.point_data["U"], float)
        p = np.asarray(sampled.point_data["p"], float)
        ux = u[:, 0]
        integrand = np.where(valid, (0.0 - p) + ux * (u_inf - ux), 0.0)
        drag = RHO * float(np.sum(integrand)) * da
        cpt = np.where(valid, 1.0 - (p + 0.5 * np.sum(u**2, axis=1)) / q, np.nan)
        deficit = np.where(valid, 1.0 - ux / u_inf, np.nan)
        stations.append(
            {
                "x_over_L": s,
                "drag_n": drag,
                "max_velocity_deficit": float(np.max(deficit[valid])) if valid.any() else 0.0,
                "wake_area_cm2": float(np.sum(np.nan_to_num(cpt) > 0.05) * da * 1e4),
                "valid_fraction": float(valid.mean()),
            }
        )
        if loss_map is None:
            loss_map = [
                [round(float(v), 4) if np.isfinite(v) else None for v in row]
                for row in cpt.reshape(nz, ny)
            ]
            deficit_map = [
                [round(float(v), 4) if np.isfinite(v) else None for v in row]
                for row in deficit.reshape(nz, ny)
            ]
    w, h = car["width_m"], car["height_m"]
    return {
        "version": VERSION,
        "stations": stations,
        "loss_map": {
            "x_over_L": STATIONS[0],
            "y_mm": np.linspace(-(w / 2 + 0.04), w / 2 + 0.04, NY).__mul__(1e3).round(2).tolist(),
            "z_mm": np.linspace(0.0005, h + 0.05, NZ).__mul__(1e3).round(2).tolist(),
            "cpt_loss": loss_map,
            "velocity_deficit": deficit_map,
        },
        "provenance": "simulated",
    }


def export_wake(case: Path) -> Path:
    """Cached ``viz/wake.json`` for a solved run."""
    case = Path(case)
    out = case / "viz" / "wake.json"
    times = [d for d in case.iterdir() if d.is_dir() and d.name.replace(".", "").isdigit()]
    latest = max((d for d in times if float(d.name) > 0), key=lambda d: float(d.name), default=None)
    if latest is None:
        raise FileNotFoundError(f"{case} has no solved time directory")
    key = f"{VERSION}:{latest.name}:{latest.stat().st_mtime}"
    if out.exists() and json.loads(out.read_text()).get("key") == key:
        return out
    manifest = json.loads((case / "daedalus_manifest.json").read_text())
    internal = _reader(case, [])["internalMesh"]
    if not isinstance(internal, pv.DataSet):
        raise ValueError(f"{case}: unexpected OpenFOAM reader output for internalMesh")
    data = survey(internal, manifest["car"], float(manifest["reference"]["U_m_s"]))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({**data, "key": key}))
    return out
