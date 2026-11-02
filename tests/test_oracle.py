"""ORACLE (T10): GP fits, EI proposes, benchmark beats LHS, API answers."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from daedalus import oracle
from daedalus.api import app


def test_gp_interpolates_and_ei_proposes_inside_cube() -> None:
    x = oracle.candidates(12, seed=1)
    y = oracle.synthetic_cda(x)
    u, ei, gp = oracle.next_best(x, y)
    mean, _ = gp.predict(x)
    assert np.allclose(mean, y, rtol=0.02)
    assert ei >= 0 and np.all((u >= 0) & (u <= 1))


def test_gp_beats_lhs_on_same_budget() -> None:
    b = oracle.benchmark(budget=16, n_init=6, seeds=2)
    assert b["gp"][-1] <= b["lhs"][-1]


def test_state_and_add(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    monkeypatch.setattr("daedalus.api.oracle._benchmark", lambda: {"gp": [1.0], "lhs": [1.0]})
    with TestClient(app) as c:
        s = c.get("/v1/oracle/state").json()
        assert s["provenance"] == "synthetic" and len(s["aero_map"]["cda_m2"]) == 25
        assert s["next"]["race_time_s"] > 0
        r = c.post("/v1/oracle/observations", json={"unit": [0.5] * 4, "cda_m2": 0.0024})
        assert r.json()["count"] == 9
        assert c.get("/v1/oracle/state").json()["provenance"] == "mixed"


def test_observation_rejects_invalid_inputs():
    for params, cda in [
        ((0.5,) * 3, 0.002),
        ((float("nan"),) * 4, 0.002),
        ((1.1,) * 4, 0.002),
        ((0.5,) * 4, float("inf")),
    ]:
        with pytest.raises(ValueError):
            oracle.Observation(params, cda, "simulated")
    with TestClient(app) as client:
        assert (
            client.post(
                "/v1/oracle/observations", json={"unit": [1.1] * 4, "cda_m2": 0.002}
            ).status_code
            == 422
        )


def test_parallel_campaign_appends_do_not_lose_observations(tmp_path):
    from concurrent.futures import ThreadPoolExecutor

    def append(index):
        return oracle.Campaign(tmp_path).add(
            oracle.Observation((index / 100,) * 4, 0.002, "simulated")
        )

    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(append, range(16)))
    observations = oracle.Campaign(tmp_path).load()
    actual = [o for o in observations if o.provenance != "synthetic"]
    assert len(observations) == 24 and len(actual) == 16
    assert len({o.params for o in actual}) == 16
    assert not list((tmp_path / "oracle").glob("tmp*"))


def test_study_recommendation_uses_declared_family_bounds():
    x = oracle.candidates(8, seed=7)
    y = oracle.synthetic_cda(x)
    candidate, _, _ = oracle.next_best(x, y, candidate_filter=oracle.study_feasible)
    assert bool(oracle.study_feasible(candidate)[0])
    with pytest.raises(ValueError, match="No candidate"):
        oracle.next_best(x, y, candidate_filter=lambda points: np.zeros(len(points), dtype=bool))
