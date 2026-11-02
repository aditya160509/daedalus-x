"""Synthetic analytic fields for the VTK wake and Q exports; these are not CFD results."""

import numpy as np
import pyvista as pv

from daedalus.viz.vtkexport import _vortices, _wake_plane, _write


def analytic_grid() -> pv.UnstructuredGrid:
    grid = pv.ImageData(dimensions=(21, 11, 11), spacing=(0.1, 0.1, 0.1))
    x, y, z = np.asarray(grid.points).T
    rotation = 5 + 20 * z
    grid.point_data["U"] = np.column_stack((-rotation * y, rotation * x, np.zeros_like(x)))
    return grid.cast_to_unstructured_grid()


def test_wake_plane_uses_streamwise_velocity_and_mirrors(tmp_path) -> None:
    mesh = analytic_grid()
    car = {"length_m": 1.0, "width_m": 2.0, "height_m": 1.0}
    plane = _wake_plane(mesh, car, 1.0, 1.5)
    assert plane.n_points > 0
    x, y, z = plane.points.T
    assert np.allclose(x, 1.5)
    assert np.min(y) < 0 < np.max(y)
    assert np.allclose(plane.point_data["Ux_Uinf"], -(5 + 20 * z) * np.abs(y), atol=1e-5)
    path = tmp_path / "wake.vtp"
    _write(plane, path)
    assert pv.read(path).n_points == plane.n_points
    assert _wake_plane(mesh, car, 1.0, 3.0).n_points == 0


def test_q_surfaces_from_analytic_rotation(tmp_path) -> None:
    mesh = analytic_grid()
    car = {"length_m": 1.0}
    vortices = _vortices(mesh, car, 1.0)
    assert vortices.n_points > 0
    assert "U_Uinf" in vortices.point_data
    assert np.min(vortices.points[:, 1]) < 0 < np.max(vortices.points[:, 1])
    path = tmp_path / "vortex.vtp"
    _write(vortices, path)
    assert pv.read(path).n_points == vortices.n_points
    empty = mesh.copy()
    empty.point_data["U"] = np.tile([1.0, 0.0, 0.0], (mesh.n_points, 1))
    assert _vortices(empty, car, 1.0).n_points == 0
