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
