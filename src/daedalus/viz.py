"""Flow-field export for the Virtual Wind Tunnel (spec §4.4, P3-04).

Reads a finished half-model OpenFOAM case and writes three visual layers, mirrored about the
symmetry plane so the viewer shows the full car:

- ``surface``: car surface with pressure coefficient Cp = p / (0.5 U^2) per vertex
  (simpleFoam pressure is kinematic and the outlet reference is p = 0);
- ``streamlines``: integrated from a rake upstream of the nose, coloured by |U| / U_inf;
- ``wake`` and ``centreline``: planar slices coloured by Ux / U_inf.

Output is ``viz/viz.json`` (layout and metadata) plus ``viz/viz.bin`` (one little-endian
buffer of typed arrays) so the browser maps arrays without parsing numbers.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import numpy as np
import pyvista as pv
from numpy.typing import NDArray

VIZ_VERSION = 1
CAR_GROUPS = ("body", "front_wing", "rear_wing", "wheels", "cartridge", "internal")


@dataclass
class _Buffer:
    """Accumulates typed arrays into one 4-byte-aligned binary blob."""

    chunks: list[bytes] = field(default_factory=list)
    size: int = 0

    def add(self, arr: NDArray[Any]) -> dict[str, Any]:
        dtype = {
            np.dtype(np.float32): "f32",
            np.dtype(np.uint32): "u32",
            np.dtype(np.uint8): "u8",
        }[arr.dtype]
        data = np.ascontiguousarray(arr).astype(arr.dtype.newbyteorder("<"), copy=False)
        ref = {"offset": self.size, "length": int(data.size), "type": dtype}
        raw = data.tobytes()
        pad = (-len(raw)) % 4
        self.chunks.append(raw + b"\0" * pad)
        self.size += len(raw) + pad
        return ref


def mirror_triangles(
    points: NDArray[np.float64], tris: NDArray[np.int64]
) -> tuple[NDArray[np.float64], NDArray[np.int64]]:
    """Append the y -> -y mirror image; mirrored triangles are re-wound to keep normals outward."""
    n = points.shape[0]
    mirrored = points * np.array([1.0, -1.0, 1.0])
    return np.vstack([points, mirrored]), np.vstack([tris, tris[:, ::-1] + n])


def _triangles(
    mesh: pv.PolyData,
) -> tuple[NDArray[np.float64], NDArray[np.int64], pv.PolyData]:
    tri = mesh.triangulate().clean()
    faces = np.asarray(tri.faces).reshape(-1, 4)
    if faces.size and not np.all(faces[:, 0] == 3):
        raise ValueError("triangulation left non-triangle faces")
    return np.asarray(tri.points, float), faces[:, 1:].astype(np.int64), tri


def _reader(case: Path, groups: list[str]) -> pv.MultiBlock:
    marker = case / "case.foam"
    marker.touch(exist_ok=True)
    r = pv.POpenFOAMReader(str(marker))
    times = [t for t in r.time_values if t > 0]
    if not times:
        raise FileNotFoundError(f"{case} has no solved time directory (run reconstruct first)")
    r.set_active_time_value(times[-1])
    r.disable_all_patch_arrays()
    r.enable_patch_array("internalMesh")
    for g in groups:
        r.enable_patch_array(f"patch/{g}")
    r.cell_to_point_creation = True
    mesh: pv.MultiBlock = r.read()
    return mesh


def export(case: Path, out_dir: Path | None = None, n_seeds: tuple[int, int] = (16, 12)) -> Path:
    case = Path(case)
    manifest = json.loads((case / "daedalus_manifest.json").read_text())
    result_path = case / "daedalus_result.json"
    result = json.loads(result_path.read_text()) if result_path.exists() else {}
    u_inf = float(manifest["reference"]["U_m_s"])
    car = manifest["car"]
    groups = [g for g in car["groups"] if g in CAR_GROUPS]
    q = 0.5 * u_inf**2

    mesh = _reader(case, groups)
    internal = mesh["internalMesh"]
    boundary = mesh["boundary"]
    if not isinstance(internal, pv.UnstructuredGrid) or not isinstance(boundary, pv.MultiBlock):
        raise ValueError(f"{case}: unexpected OpenFOAM reader output layout")
    buf = _Buffer()
    layers: dict[str, Any] = {}

    # --- surface Cp ------------------------------------------------------------------------
    pts_all: list[NDArray[np.float64]] = []
    tris_all: list[NDArray[np.int64]] = []
    cp_all: list[NDArray[np.float64]] = []
    grp_all: list[NDArray[np.uint8]] = []
    offset = 0
    for gi, g in enumerate(groups):
        block = boundary[g]
        if block is None:
            raise ValueError(f"{case}: car patch {g!r} missing from the OpenFOAM mesh")
        patch = block.extract_surface(algorithm="dataset_surface")
        pts, tris, tri_mesh = _triangles(patch)
        cp = np.asarray(tri_mesh.point_data["p"], float) / q
        pts_all.append(pts)
        tris_all.append(tris + offset)
        cp_all.append(cp)
        grp_all.append(np.full(pts.shape[0], gi, np.uint8))
        offset += pts.shape[0]
    pts = np.vstack(pts_all)
    tris = np.vstack(tris_all)
    cp = np.concatenate(cp_all)
    grp = np.concatenate(grp_all)
    m_pts, m_tris = mirror_triangles(pts, tris)
    layers["surface"] = {
        "positions": buf.add(m_pts.astype(np.float32).ravel()),
        "indices": buf.add(m_tris.astype(np.uint32).ravel()),
        "scalar": buf.add(np.concatenate([cp, cp]).astype(np.float32)),
        "group": buf.add(np.concatenate([grp, grp])),
        "scalar_name": "Cp",
        "range": _robust_range(cp),
        "groups": groups,
    }

    # --- streamlines -----------------------------------------------------------------------
    length, width, height = car["length_m"], car["width_m"], car["height_m"]
    ny, nz = n_seeds
    ys = np.linspace(0.002, width / 2 + 0.012, ny)
    zs = np.linspace(0.0015, height + 0.012, nz)
    yy, zz = np.meshgrid(ys, zs, indexing="ij")
    seeds = pv.PolyData(np.column_stack([np.full(yy.size, -0.03), yy.ravel(), zz.ravel()]))
    lines = internal.streamlines_from_source(
        seeds,
        vectors="U",
        integration_direction="forward",
        max_length=length * 4,
        initial_step_length=0.2,
        step_unit="cl",
        max_steps=4000,
    )
    l_pts, l_off, l_speed = _polylines(lines, u_inf)
    lp2 = np.vstack([l_pts, l_pts * np.array([1.0, -1.0, 1.0])])
    off2 = np.concatenate([l_off, l_off[1:] + l_off[-1]]) if l_off.size else l_off
    layers["streamlines"] = {
        "positions": buf.add(lp2.astype(np.float32).ravel()),
        "offsets": buf.add(off2.astype(np.uint32)),
        "scalar": buf.add(np.concatenate([l_speed, l_speed]).astype(np.float32)),
        "scalar_name": "|U|/U∞",
        "range": [0.0, float(max(1.2, np.percentile(l_speed, 99) if l_speed.size else 1.2))],
    }

    # --- slices ----------------------------------------------------------------------------
    slices: dict[str, tuple[Literal["x", "y"], tuple[float, float, float], tuple[float, ...]]] = {
        "wake": (
            "x",
            (length + 0.015, 0.0, 0.0),
            (length + 0.014, length + 0.016, 0.0, width / 2 + 0.03, 0.0, height + 0.03),
        ),
        "centreline": (
            "y",
            (0.0, 0.0006, 0.0),
            (-0.06, length + 0.12, 0.0, 0.002, 0.0, height + 0.04),
        ),
    }
    for name, (normal, origin, box) in slices.items():
        sl = internal.slice(normal=normal, origin=origin).clip_box(box, invert=False)
        s_pts, s_tris, s_mesh = _triangles(sl.extract_surface(algorithm="dataset_surface"))
        ux = np.asarray(s_mesh.point_data["U"], float)[:, 0] / u_inf
        if name == "wake":
            s_pts, s_tris = mirror_triangles(s_pts, s_tris)
            ux = np.concatenate([ux, ux])
        else:
            s_pts[:, 1] = 0.0  # draw exactly on the symmetry plane
        layers[name] = {
            "positions": buf.add(s_pts.astype(np.float32).ravel()),
            "indices": buf.add(s_tris.astype(np.uint32).ravel()),
            "scalar": buf.add(ux.astype(np.float32)),
            "scalar_name": "Ux/U∞",
            "range": [-0.2, 1.2],
        }

    out = Path(out_dir) if out_dir else case / "viz"
    out.mkdir(parents=True, exist_ok=True)
    (out / "viz.bin").write_bytes(b"".join(buf.chunks))
    meta = {
        "version": VIZ_VERSION,
        "U_m_s": u_inf,
        "car": {"length_m": length, "width_m": width, "height_m": height},
        "acceptance": result.get("acceptance", "pending"),
        "reasons": result.get("reasons", []),
        "iterations": result.get("iterations"),
        "bytes": buf.size,
        "layers": layers,
        "provenance": "simulated",
        "notes": [
            "Half-model fields mirrored about y = 0 for display.",
            "Cp uses kinematic p with p = 0 at the outlet; values are from the last iteration.",
        ],
    }
    (out / "viz.json").write_text(json.dumps(meta, indent=1))
    return out


def _polylines(
    lines: pv.PolyData, u_inf: float
) -> tuple[NDArray[np.float64], NDArray[np.int64], NDArray[np.float64]]:
    """Flatten VTK polylines to (points, start offsets + end sentinel, speed per point)."""
    if lines.n_points == 0:
        return np.zeros((0, 3)), np.zeros(1, np.int64), np.zeros(0)
    pts = np.asarray(lines.points, float)
    speed = np.linalg.norm(np.asarray(lines.point_data["U"], float), axis=1) / u_inf
    conn = np.asarray(lines.lines)
    order: list[NDArray[np.int64]] = []
    i = 0
    while i < conn.size:
        n = int(conn[i])
        if n >= 2:
            order.append(conn[i + 1 : i + 1 + n].astype(np.int64))
        i += n + 1
    idx = np.concatenate(order) if order else np.zeros(0, np.int64)
    offsets = np.concatenate([[0], np.cumsum([o.size for o in order])]).astype(np.int64)
    return pts[idx], offsets, speed[idx]


def _robust_range(v: NDArray[np.float64]) -> list[float]:
    lo, hi = np.percentile(v, [1, 99])
    return [float(lo), float(hi)]
