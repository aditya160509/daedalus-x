import numpy as np
import pyvista as pv

from daedalus.viz.wake import RHO, survey

CAR = {"length_m": 0.2, "width_m": 0.07, "height_m": 0.05}


def _field(deficit: float) -> pv.ImageData:
    grid = pv.ImageData(dimensions=(40, 30, 30), spacing=(0.02, 0.01, 0.01), origin=(0.1, 0.0, 0.0))
    u = np.zeros((grid.n_points, 3))
    y, z = grid.points[:, 1], grid.points[:, 2]
    core = (y < 0.02) & (z < 0.03)
    u[:, 0] = np.where(core, 20.0 * (1 - deficit), 20.0)
    grid.point_data["U"] = u
    grid.point_data["p"] = np.zeros(grid.n_points)
    return grid


def test_uniform_stream_has_no_wake_drag() -> None:
    out = survey(_field(0.0), CAR, 20.0)
    assert all(abs(s["drag_n"]) < 1e-9 for s in out["stations"])


def test_velocity_deficit_gives_positive_momentum_drag() -> None:
    out = survey(_field(0.5), CAR, 20.0)
    d = out["stations"][0]["drag_n"]
    # u(U-u) = 10*10 over the core (about 0.04 m by 0.03 m, mirrored) times rho
    assert 0.5 * RHO * 100 * 0.0012 < d < 2 * RHO * 100 * 0.0012
