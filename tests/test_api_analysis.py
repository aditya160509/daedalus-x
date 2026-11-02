"""Analysis endpoints. The router is mounted on its own app so the test needs no CAD stack."""

from __future__ import annotations

import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient

from daedalus.api import analysis

app = FastAPI()
app.include_router(analysis.router)
client = TestClient(app)

THRUST = {"t_s": [0.0, 0.02, 0.1, 0.4, 0.6], "force_n": [0.0, 4.0, 3.0, 1.5, 0.0]}  # synthetic


def test_energy_endpoint_balances() -> None:
    r = client.post(
        "/v1/analysis/energy",
        json={"mass_kg": 0.05, "track_length_m": 20, "thrust": THRUST, "cda_m2": 4e-4, "crr": 0.01},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["closure_fraction"] < 0.01
    assert body["dominant_loss"] in {"drag", "rolling"}


def test_energy_endpoint_rejects_a_bad_thrust_curve() -> None:
    bad = {"t_s": [0.0, 0.0], "force_n": [1.0, 1.0]}
    r = client.post(
        "/v1/analysis/energy",
        json={"mass_kg": 0.05, "track_length_m": 20, "thrust": bad, "cda_m2": 4e-4, "crr": 0.01},
    )
    assert r.status_code == 422


def test_test_plan_endpoint_flags_unidentified_parameters() -> None:
    r = client.post(
        "/v1/analysis/test-plan",
        json={
            "thrust": THRUST,
            "cda_m2": 4e-4,
            "crr": 0.01,
            "candidates": [{"track_m": 20, "mass_kg": 0.05}, {"track_m": 10, "mass_kg": 0.05}],
            "budget": 3,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["steps"]) == 3
    assert "cda" in body["poorly_identified"]


def test_beam_endpoint_matches_the_cantilever_formula() -> None:
    r = client.post(
        "/v1/analysis/beam",
        json={
            "length_m": 0.03,
            "section": {"kind": "circle", "outer_m": 0.003},
            "material": "aluminium_6061_t6",
            "supports": {"0": "fixed"},
            "point_loads_n": {"0.03": 1.0},
        },
    )
    assert r.status_code == 200
    ei = 68.9e9 * np.pi * 0.003**4 / 64
    assert r.json()["max_deflection_mm"] == pytest_approx(1.0 * 0.03**3 / (3 * ei) * 1000)
    assert (
        client.get("/v1/analysis/beam/materials").json()["materials"]["abs"]["source"]
        == "estimated"
    )


def test_beam_endpoint_errors() -> None:
    base = {
        "length_m": 0.03,
        "section": {"kind": "circle", "outer_m": 0.003},
        "supports": {"0": "pinned"},
    }
    assert (
        client.post("/v1/analysis/beam", json={**base, "material": "unobtainium"}).status_code
        == 404
    )
    r = client.post(
        "/v1/analysis/beam", json={**base, "material": "abs", "point_loads_n": {"0.03": 1}}
    )
    assert r.status_code == 422  # a single pin is a mechanism
    r = client.post(
        "/v1/analysis/beam", json={**base, "material": "abs", "section": {"kind": "rectangle"}}
    )
    assert r.status_code == 422


def test_racing_points_endpoint() -> None:
    rng = np.random.default_rng(1)
    r = client.post(
        "/v1/analysis/racing-points",
        json={
            "car_time_s": rng.normal(1.18, 0.01, 500).tolist(),
            "reaction_mean_s": 0.25,
            "reaction_sd_s": 0.03,
            "other_best_total_s": rng.normal(1.5, 0.06, 30).tolist(),
            "other_best_car_s": rng.normal(1.25, 0.06, 30).tolist(),
            "round_opponents_s": [
                rng.normal(m, 0.02, 300).tolist() for m in (1.6, 1.55, 1.5, 1.45)
            ],
            "field_source": "synthetic",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["field_source"] == "synthetic"
    assert body["expected_total_points"] > 0


def pytest_approx(value: float) -> object:
    import pytest

    return pytest.approx(value, rel=1e-6)


PLAN = {
    "tasks": [
        {"id": "cad", "name": "CAD", "days": {"optimistic": 4, "likely": 5, "pessimistic": 9}},
        {
            "id": "cnc",
            "name": "CNC",
            "days": {"optimistic": 1, "likely": 2, "pessimistic": 4},
            "depends_on": ["cad"],
            "cost": {"optimistic": 800, "likely": 1000, "pessimistic": 1500},
        },
    ],
    "deadline_days": 8,
    "budget": 1200,
}


def test_project_forecast_and_plan_round_trip(tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    assert client.get("/v1/analysis/project/plan").json()["tasks"] == []
    assert client.put("/v1/analysis/project/plan", json=PLAN).status_code == 200
    assert client.get("/v1/analysis/project/plan").json()["tasks"][1]["id"] == "cnc"
    r = client.post("/v1/analysis/project/forecast", json=PLAN)
    assert r.status_code == 200
    body = r.json()
    assert body["critical_path"] == ["cad", "cnc"]
    assert 0 < body["finish_probability"] < 1
    assert body["slack_days"]["cad"] == 0


def test_project_forecast_rejects_a_cycle() -> None:
    bad = {
        "tasks": [
            {
                "id": "a",
                "name": "A",
                "days": {"optimistic": 1, "likely": 1, "pessimistic": 1},
                "depends_on": ["b"],
            },
            {
                "id": "b",
                "name": "B",
                "days": {"optimistic": 1, "likely": 1, "pessimistic": 1},
                "depends_on": ["a"],
            },
        ]
    }
    assert client.post("/v1/analysis/project/forecast", json=bad).status_code == 422
