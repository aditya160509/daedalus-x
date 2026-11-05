import numpy as np
import pytest
import pyvista as pv

from daedalus.viz.mesh_quality import mesh_summary


def test_mesh_quality_uses_wall_values_and_flags_cell_centres() -> None:
    cells = pv.ImageData(dimensions=(3, 2, 2))
    cells.cell_data["skewness"] = np.array([0.5, 6.0])
    cells.cell_data["nonOrthoAngle"] = np.array([70.0, 10.0])
    wall = pv.Plane(i_resolution=1, j_resolution=1)
    wall.cell_data["yPlus"] = np.array([2.5])
    mesh = pv.MultiBlock({"internalMesh": cells, "boundary": pv.MultiBlock({"body": wall})})

    result = mesh_summary(mesh)
    assert np.asarray(result["wall_y_plus"])[:, 3].tolist() == [2.5]
    quality = result["quality"]
    assert isinstance(quality, dict)
    assert sum(quality["counts"]) == 2
    assert quality["flagged_count"] == 2
    points = np.asarray(quality["bad_cells"])
    assert points[:, 0] == pytest.approx([0.5, 1.5])
    assert points[:, 3] == pytest.approx([70 / 65, 6 / 4])


def test_mesh_quality_preserves_missing_fields() -> None:
    result = mesh_summary(pv.MultiBlock({"internalMesh": pv.ImageData(dimensions=(2, 2, 2))}))
    assert result == {"wall_y_plus": [], "quality": None}
