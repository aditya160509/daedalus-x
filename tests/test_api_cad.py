from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from daedalus.api import create_app

ROOT = Path(__file__).resolve().parents[1] / "data"
STEP = ROOT / "reference" / "team_orbit_2025" / "files" / "Sputnik_Assembly.step"


@pytest.fixture
def client(tmp_path, monkeypatch):
    designs = tmp_path / "designs" / "orbit_baseline"
    designs.mkdir(parents=True)
    (designs / "geometry.json").write_text(
        (ROOT / "designs/orbit_baseline/geometry.json").read_text()
    )
    (tmp_path / "reference").symlink_to(ROOT / "reference")
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    return TestClient(create_app())


def test_source_step_served(client):
    r = client.get("/v1/designs/orbit_baseline/source.step")
    assert r.status_code == 200
    assert r.content[:20].startswith(b"ISO-10303-21")


def test_rejects_non_step(client):
    r = client.post("/v1/designs/import", files={"files": ("x.step", b"hello")}, data={"name": "x"})
    assert r.status_code == 422


@pytest.mark.slow
def test_import_round_trip(client, tmp_path):
    r = client.post(
        "/v1/designs/import",
        files={"files": ("car.step", STEP.read_bytes())},
        data={"name": "Car design 1"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["design_id"] == "car_design_1"
    assert body["checks"]
    assert (tmp_path / "designs/car_design_1/display.glb").is_file()
    assert any(d["design_id"] == "car_design_1" for d in client.get("/v1/designs").json())


@pytest.mark.slow
def test_named_parts_reassembled(client, tmp_path):
    """The CAD sends one STEP per part; names must survive so force groups and rules work."""
    from build123d import Box, Cylinder, Pos, Rot, export_step

    files = []
    for name, shape in [
        ("Main Body", Box(200, 40, 30)),
        ("Front Wing", Pos(-90, 0, -10) * Box(15, 70, 3)),
        ("f1_wheel front-left", Pos(-60, 30, -10) * Rot(90, 0, 0) * Cylinder(14, 8)),
        ("f1_wheel back-left", Pos(70, 30, -10) * Rot(90, 0, 0) * Cylinder(14, 8)),
    ]:
        path = tmp_path / f"{name}.step"
        export_step(shape, path)
        files.append(("files", (f"{name}.step", path.read_bytes())))
    data = {"name": "parts", "forward_axis": "-X"}
    r = client.post("/v1/designs/import", files=files, data=data)
    assert r.status_code == 200, r.text
    groups = client.get("/v1/designs").json()
    got = next(d for d in groups if d["design_id"] == "parts")["groups"]
    assert {"body", "front_wing", "wheels"} <= set(got)
