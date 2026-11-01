"""API tests for /v1/data/import, /v1/calibrations and /v1/predictions (T09)."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from fastapi.testclient import TestClient

from daedalus import contracts as c
from daedalus.api import app
from daedalus.dynamics import ThrustCurve
from daedalus.montecarlo import race_times


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    with TestClient(app) as tc:
        yield tc


TIMES_CSV = "run_no,lane,time [ms]\n1,a,1200\n2,b,1250\n3,a,1230\n"


def _design(store: Any) -> str:
    project = store.add(c.Project(team="Veloira", competition_class="reference"))
    design: c.Design = store.add(
        c.Design(
            project_id=project.project_id,
            geometry_hash="sha256:" + "0" * 64,
            cad_source="build123d",
            parameters=(),
            provenance=c.Provenance.SYNTHETIC,
        )
    )
    return design.design_id


def _build(client: TestClient, tmp_path: Path) -> str:
    """Add a PhysicalBuild record straight into the test store."""
    from daedalus.store import EvidenceStore

    store = EvidenceStore(tmp_path)
    try:
        build = store.add(
            c.PhysicalBuild(
                design_id=_design(store), build_batch="A1", manufacturing_route="3dprint"
            )
        )
        return build.build_id
    finally:
        store.close()


def test_race_timing_preview_and_commit(client: TestClient, tmp_path: Path) -> None:
    build_id = _build(client, tmp_path)

    preview = client.post(
        "/v1/data/import",
        params={"kind": "race_timing"},
        files={"file": ("runs.csv", TIMES_CSV, "text/csv")},
    ).json()
    assert preview["committed"] is False
    assert preview["rows"][0]["time_s"] == pytest.approx(1.2)
    assert preview["units"] == {"time": "ms"}

    committed = client.post(
        "/v1/data/import",
        params={"kind": "race_timing", "commit": "true", "build_id": build_id},
        files={"file": ("runs.csv", TIMES_CSV, "text/csv")},
    ).json()
    assert committed["committed"] is True
    assert len(committed["record_ids"]) == 3
    assert committed["artifact_id"]

    # Redo: appending never mutates earlier records; the raw file is stored once per digest.
    again = client.post(
        "/v1/data/import",
        params={"kind": "race_timing", "commit": "true", "build_id": build_id},
        files={"file": ("runs.csv", TIMES_CSV, "text/csv")},
    ).json()
    # New Artifact record per import (append-only); the bytes on disk are stored once per digest.
    assert len(again["record_ids"]) == 3 and again["artifact_id"] != committed["artifact_id"]
    assert set(again["record_ids"]).isdisjoint(committed["record_ids"])


def test_import_requires_existing_build(client: TestClient) -> None:
    r = client.post(
        "/v1/data/import",
        params={"kind": "race_timing", "commit": "true", "build_id": "missing_build"},
        files={"file": ("runs.csv", TIMES_CSV, "text/csv")},
    )
    assert r.status_code == 404


def test_bad_files(client: TestClient) -> None:
    assert (
        client.post(
            "/v1/data/import",
            params={"kind": "race_timing"},
            files={"file": ("runs.exe", b"nope", "application/octet-stream")},
        ).status_code
        == 415
    )
    r = client.post(
        "/v1/data/import",
        params={"kind": "race_timing"},
        files={"file": ("runs.csv", "run_no,time_s\n1,0\n2,10\n3,11\n", "text/csv")},
    )
    assert r.status_code == 422
    assert "must be positive" in r.text


def _calibrate_payload() -> dict[str, Any]:
    times = race_times(
        ThrustCurve(np.array([0.0, 0.04, 0.2]), np.array([15.0, 4.0, 0.0])),
        np.full(3, 1.05),
        np.full(3, 0.058),
        np.full(3, 0.0025),
        np.full(3, 0.012),
        1.204,
        np.array([8.0, 12.0, 20.0]),
        dt_s=1e-3,
    )
    thr_t = [0.0, 0.04, 0.2]
    thr_f = [15.0, 4.0, 0.0]
    return {
        "points": [
            {"time_s": float(t), "track_m": m, "sigma_s": 0.002, "mass_kg": 0.058}
            for t, m in zip(times, (8.0, 12.0, 20.0), strict=True)
        ],
        "thrust_t_s": thr_t,
        "thrust_force_n": thr_f,
        "bootstrap_samples": 100,
    }


def test_calibration_round_trip(client: TestClient) -> None:
    payload = _calibrate_payload()
    fit_res = client.post("/v1/calibrations", json=payload)
    assert fit_res.status_code == 200, fit_res.text
    body = fit_res.json()
    assert body["cda_m2"]["value"] == pytest.approx(0.0025, rel=0.15)
    assert body["thrust_scale"]["value"] == pytest.approx(1.05, abs=0.08)

    listing = client.get("/v1/calibrations").json()
    assert [m["model_id"] for m in listing] == [body["model_id"]]
    detail = client.get(f"/v1/calibrations/{body['model_id']}").json()
    assert detail["config"]["cda_m2"] == body["cda_m2"]["value"]

    again = client.post("/v1/calibrations", json=payload).json()
    assert again["model_id"] != body["model_id"]  # never overwrites
    assert len(client.get("/v1/calibrations").json()) == 2


def test_seal_then_score_prediction(client: TestClient, tmp_path: Path) -> None:
    from daedalus.store import EvidenceStore

    fit_body = client.post("/v1/calibrations", json=_calibrate_payload()).json()
    store = EvidenceStore(tmp_path)
    try:
        design_id = _design(store)
    finally:
        store.close()

    seals = client.post(
        "/v1/predictions/seal",
        json={
            "model_id": fit_body["model_id"],
            "design_id": design_id,
            "mass_kg": 0.058,
            "track_length_m": 15.0,
            "thrust_t_s": [0.0, 0.04, 0.2],
            "thrust_force_n": [15.0, 4.0, 0.0],
            "cda_m2": 0.0025,
            "crr": 0.012,
            "n": 200,
        },
    )
    assert seals.status_code == 200, seals.text
    pred = seals.json()
    assert pred["interval_low_s"] <= pred["predicted_s"] <= pred["interval_high_s"]

    scored = client.post(
        f"/v1/predictions/{pred['prediction_id']}/score",
        json={"measured_value": pred["predicted_s"], "unit": "s"},
    )
    assert scored.status_code == 200
    assert scored.json()["inside_interval"] is True

    listing = client.get("/v1/predictions").json()
    assert {p["prediction_id"] for p in listing} == {pred["prediction_id"]}


def test_seal_rejects_unknown_references(client: TestClient) -> None:
    payload = {
        "model_id": "mdl_missing",
        "design_id": "des_missing",
        "mass_kg": 0.058,
        "track_length_m": 15.0,
        "thrust_t_s": [0.0, 0.2],
        "thrust_force_n": [15.0, 0.0],
        "cda_m2": 0.0025,
        "crr": 0.012,
    }
    assert client.post("/v1/predictions/seal", json=payload).status_code == 404
