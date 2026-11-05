"""Synthetic analytic fields for the VTK wake and Q exports; these are not CFD results."""

import numpy as np
import pyvista as pv

from daedalus.viz.vtkexport import _vortices, _wake_plane, _wall_field, _write


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
    assert np.all(vortices.point_data["omega_L_Uinf"] > 0)
    assert np.min(vortices.points[:, 1]) < 0 < np.max(vortices.points[:, 1])
    path = tmp_path / "vortex.vtp"
    _write(vortices, path)
    assert pv.read(path).n_points == vortices.n_points
    empty = mesh.copy()
    empty.point_data["U"] = np.tile([1.0, 0.0, 0.0], (mesh.n_points, 1))
    assert _vortices(empty, car, 1.0).n_points == 0


def test_wall_field_retains_wall_vector_and_exposes_candidate_lines() -> None:
    mesh = pv.Plane(i_resolution=2, j_resolution=2).triangulate()
    mesh.point_data["wallShearStress"] = np.column_stack(
        (mesh.points[:, 0], np.ones(mesh.n_points), np.zeros(mesh.n_points))
    )
    boundary = pv.MultiBlock({"body": mesh})
    lic = _wall_field(boundary, ["body"], separation=False)
    assert lic.n_points > 0
    assert "traction" in lic.point_data
    separation = _wall_field(boundary, ["body"], separation=True)
    assert separation.n_lines > 0
