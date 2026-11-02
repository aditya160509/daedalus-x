"""Bayesian API wiring; numerical calibration is covered separately with synthetic data."""

from __future__ import annotations

import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient

from daedalus import bayes_calibration
from daedalus.api.data import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_held_out_runs_are_scored_separately(monkeypatch):
    seen = []

    class Posterior:
        def to_mapping(self):
            return {"summaries": {}, "effective_sample_size": 100.0, "seed": 0, "warnings": []}

        def predict(self, thrust, **kwargs):
            assert kwargs["track_m"] == 15
            return np.array([1.0, 1.1, 1.2])

    def calibrate(runs, thrust, priors, **kwargs):
        seen.extend(runs)
        return Posterior()

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
