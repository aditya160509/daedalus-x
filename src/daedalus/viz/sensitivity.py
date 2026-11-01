"""Outward-normal drag sensitivity from a converged isolated adjoint run."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pyvista as pv
from numpy.typing import NDArray

from daedalus.adjoint import discover_field
from daedalus.contracts import AdjointResult

from .binary import _Buffer, _triangles, mirror_triangles


def normalise_outward(values: NDArray[np.float64]) -> tuple[NDArray[np.float64], float]:
    """OpenFOAM's normal points fluid-to-solid, opposite the car's outward direction."""
    if not values.size or not np.all(np.isfinite(values)):
        raise ValueError("finite nonempty scalar sensitivities required")
    scale = float(np.percentile(np.abs(values), 99))
    if scale == 0:
        return np.zeros_like(values), 0.0
    return np.clip(-values / scale, -1.0, 1.0), scale


def add_sensitivity(
    case: Path, groups: list[str], buf: _Buffer, layers: dict[str, Any]
) -> dict[str, Any] | None:
    manifest_path = case / "adjoint_manifest.json"
    if not manifest_path.exists():
        return None
    result_path = case / "adjoint_result.json"
    if not result_path.exists():
        return {"status": "unavailable", "reason": "Run the prepared adjoint first."}
    result = AdjointResult.model_validate_json(result_path.read_text())
    if not result.succeeded or not result.converged:
        return {
            "status": "unavailable",
            "reason": result.error or "Adjoint residuals did not drop three orders.",
        }
    field = discover_field(case)
    if str(field.relative_to(case)) != result.field:
        raise ValueError("discovered sensitivity no longer matches the recorded adjoint result")
    from . import _reader

    mesh = _reader(case, groups, float(field.parent.name))
    boundary = mesh["boundary"]
    if not isinstance(boundary, pv.MultiBlock):
        raise ValueError("missing adjoint boundary mesh")
    positions: list[NDArray[np.float64]] = []
    indices: list[NDArray[np.int64]] = []
    raw: list[NDArray[np.float64]] = []
    offset = 0
    for group in groups:
        patch = boundary[group]
        if not isinstance(patch, pv.PolyData):
            raise ValueError(f"missing adjoint patch {group}")
        pts, faces, tri = _triangles(patch)
        if field.name not in tri.point_data:
            raise ValueError(f"sensitivity {field.name} not readable on patch {group}")
        values = np.asarray(tri.point_data[field.name], float)
        if values.ndim != 1:
            raise ValueError("a scalar normal sensitivity is required")
        positions.append(pts)
        indices.append(faces + offset)
        raw.append(values)
        offset += len(pts)
    points, faces = mirror_triangles(np.vstack(positions), np.vstack(indices))
    scalar, scale = normalise_outward(np.concatenate(raw))
    assumptions = json.loads(manifest_path.read_text())["assumptions"]
    layers["sensitivity"] = {
        "positions": buf.add(points.astype(np.float32).ravel()),
        "indices": buf.add(faces.astype(np.uint32).ravel()),
        "scalar": buf.add(np.tile(scalar, 2).astype(np.float32)),
        "scalar_name": "normalised dCd/dn (outward)",
        "range": [-1.0, 1.0],
        "scale_p99": scale,
        "field": field.name,
        "provenance": "simulated",
        "assumptions": assumptions,
        "sign": "positive = pushing the surface outward increases drag",
    }
    return {"status": "available", "field": field.name, "assumptions": assumptions}
