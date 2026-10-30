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
                "length_m": 0.2,
                "width_m": 0.07,
                "height_m": 0.05,
                "frontal_area_m2": 0.0025,
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


def test_path_traversal_rejected(client: TestClient) -> None:
    assert client.get("/v1/designs/..%2F..%2Fetc/display.glb").status_code in (400, 404)
    assert client.get("/v1/designs/missing/display.glb").status_code == 404
    assert client.get("/v1/cfd/runs/bad$id").status_code == 400


def test_running_run_has_history_but_no_result(client: TestClient) -> None:
    runs = client.get("/v1/cfd/runs").json()
    assert runs == [
        {"run_id": "run_1", "state": "running", "speed_m_s": 20.0, "cd": None, "acceptance": None}
    ]
    detail = client.get("/v1/cfd/runs/run_1").json()
    assert detail["state"] == "running"
    assert detail["result"] is None
    assert detail["coefficients"]["values"]["Cd"] == [0.6, 0.55]
    assert detail["provenance"] == "simulated"
