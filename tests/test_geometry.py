"""Geometry adapter tests (spec §4.1, §4.1b)."""

import json
from pathlib import Path

import numpy as np
import pytest
import trimesh
from build123d import Box, Compound, Cylinder, Location, export_step

from daedalus.geometry import (
    ForceGroup,
    GeometryError,
    classify,
    frontal_area,
    import_car,
    rotation_for,
)


@pytest.mark.parametrize(
    ("label", "group"),
    [
        ("Front_Wing-Sputnik_v58", ForceGroup.FRONT_WING),
        ("Rear_Wing-proto2", ForceGroup.REAR_WING),
        ("f1_wheel_front-right_v8", ForceGroup.WHEELS),
        ("f1_axle_bush_v1_v3", ForceGroup.WHEELS),
        ("CO2_Cartridge_v1", ForceGroup.CARTRIDGE),
        ("Virtual_cargo_v3", ForceGroup.INTERNAL),
        ("Main_Body_-_Sputnik", ForceGroup.BODY),
        ("mystery part", None),
    ],
)
def test_classify(label: str, group: ForceGroup | None) -> None:
    assert classify(label) is group


def test_rotation_is_right_handed_and_maps_nose_upstream() -> None:
    r = rotation_for("-Y", "+Z")
    assert np.allclose(r @ r.T, np.eye(3))
    assert np.isclose(np.linalg.det(r), 1.0)
    # A point at the nose (source -Y) must end up at the smallest engineering x.
    nose, tail = r @ np.array([0, -1.0, 0]), r @ np.array([0, 1.0, 0])
    assert nose[0] < tail[0]
    assert np.allclose(r @ np.array([0, 0, 1.0]), [0, 0, 1])


def test_rotation_rejects_bad_axes() -> None:
    with pytest.raises(GeometryError):
        rotation_for("+Z", "+Z")
    with pytest.raises(GeometryError):
        rotation_for("forward", "+Z")


def test_frontal_area_of_box() -> None:
    box = trimesh.creation.box(extents=(0.2, 0.06, 0.04))
    assert frontal_area(box) == pytest.approx(0.06 * 0.04, rel=0.02)


def test_import_asymmetric_car_frame_and_outputs(tmp_path: Path) -> None:
    """Asymmetric reference shape (spec §4.1b): nose wing at -Y, tall fin at the tail."""
    body = Box(60, 200, 30)
    body.label = "Main_Body"
    wing = Box(70, 20, 6).moved(Location((0, -110, -9)))
    wing.label = "Front_Wing"
    fin = Box(4, 10, 40).moved(Location((0, 95, 20)))
    fin.label = "Rear_Wing"
    step = tmp_path / "car.step"
    export_step(Compound(children=[body, wing, fin]), step)

    rep = import_car(step, tmp_path / "out", forward_axis="-Y", up_axis="+Z")
    assert rep.length_m == pytest.approx(0.220, abs=1e-6)
    assert rep.width_m == pytest.approx(0.070, abs=1e-6)
    by = {p.group: p for p in rep.parts}
    # nose wing sits at the front (small x), fin at the tail (large x) and on top
    assert by[ForceGroup.FRONT_WING].centroid_m == pytest.approx((0.010, 0, 0.006))
    assert by[ForceGroup.FRONT_WING].bbox_min_m[0] == pytest.approx(0.0, abs=1e-6)
    assert by[ForceGroup.REAR_WING].bbox_max_m[0] > 0.2
    assert by[ForceGroup.REAR_WING].bbox_max_m[2] == pytest.approx(rep.height_m, abs=1e-6)
    assert min(p.bbox_min_m[2] for p in rep.parts) == pytest.approx(0.0, abs=1e-9)
    # symmetric about y = 0
    lo = min(p.bbox_min_m[1] for p in rep.parts)
    hi = max(p.bbox_max_m[1] for p in rep.parts)
    assert lo == pytest.approx(-hi, abs=1e-9)
    out = tmp_path / "out"
    assert {p.stem for p in (out / "cfd").glob("*.stl")} == {"body", "front_wing", "rear_wing"}
    assert (out / "display.glb").stat().st_size > 0
    with pytest.raises(FileExistsError):
        import_car(step, out, forward_axis="-Y", up_axis="+Z")
    assert rep.source_sha256.startswith("sha256:")
    assert rep.frontal_area_m2 > 0


def test_import_splits_axles_but_keeps_parent_wheels(tmp_path: Path) -> None:
    body = Box(60, 200, 15).moved(Location((0, 0, 15)))
    body.label = "Body"
    parts: list[Box | Cylinder] = [body]
    for y in (-60, 65):
        for x in (-30, 30):
            wheel = Cylinder(15, 10, rotation=(0, 90, 0)).moved(Location((x, y, 15)))
            wheel.label = "wheel"
            parts.append(wheel)
    step = tmp_path / "car.step"
    export_step(Compound(children=parts), step)
    out = tmp_path / "out"
    rep = import_car(step, out, forward_axis="-Y", up_axis="+Z")
    assert rep.schema_version == 2
    assert len(rep.groups["wheels"]) == 4
    assert len(rep.groups["wheels_front"]) == len(rep.groups["wheels_rear"]) == 2
    front, rear = rep.axles["wheels_front"], rep.axles["wheels_rear"]
    assert front["origin"][0] < rear["origin"][0]
    for axle in (front, rear):
        assert axle["axis"] == (0, 1, 0)
        assert axle["radius_m"] == pytest.approx(0.015, rel=0.003)
        assert axle["origin"][2] == axle["radius_m"]
    assert not (out / "cfd/wheels.stl").exists()
    assert (out / "cfd/wheels_front.stl").exists()
    assert (out / "cfd/wheels_rear.stl").exists()
    metadata = json.loads((out / "geometry.json").read_text())
    assert metadata["schema_version"] == 2 and set(metadata["axles"]) == set(rep.axles)
    scene = trimesh.load(out / "display.glb")
    assert isinstance(scene, trimesh.Scene)
    assert any(name.startswith("wheels/") for name in scene.geometry)
