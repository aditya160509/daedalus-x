"""Design / CFD-run read API tests against a temporary data root."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from daedalus.api import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    d = tmp_path / "designs/car_a"
    d.mkdir(parents=True)
    (d / "geometry.json").write_text(
        json.dumps(
            {
                "source_file": "car.step",
                "source_sha256": "sha256:" + "0" * 64,
                "transform": {"source_units": "mm", "scale_to_m": 0.001},
                "length_m": 0.2,
                "width_m": 0.07,
                "height_m": 0.05,
                "frontal_area_m2": 0.0025,
                "parts": [
                    {
                        "label": "Main",
                        "group": "body",
                        "volume_m3": 0.0001,
                        "bbox_min_m": [0.0, 0.0, 0.0],
                        "bbox_max_m": [0.2, 0.07, 0.05],
                    }
                ],
                "groups": {"body": ["Main"]},
                "warnings": [],
            }
        )
    )
    (d / "display.glb").write_bytes(b"glTF")
    r = tmp_path / "runs/run_1"
    (r / "postProcessing/forceCoeffs/0").mkdir(parents=True)
    (r / "daedalus_manifest.json").write_text(json.dumps({"config": {"speed_m_s": 20.0}}))
    (r / "postProcessing/forceCoeffs/0/coefficient.dat").write_text(
        "# Time Cd Cl Cs\n1 0.6 0.1 0\n2 0.55 0.1 0\n"
    )
    return TestClient(app)


def test_list_designs_and_glb(client: TestClient) -> None:
    designs = client.get("/v1/designs").json()
    assert designs[0]["design_id"] == "car_a"
    assert designs[0]["provenance"] == "estimated"
    r = client.get("/v1/designs/car_a/display.glb")
    assert r.status_code == 200 and r.content == b"glTF"
    geometry = client.get("/v1/designs/car_a/geometry.json")
    assert geometry.status_code == 200
    assert geometry.json()["parts"][0]["label"] == "Main"
    assert geometry.json()["parts"][0]["volume_m3"] == 0.0001
    assert client.get("/v1/designs/missing/geometry.json").status_code == 404


def test_path_traversal_rejected(client: TestClient) -> None:
    assert client.get("/v1/designs/..%2F..%2Fetc/display.glb").status_code in (400, 404)
    assert client.get("/v1/designs/missing/display.glb").status_code == 404
    assert client.get("/v1/cfd/runs/bad$id").status_code == 400


def test_running_run_has_history_but_no_result(client: TestClient) -> None:
    runs = client.get("/v1/cfd/runs").json()
    assert runs == [
        {
            "run_id": "run_1",
            "state": "running",
            "speed_m_s": 20.0,
            "cd": None,
            "acceptance": None,
            "has_viz": False,
        }
    ]
    detail = client.get("/v1/cfd/runs/run_1").json()
    assert detail["state"] == "running"
    assert detail["result"] is None
    assert detail["coefficients"]["values"]["Cd"] == [0.6, 0.55]
    assert detail["provenance"] == "simulated"


def test_viz_files_served_when_exported(client: TestClient, tmp_path: Path) -> None:
    assert client.get("/v1/cfd/runs/run_1/buildup.json").status_code == 404
    assert client.get("/v1/cfd/runs/run_1/viz.json").status_code == 404
    v = tmp_path / "runs/run_1/viz"
    v.mkdir()
    (v / "buildup.json").write_text('{"wall_shear": "unavailable"}')
    assert client.get("/v1/cfd/runs/run_1/buildup.json").json()["wall_shear"] == "unavailable"
    (v / "viz.json").write_text('{"version": 1}')
    (v / "viz.bin").write_bytes(b"\x00\x01\x02\x03")
    assert client.get("/v1/cfd/runs/run_1/viz.json").json() == {"version": 1}
    assert client.get("/v1/cfd/runs/run_1/viz.bin").content == b"\x00\x01\x02\x03"
    assert client.get("/v1/cfd/runs").json()[0]["has_viz"] is True


def test_render_rejects_bad_view_and_unknown_run(client: TestClient) -> None:
    assert client.get("/v1/cfd/runs/nope/render").status_code == 404
    assert client.get("/v1/cfd/runs/nope/render?view=bogus").status_code == 422


def test_render_serves_cached_png(client: TestClient, tmp_path: Path) -> None:
    run = tmp_path / "runs/cached"
    (run / "render").mkdir(parents=True)
    (run / "render/side.png").write_bytes(b"\x89PNG\r\n\x1a\nfake")
    r = client.get("/v1/cfd/runs/cached/render?view=side")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content.startswith(b"\x89PNG")


@pytest.mark.slow
def test_render_generates_baseline_png(monkeypatch: pytest.MonkeyPatch) -> None:
    import os

    root = Path(
        os.environ.get("DAEDALUS_BASELINE_DATA", Path(__file__).resolve().parents[1] / "data")
    )
    run = root / "runs/orbit_baseline_20ms"
    if not (run / "daedalus_result.json").exists():
        pytest.skip("baseline run not present")
    monkeypatch.setenv("DAEDALUS_DATA", str(root))
    out = run / "render/front.png"
    backup = out.read_bytes() if out.exists() else None
    out.unlink(missing_ok=True)
    try:
        r = TestClient(app).get("/v1/cfd/runs/orbit_baseline_20ms/render?view=front")
        assert r.status_code == 200 and r.content.startswith(b"\x89PNG")
    finally:
        if backup is not None:
            out.write_bytes(backup)
