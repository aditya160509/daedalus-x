"""Read bounded visual summaries of the wall and mesh fields written by OpenFOAM."""

from pathlib import Path

import numpy as np
import pyvista as pv

from . import _reader

SKEW_LIMIT = 4.0
NON_ORTHO_LIMIT_DEG = 65.0
MAX_MAP_POINTS = 3000


def _sample(indices: np.ndarray) -> np.ndarray:
    if indices.size <= MAX_MAP_POINTS:
        return indices
    return indices[np.linspace(0, indices.size - 1, MAX_MAP_POINTS, dtype=int)]


def _map_points(mesh: pv.DataSet, values: np.ndarray, indices: np.ndarray) -> list[list[float]]:
    indices = _sample(indices)
    if not indices.size:
        return []
    xyz = mesh.extract_cells(indices).cell_centers().points
    return [
        [float(x), float(y), float(z), float(value)]
        for (x, y, z), value in zip(xyz, values[indices], strict=True)
    ]


def mesh_summary(mesh: pv.MultiBlock) -> dict[str, object]:
    internal = mesh["internalMesh"]
    if not isinstance(internal, pv.DataSet):
        raise ValueError("No internal mesh in this run")
    patches = mesh.get("boundary")
    wall = []
    if isinstance(patches, pv.MultiBlock):
        for patch in patches:
            if isinstance(patch, pv.DataSet) and "yPlus" in patch.cell_data:
                yplus = np.asarray(patch.cell_data["yPlus"], dtype=float)
                wall.extend(
                    _map_points(patch, yplus, np.flatnonzero(np.isfinite(yplus) & (yplus >= 0)))
                )

    quality = None
    if "skewness" in internal.cell_data and "nonOrthoAngle" in internal.cell_data:
        skew = np.asarray(internal.cell_data["skewness"], dtype=float)
        angle = np.asarray(internal.cell_data["nonOrthoAngle"], dtype=float)
        finite = np.isfinite(skew) & (skew >= 0)
        counts, edges = np.histogram(skew[finite], bins=30)
        severity = np.maximum(
            np.where(finite, skew / SKEW_LIMIT, 0),
            np.where(np.isfinite(angle), angle / NON_ORTHO_LIMIT_DEG, 0),
        )
        flagged = np.flatnonzero(severity > 1)
        quality = {
            "counts": counts.tolist(),
            "edges": edges.tolist(),
            "flagged_count": int(flagged.size),
            "cell_count": internal.n_cells,
            "bad_cells": _map_points(internal, severity, flagged),
        }

    return {"wall_y_plus": wall, "quality": quality}


def read_mesh_summary(case: Path, groups: list[str]) -> dict[str, object]:
    return mesh_summary(_reader(case, groups, cell_fields=("yPlus", "skewness", "nonOrthoAngle")))
