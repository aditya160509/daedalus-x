"""Wall-shear diagnostics; OpenFOAM shear is kinematic and points opposite fluid traction."""

from __future__ import annotations

import numpy as np
import pyvista as pv
from numpy.typing import NDArray


def separation_flags(mesh: pv.PolyData, traction: NDArray[np.float64]) -> NDArray[np.uint8]:
    """Low-shear vertices next to streamwise sign changes, a separation/attachment heuristic."""
    faces = np.asarray(mesh.faces).reshape(-1, 4)[:, 1:]
    edges = np.vstack([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    tx = traction[:, 0]
    crossing = (tx[edges[:, 0]] * tx[edges[:, 1]] <= 0) & (tx[edges[:, 0]] != tx[edges[:, 1]])
    candidates = np.zeros(mesh.n_points, dtype=bool)
    cross_edges = edges[crossing]
    # When a sampled endpoint is exactly zero, flag it rather than both its neighbours.
    has_zero = np.any(tx[cross_edges] == 0, axis=1)
    candidates[cross_edges[~has_zero].ravel()] = True
    zero_edges = cross_edges[has_zero]
    candidates[zero_edges[tx[zero_edges] == 0]] = True
    magnitude = np.linalg.norm(traction, axis=1)
    cutoff = float(np.percentile(magnitude, 10)) if magnitude.size else 0.0
    return (candidates & (magnitude <= cutoff)).astype(np.uint8)


def oil_streaks(mesh: pv.PolyData, seed_count: int = 1500) -> pv.PolyData:
    """Area-weighted seeds and VTK's surface-constrained RK2 integrator (triangle crossings)."""
    if seed_count < 1 or not mesh.n_cells:
        return pv.PolyData()
    normals_mesh = mesh.compute_normals(
        point_normals=True,
        cell_normals=False,
        consistent_normals=False,
        auto_orient_normals=False,
        split_vertices=False,
    )
    normals = np.asarray(normals_mesh.point_data["Normals"], float)
    traction = -np.asarray(normals_mesh.point_data["wallShearStress"], float)
    tangent = traction - np.sum(traction * normals, axis=1)[:, None] * normals
    normals_mesh.point_data["traction"] = tangent
    faces = np.asarray(normals_mesh.faces).reshape(-1, 4)[:, 1:]
    points = np.asarray(normals_mesh.points, float)
    a, b, c = (points[faces[:, i]] for i in range(3))
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
    if not np.sum(area) > 0:
        return pv.PolyData()
    rng = np.random.default_rng(42)
    ids = rng.choice(len(area), seed_count, p=area / np.sum(area))
    uv = rng.random((seed_count, 2))
    uv[uv.sum(axis=1) > 1] = 1 - uv[uv.sum(axis=1) > 1]
    seeds = a[ids] + uv[:, :1] * (b[ids] - a[ids]) + uv[:, 1:] * (c[ids] - a[ids])
    lines = normals_mesh.streamlines_from_source(
        pv.PolyData(seeds),
        vectors="traction",
        integrator_type=2,
        surface_streamlines=True,
        integration_direction="forward",
        max_steps=300,
        initial_step_length=0.5,
        step_unit="cl",
        compute_vorticity=False,
        max_length=float(normals_mesh.length),
    )

    if not isinstance(lines, pv.PolyData):
        raise TypeError("expected PolyData surface streaks")
    return lines


def drag_bins(
    x: NDArray[np.float64], cd: NDArray[np.float64], edges: NDArray[np.float64]
) -> NDArray[np.float64]:
    """Face-centre bins conserve total force, including faces exactly at the tail."""
    if x.shape != cd.shape or not np.all(np.isfinite(cd)) or not np.all(np.isfinite(x)):
        raise ValueError("finite aligned face forces and positions required")
    if len(edges) < 2 or not np.all(np.diff(edges) > 0):
        raise ValueError("strictly increasing bin edges required")
    if x.size and (x.min() < edges[0] or x.max() > edges[-1]):
        raise ValueError("face centres outside bin extent")
    return np.cumsum(np.histogram(x, bins=edges, weights=cd)[0])


def patch_drag(mesh: pv.PolyData, q_area: float) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """Pressure + viscous Cd using the original finite-volume boundary face orientation."""
    if q_area <= 0:
        raise ValueError("positive kinematic dynamic-pressure times half-area required")
    face = mesh.compute_normals(
        cell_normals=True, point_normals=False, consistent_normals=False, auto_orient_normals=False
    ).compute_cell_sizes()
    area = np.asarray(face.cell_data["Area"], float)
    normals = np.asarray(face.cell_data["Normals"], float)
    pressure = np.asarray(face.cell_data["p"], float)
    shear = np.asarray(face.cell_data["wallShearStress"], float)
    cd = area * (pressure * normals[:, 0] - shear[:, 0]) / q_area
    return np.asarray(face.cell_centers().points, float)[:, 0], cd
