"""Flow-field export helpers (the full export is exercised on a real case in evidence)."""

import numpy as np
import pyvista as pv

from daedalus.viz import _Buffer, _polylines, mirror_triangles


def test_mirror_rewinds_triangles_to_keep_normals_outward() -> None:
    pts = np.array([[0.0, 0.1, 0.0], [1.0, 0.1, 0.0], [0.0, 0.1, 1.0]])
    tris = np.array([[0, 1, 2]])
    p2, t2 = mirror_triangles(pts, tris)
    assert p2.shape == (6, 3) and np.allclose(p2[3:, 1], -0.1)

    def normal(p: np.ndarray, t: np.ndarray) -> np.ndarray:
        a, b, c = p[t]
        return np.cross(b - a, c - a)

    n0, n1 = normal(p2, t2[0]), normal(p2, t2[1])
    assert n0[1] == -n1[1]  # mirror image of the normal, not the same direction
    assert np.allclose(n0[[0, 2]], n1[[0, 2]])


def test_buffer_is_aligned_and_typed() -> None:
    b = _Buffer()
    r1 = b.add(np.array([1, 2, 3], np.uint8))
    r2 = b.add(np.array([1.5], np.float32))
    assert r1 == {"offset": 0, "length": 3, "type": "u8"}
    assert r2["offset"] == 4  # padded to 4 bytes so a Float32Array view is legal
    blob = b"".join(b.chunks)
    assert np.frombuffer(blob, "<f4", 1, r2["offset"])[0] == 1.5


def test_polylines_flattened_with_offsets_and_speed() -> None:
    pts = np.array([[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 0]], float)
    lines = pv.PolyData(pts, lines=np.array([3, 0, 1, 2, 2, 3, 4]))
    lines.point_data["U"] = np.tile([10.0, 0, 0], (5, 1))
    p, off, speed = _polylines(lines, 20.0)
    assert off.tolist() == [0, 3, 5]
    assert p.shape == (5, 3) and np.allclose(speed, 0.5)
