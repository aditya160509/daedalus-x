"""CAD-feature checks against analytic solids; these fixtures are synthetic."""

from __future__ import annotations

import numpy as np
import pytest
import trimesh
from build123d import Axis, Cylinder, GeomType

from daedalus.forge_features import analytic_features, wing_sections


def test_rolling_band_excludes_chamfers() -> None:
    wheel = Cylinder(15, 18)
    wheel = wheel.chamfer(1, None, wheel.edges().filter_by(GeomType.CIRCLE))
    wheel = wheel.rotate(Axis.X, 90)
    features = analytic_features([("front wheel", wheel)], np.eye(3), np.zeros(3))
    assert features["front wheel"]["rolling_diameter_mm"] == pytest.approx(30)
    assert features["front wheel"]["rolling_width_mm"] == pytest.approx(16)


def test_wing_sample_returns_thickness_not_bounding_height_at_incidence() -> None:
    wing = trimesh.creation.box(extents=[0.020, 0.060, 0.004])
    section = wing_sections(wing.vertices, wing.faces)
    assert section["thickness_min_mm"] == pytest.approx(4)
    assert section["thickness_max_mm"] == pytest.approx(4)
    assert section["sampled_stations"] == 21


def test_unnamed_halo_circles_do_not_infer_a_notch() -> None:
    halo = Cylinder(4, 10)
    assert analytic_features([("halo", halo)], np.eye(3), np.zeros(3)) == {}
