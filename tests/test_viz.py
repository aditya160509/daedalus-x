"""Flow-field export helpers (the full export is exercised on a real case in evidence)."""

from itertools import pairwise
from pathlib import Path

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


def test_rankine_vortex_q_positive_core_negative_outer() -> None:
    grid = pv.ImageData(dimensions=(51, 51, 3), spacing=(0.04, 0.04, 0.04), origin=(-1, -1, -0.04))
    x, y, _ = np.asarray(grid.points).T
    r2 = x * x + y * y
    omega = np.where(r2 < 0.25, 1.0, 0.25 / np.maximum(r2, 1e-12))
    grid.point_data["U"] = np.column_stack([-y * omega, x * omega, np.zeros(len(x))])
    derived = grid.compute_derivative(scalars="U", gradient=False, qcriterion=True)
    q = np.asarray(derived.point_data["qcriterion"])
    assert np.all(q[r2 < 0.15] > 0.99)
    assert np.all(q[(r2 > 0.4) & (r2 < 0.7)] < 0)


def test_surface_rk2_streaks_stay_on_plate_and_follow_traction() -> None:
    from daedalus.viz.surface import oil_streaks

    plane = pv.Plane(i_size=1.0, j_size=1.0, i_resolution=20, j_resolution=20).triangulate()
    plane.point_data["wallShearStress"] = np.tile([-1.0, 0.0, 0.0], (plane.n_points, 1))
    lines = oil_streaks(plane, 30)
    lines.point_data["U"] = lines.point_data["traction"]
    pts, offsets, values = _polylines(lines, 1.0)
    assert len(offsets) > 20 and np.allclose(values, 1.0)
    for start, end in pairwise(offsets):
        line = pts[start:end]
        assert np.ptp(line[:, 1]) < 1e-8
        assert np.allclose(line[:, 2], 0.0)
        assert np.all(np.diff(line[:, 0]) >= -1e-8)


def test_low_shear_crossing_detector_on_known_flip() -> None:
    from daedalus.viz.surface import separation_flags

    plane = pv.Plane(i_size=1.0, j_size=1.0, i_resolution=20, j_resolution=10).triangulate()
    x = np.asarray(plane.points, float)[:, 0]
    flags = separation_flags(plane, np.column_stack([x, np.zeros(len(x)), np.zeros(len(x))]))
    assert flags.any()
    assert np.all(np.abs(x[flags.astype(bool)]) < 1e-6)
    assert not flags[np.abs(x) > 0.1].any()


def test_drag_binning_conserves_force_and_viscous_sign() -> None:
    import pytest

    from daedalus.viz.surface import drag_bins, patch_drag

    plane = pv.Plane(
        center=(0.0, 0.0, 0.0), direction=(1.0, 0.0, 0.0), i_size=1.0, j_size=1.0
    ).triangulate()
    plane.cell_data["p"] = np.full(plane.n_cells, 2.0)
    plane.cell_data["wallShearStress"] = np.tile([-0.5, 0.0, 0.0], (plane.n_cells, 1))
    x, force = patch_drag(plane, 1.0)
    curve = drag_bins(x, force, np.linspace(-0.5, 0.5, 101))
    assert curve[-1] == pytest.approx(2.5)
    assert (
        drag_bins(
            np.array([0.0, 0.5, 1.0]), np.array([1.0, -2.0, 4.0]), np.linspace(0.0, 1.0, 101)
        )[-1]
        == 3.0
    )


def test_missing_wall_shear_is_explicit_not_a_zero_drag_curve(tmp_path: Path) -> None:
    import json

    from daedalus.viz.insights import _walls

    boundary = pv.MultiBlock({"body": pv.Plane()})
    layers = {"surface": {"groups": ["body"]}}
    status = _walls(boundary, {}, {}, _Buffer(), layers, tmp_path)
    assert status["wall_shear"] == "unavailable"
    assert "oilflow" not in layers
    saved = json.loads((tmp_path / "buildup.json").read_text())
    assert saved["missing_patches"] == ["body"]
    assert "total_cd" not in saved
