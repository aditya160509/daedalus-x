"""Validated job endpoints; enqueue only, no API-started solver."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from daedalus.api import create_app


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    design = tmp_path / "designs/car_one"
    design.mkdir(parents=True)
    (design / "geometry.json").write_text("{}")
    return TestClient(create_app())


def test_submit_list_log_cancel(client: TestClient, tmp_path: Path) -> None:
    response = client.post(
        "/v1/jobs",
        json={
            "kind": "cfd_run",
            "params": {
                "design": "car_one",
                "run": "new_run",
                "procs": 8,
            },
        },
    )
    assert response.status_code == 202
    job = response.json()
    assert job["state"] == "queued"
    assert not (tmp_path / "runs/new_run").exists()
    assert client.get("/v1/jobs?state=queued").json()[0]["id"] == job["id"]
    assert client.get(f"/v1/jobs/{job['id']}").json()["kind"] == "cfd_run"
    Path(job["log_path"]).write_text("first\nsecond\n")
    assert client.get(f"/v1/jobs/{job['id']}/log?offset=6").json()["text"] == "second\n"
    assert client.get(f"/v1/jobs/{job['id']}/log?offset=-1").status_code == 422
    assert client.get(f"/v1/jobs/{job['id']}/log?offset=999").status_code == 416
    assert client.post(f"/v1/jobs/{job['id']}/cancel").json()["state"] == "cancelled"
    assert client.get("/v1/jobs/no_such_job").status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {"kind": "evil", "params": {}},
        {"kind": "cfd_run", "params": {"design": "car_one", "run": "../../etc"}},
        {"kind": "cfd_run", "params": {"design": "car_one", "run": "one", "extra": 1}},
        {
            "kind": "geometry_import",
            "params": {"design": "one", "step": "../escape.step", "forward": "-Y", "up": "+Z"},
        },
    ],
)
def test_bad_submissions(client: TestClient, body: dict[str, object]) -> None:
    assert client.post("/v1/jobs", json=body).status_code == 422


def test_existing_and_reserved_run_refused(client: TestClient, tmp_path: Path) -> None:
    (tmp_path / "runs/existing").mkdir(parents=True)
    body = {"kind": "cfd_run", "params": {"design": "car_one", "run": "existing"}}
    assert client.post("/v1/jobs", json=body).status_code == 409
    body["params"]["run"] = "reserved"
    assert client.post("/v1/jobs", json=body).status_code == 202
    assert client.post("/v1/jobs", json=body).status_code == 409
