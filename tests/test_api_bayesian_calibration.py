"""Bayesian API wiring; numerical calibration is covered separately with synthetic data."""

from __future__ import annotations

import base64

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from daedalus import bayes_calibration
from daedalus.api.data import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_store(monkeypatch, tmp_path):
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path / "data"))


def fake_posterior(summaries=None):
    class Posterior:
        def to_mapping(self):
            return {
                "summaries": summaries or {},
                "effective_sample_size": 100.0,
                "seed": 0,
                "warnings": [],
            }

        def predict(self, thrust, **kwargs):
            assert kwargs["track_m"] == 15
            return np.array([1.0, 1.1, 1.2])

    return Posterior()


def test_held_out_runs_are_scored_separately(monkeypatch):
    seen = []

    def calibrate(runs, thrust, priors, **kwargs):
        seen.extend(runs)
        return fake_posterior()

    monkeypatch.setattr(bayes_calibration, "calibrate", calibrate)
    training = {"time_s": 1.2, "track_m": 20, "sigma_s": 0.005, "mass_kg": 0.05}
    held = {"time_s": 1.05, "track_m": 15, "sigma_s": 0.005, "mass_kg": 0.05}
    body = {
        "points": [training],
        "held_out": [held],
        "thrust_t_s": [0, 0.5],
        "thrust_force_n": [1, 0],
        "cda_m2": 0.0015,
        "crr": 0.02,
    }
    response = client.post("/v1/calibrations/bayesian", json=body)
    assert response.status_code == 200
    assert len(seen) == 1 and seen[0].time_s == 1.2
    result = response.json()
    assert result["held_out"][0]["measured_s"] == 1.05
    assert result["held_out"][0]["median_s"] == 1.1
    body["held_out"] = []
    assert client.post("/v1/calibrations/bayesian", json=body).json()["held_out"] == []
    body["points"] = []
    assert client.post("/v1/calibrations/bayesian", json=body).status_code == 422


def test_bayesian_calibration_rejects_overlapping_work():
    from daedalus.api.data import _BAYESIAN_LOCK

    body = {
        "points": [{"time_s": 1.2, "track_m": 20, "sigma_s": 0.005, "mass_kg": 0.05}],
        "thrust_t_s": [0, 0.5],
        "thrust_force_n": [1, 0],
        "cda_m2": 0.0015,
        "crr": 0.02,
    }
    with _BAYESIAN_LOCK:
        response = client.post("/v1/calibrations/bayesian", json=body)
    assert response.status_code == 409


SUMMARIES = {
    "cda_m2": {"median": 0.0017, "p05": 0.0015, "p95": 0.0019, "information_gain": 0.42},
    "crr": {"median": 0.021, "p05": 0.018, "p95": 0.024, "information_gain": 0.11},
    "thrust_scale": {"median": 0.98, "p05": 0.95, "p95": 1.01, "information_gain": 0.07},
}


def _body(**extra):
    body = {
        "points": [
            {"time_s": 1.2, "track_m": 20, "sigma_s": 0.005, "mass_kg": 0.05},
            {"time_s": 1.21, "track_m": 20, "sigma_s": 0.005, "mass_kg": 0.05},
        ],
        "thrust_t_s": [0, 0.5],
        "thrust_force_n": [1, 0],
        "cda_m2": 0.0015,
        "crr": 0.02,
        "seed": 7,
    }
    body.update(extra)
    return body


def test_calibration_is_saved_with_inputs_results_and_sources(monkeypatch):
    monkeypatch.setattr(
        bayes_calibration, "calibrate", lambda *args, **kwargs: fake_posterior(SUMMARIES)
    )
    raw = b"time [s],run\n1.200,1\n1.210,2\n"
    response = client.post(
        "/v1/calibrations/bayesian",
        json=_body(
            source_files=[
                {
                    "label": "runs.csv",
                    "role": "held_out",
                    "content_b64": base64.b64encode(raw).decode(),
                },
            ]
        ),
    )
    assert response.status_code == 200
    result = response.json()
    study_id, model_id = result["study_id"], result["model_id"]

    listed = client.get("/v1/calibration-studies").json()
    assert [s["study_id"] for s in listed] == [study_id]
    assert listed[0]["medians"]["cda_m2"] == 0.0017
    assert listed[0]["source_labels"] == ["runs.csv"]

    detail = client.get(f"/v1/calibration-studies/{study_id}").json()
    assert detail["inputs"]["seed"] == 7
    assert len(detail["inputs"]["points"]) == 2
    assert "source_files" not in detail["inputs"]
    assert detail["results"]["summaries"]["crr"]["median"] == 0.021
    assert detail["sources"][0]["label"] == "runs.csv"
    assert detail["sources"][0]["role"] == "held_out"
    assert detail["sources"][0]["size_bytes"] == len(raw)
    assert detail["sources"][0]["content_sha256"].startswith("sha256:")

    model = client.get(f"/v1/calibrations/{model_id}").json()
    assert model["kind"] == "titan"
    assert model["config"]["method"] == "bayesian"
    assert model["config"]["cda_m2"] == 0.0017


def test_saved_calibration_reopens_the_exact_inputs(monkeypatch):
    monkeypatch.setattr(
        bayes_calibration, "calibrate", lambda *args, **kwargs: fake_posterior(SUMMARIES)
    )
    body = _body()
    study_id = client.post("/v1/calibrations/bayesian", json=body).json()["study_id"]
    detail = client.get(f"/v1/calibration-studies/{study_id}").json()
    stored = detail["inputs"]
    for saved, sent in zip(stored["points"], body["points"], strict=True):
        assert saved["time_s"] == sent["time_s"]
        assert saved["track_m"] == sent["track_m"]
        assert saved["sigma_s"] == sent["sigma_s"]
        assert saved["mass_kg"] == sent["mass_kg"]
    assert stored["thrust_t_s"] == body["thrust_t_s"]
    assert stored["cda_m2"] == body["cda_m2"]
    assert stored["crr"] == body["crr"]
    assert stored["seed"] == body["seed"]


def test_source_files_are_validated(monkeypatch):
    monkeypatch.setattr(
        bayes_calibration, "calibrate", lambda *args, **kwargs: fake_posterior(SUMMARIES)
    )
    bad_ext = _body(
        source_files=[{"label": "runs.exe", "content_b64": base64.b64encode(b"x").decode()}]
    )
    assert client.post("/v1/calibrations/bayesian", json=bad_ext).status_code == 415
    bad_b64 = _body(source_files=[{"label": "runs.csv", "content_b64": "not base64!"}])
    assert client.post("/v1/calibrations/bayesian", json=bad_b64).status_code == 422
    blank = _body(source_files=[{"label": "runs.csv", "content_b64": ""}])
    assert client.post("/v1/calibrations/bayesian", json=blank).status_code == 422
    good = _body(
        source_files=[{"label": "runs.csv", "content_b64": base64.b64encode(b"x").decode()}]
    )
    assert client.post("/v1/calibrations/bayesian", json=good).status_code == 200
    assert client.get("/v1/calibration-studies").json()[0]["source_labels"] == ["runs.csv"]


def test_unknown_study_is_a_404():
    assert client.get("/v1/calibration-studies/cal_missing").status_code == 404
