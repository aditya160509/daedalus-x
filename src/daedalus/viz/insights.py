"""Bounded vortex, wake, wall-shear and drag exports from existing solved fields."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pyvista as pv
from numpy.typing import NDArray

from .binary import _Buffer, _polylines, _robust_range, _triangles, mirror_triangles
from .surface import drag_bins, oil_streaks, patch_drag, separation_flags


def _bounded(mesh: pv.PolyData, max_triangles: int) -> pv.PolyData:
    tri = mesh.triangulate().clean()
    tri.verts = np.zeros(0, np.int64)
    tri.lines = np.zeros(0, np.int64)
    if tri.n_cells > max_triangles:
        tri = tri.decimate_pro(1 - max_triangles / tri.n_cells)
    if tri.n_cells > max_triangles:
        raise ValueError("decimation could not meet the triangle budget")
    if not isinstance(tri, pv.PolyData):
        raise TypeError("expected triangulated PolyData")
    return tri


def _mesh_layer(
    mesh: pv.PolyData, buf: _Buffer, scalar: str, limit: int, other_scalar: str | None = None
) -> dict[str, Any]:
    tri = _bounded(mesh, limit // 2)
    pts, faces, tri = _triangles(tri)
    positions, indices = mirror_triangles(pts, faces)
    values = np.asarray(tri.point_data[scalar], float) if tri.n_points else np.zeros(0)
    layer = {
        "positions": buf.add(positions.astype(np.float32).ravel()),
        "indices": buf.add(indices.astype(np.uint32).ravel()),
        "scalar": buf.add(np.tile(values, 2).astype(np.float32)),
        "scalar_name": scalar,
        "range": _robust_range(values),
    }
    if other_scalar is not None:
        other = np.asarray(tri.point_data[other_scalar], float) if tri.n_points else np.zeros(0)
        layer["scalars"] = {
            scalar: layer["scalar"],
            other_scalar: buf.add(np.tile(other, 2).astype(np.float32)),
        }
    return layer


def add_insights(
    internal: pv.UnstructuredGrid,
    boundary: pv.MultiBlock,
    manifest: dict[str, Any],
    result: dict[str, Any],
    buf: _Buffer,
    layers: dict[str, Any],
    out: Path,
) -> dict[str, Any]:
    speed = float(manifest["reference"]["U_m_s"])
    length = float(manifest["car"]["length_m"])
    width = float(manifest["car"]["width_m"])
    height = float(manifest["car"]["height_m"])
    q = 0.5 * speed**2
    velocity = np.asarray(internal.point_data["U"], float)
    internal.point_data["speed_ratio"] = np.linalg.norm(velocity, axis=1) / speed
    internal.point_data["ux_ratio"] = velocity[:, 0] / speed
    internal.point_data["Cp0"] = (
        np.asarray(internal.point_data["p"], float) + 0.5 * np.sum(velocity**2, axis=1)
    ) / q
    derived = internal.compute_derivative(scalars="U", gradient=False, qcriterion=True)
    derived.point_data["Q_level"] = (
        np.asarray(derived.point_data["qcriterion"], float) / (speed / length) ** 2
    )
    vortex = derived.contour(
        [50 * (speed / length) ** 2, 200 * (speed / length) ** 2], scalars="qcriterion"
    )
    layers["vortices"] = _mesh_layer(vortex, buf, "speed_ratio", 150_000, "Q_level")
    layers["vortices"]["levels"] = [50, 200]
    layers["vortices"]["level_definition"] = "Q / (U∞/L)²"
    shell = internal.contour([0.5], scalars="ux_ratio")
    layers["wake_shell"] = _mesh_layer(shell, buf, "Cp0", 150_000)
    layers["wake_shell"]["definition"] = "Ux/U∞ = 0.5 velocity-deficit isosurface"

    # Global indices plus per-plane index offsets allow one geometry to be scrubbed without copies.
    xs = np.linspace(-0.02, length + 0.25, 24)
    positions: list[NDArray[np.float64]] = []
    indices: list[NDArray[np.int64]] = []
    scalars: list[NDArray[np.float64]] = []
    pressure: list[NDArray[np.float64]] = []
    vectors: list[NDArray[np.float64]] = []
    offsets = [0]
    vertex_offset = 0
    for x in xs:
        plane = (
            internal.slice(normal="x", origin=(x, 0, 0))
            .clip_box((x - 0.001, x + 0.001, 0, width / 2 + 0.03, 0, height + 0.03), invert=False)
            .extract_surface(algorithm="dataset_surface")
        )
        tri = _bounded(plane, 4000)
        pts, faces, tri = _triangles(tri)
        pts, faces = mirror_triangles(pts, faces)
        positions.append(pts)
        indices.append(faces + vertex_offset)
        scalars.append(np.tile(np.asarray(tri.point_data["ux_ratio"], float), 2))
        pressure.append(np.tile(np.asarray(tri.point_data["Cp0"], float), 2))
        velocity = np.asarray(tri.point_data["U"], float)
        vectors.append(np.vstack([velocity, velocity * np.array([1.0, -1.0, 1.0])]))
        vertex_offset += len(pts)
        offsets.append(offsets[-1] + faces.size)
    ux = np.concatenate(scalars).astype(np.float32)
    cp0 = np.concatenate(pressure).astype(np.float32)
    layers["xslices"] = {
        "positions": buf.add(np.vstack(positions).astype(np.float32).ravel()),
        "indices": buf.add(np.vstack(indices).astype(np.uint32).ravel()),
        "offsets": buf.add(np.asarray(offsets, np.uint32)),
        "vectors": buf.add(np.vstack(vectors).astype(np.float32).ravel()),
        "x_m": xs.tolist(),
        "scalar": buf.add(ux),
        "scalars": {"Ux/U∞": buf.add(ux), "Cp0": buf.add(cp0)},
        "scalar_name": "Ux/U∞",
        "range": [-0.2, 1.2],
        "ranges": {"Ux/U∞": [-0.2, 1.2], "Cp0": _robust_range(cp0.astype(np.float64))},
    }
    return _walls(boundary, manifest, result, buf, layers, out)


def _walls(
    boundary: pv.MultiBlock,
    manifest: dict[str, Any],
    result: dict[str, Any],
    buf: _Buffer,
    layers: dict[str, Any],
    out: Path,
) -> dict[str, Any]:
    groups = layers["surface"]["groups"]
    missing = [g for g in groups if "wallShearStress" not in boundary[g].point_data]
    if missing:
        status = {
            "wall_shear": "unavailable",
            "missing_patches": missing,
            "instruction": "simpleFoam -postProcess -func wallShearStress -latestTime",
        }
        (out / "buildup.json").write_text(json.dumps(status, indent=1))
        return status
    meshes = [_triangles(boundary[g])[2] for g in groups]
    # Keep separate points at component boundaries so streaks cannot bridge disconnected surfaces.
    surface = pv.merge(meshes, merge_points=False)
    if not isinstance(surface, pv.PolyData):
        surface = surface.extract_surface(algorithm="dataset_surface")
    traction = -np.asarray(surface.point_data["wallShearStress"], float)
    flags = separation_flags(surface, traction)
    rho = float(manifest["config"]["rho_kg_m3"])
    shear = np.linalg.norm(traction, axis=1) * rho
    layers["surface"]["scalars"] = {
        "Cp": layers["surface"]["scalar"],
        "|τw| (Pa)": buf.add(np.tile(shear, 2).astype(np.float32)),
    }
    layers["surface"]["ranges"] = {
        "Cp": layers["surface"]["range"],
        "|τw| (Pa)": _robust_range(shear),
    }
    layers["surface"]["separation"] = buf.add(np.tile(flags, 2))
    # Export the vector too; mirror the lateral component of wall traction.
    mirrored = traction * np.array([1.0, -1.0, 1.0])
    layers["surface"]["wall_traction"] = buf.add(
        np.vstack([traction, mirrored]).astype(np.float32).ravel()
    )
    marked = np.asarray(surface.points, float)[flags.astype(bool)]
    marked = np.vstack([marked, marked * np.array([1.0, -1.0, 1.0])])
    layers["separation"] = {
        "positions": buf.add(marked.astype(np.float32).ravel()),
        "scalar": buf.add(np.ones(len(marked), np.float32)),
        "scalar_name": "low-shear sign crossing",
        "range": [0.0, 1.0],
        "definition": "Heuristic; does not distinguish separation from reattachment",
    }
    streaks = oil_streaks(surface)
    if streaks.n_points:
        streaks.point_data["U"] = np.asarray(streaks.point_data["traction"], float) * rho
    pts, offsets, magnitude = _polylines(streaks, 1.0)
    pts = np.vstack([pts, pts * np.array([1.0, -1.0, 1.0])])
    offsets = np.concatenate([offsets, offsets[1:] + offsets[-1]])
    layers["oilflow"] = {
        "positions": buf.add(pts.astype(np.float32).ravel()),
        "offsets": buf.add(offsets.astype(np.uint32)),
        "scalar": buf.add(np.tile(magnitude, 2).astype(np.float32)),
        "scalar_name": "|τw| (Pa)",
        "range": _robust_range(magnitude),
        "seed_count_full": 3000,
        "max_steps": 300,
        "integrator": "surface-constrained RK2",
    }
    q_area = (
        0.5
        * float(manifest["reference"]["U_m_s"]) ** 2
        * float(manifest["reference"]["Aref_half_m2"])
    )
    face_data = {g: patch_drag(boundary[g], q_area) for g in groups}
    lo = min(float(x.min()) for x, _ in face_data.values())
    hi = max(float(x.max()) for x, _ in face_data.values())
    edges = np.linspace(lo, hi, 101)
    curves = {g: drag_bins(x, force, edges).tolist() for g, (x, force) in face_data.items()}
    total = float(sum(c[-1] for c in curves.values()))
    cd = result.get("cd")
    error = abs(total - cd) / abs(cd) if cd is not None and abs(cd) > 1e-12 else None
    buildup = {
        "wall_shear": "available",
        "x_m": edges[1:].tolist(),
        "groups": curves,
        "total_cd": total,
        "reference_cd": cd,
        "relative_error": error,
        "within_2_percent": error <= 0.02 if error is not None else None,
        "provenance": "simulated",
        "acceptance": result.get("acceptance", "pending"),
        "method": "Original FV faces: p Sf_x - wallShearStress_x area; half-area reference",
    }
    (out / "buildup.json").write_text(json.dumps(buildup, indent=1, allow_nan=False))
    return {
        "wall_shear": "available",
        "drag_check": buildup["within_2_percent"],
        "drag_relative_error": error,
    }
