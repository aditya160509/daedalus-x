"""Binary layout and shared mesh helpers for the flow export."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pyvista as pv
from numpy.typing import NDArray


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
    if not v.size:
        return [0.0, 1.0]
    if not np.all(np.isfinite(v)):
        raise ValueError("non-finite values in flow layer")
    lo, hi = np.percentile(v, [1, 99])
    return [float(lo), float(hi)]
