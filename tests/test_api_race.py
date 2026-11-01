"""Race API tests."""

import math

from fastapi.testclient import TestClient

from daedalus.api import app

client = TestClient(app)


def body(**kw: object) -> dict[str, object]:
    b: dict[str, object] = {
        "model": "M1",
        "mass_kg": 0.05,
        "track_length_m": 20.0,
        "thrust": {
            "t_s": [0.0, 2.0],
            "force_n": [2.0, 2.0],
            "provenance": "estimated",
            "source": "test constant thrust",
        },
        "cda_m2": 0.0,
        "crr": 0.0,
        "input_provenance": "estimated",
    }
    b.update(kw)
    return b


def test_health() -> None:
    assert client.get("/v1/health").json() == {"status": "ok"}


def test_simulate_matches_analytic_and_returns_aligned_channels() -> None:
    r = client.post("/v1/race/simulate", json=body())
    assert r.status_code == 200
    data = r.json()
    assert data["provenance"] == "predicted"
    assert data["input_provenance"] == ["estimated"]
    assert math.isclose(data["time_s"], 1.0, abs_tol=1e-6)
    n = len(data["time_axis"]["values"])
    assert 2 <= n <= 2000
    names = {c["name"]: c for c in data["channels"]}
    assert set(names) >= {"position", "velocity", "acceleration", "thrust", "drag"}
    assert all(len(c["values"]) == n for c in data["channels"])
    assert names["velocity"]["unit"] == "m/s"


def test_non_finish_has_no_time() -> None:
    thrust = {"t_s": [0, 0.05], "force_n": [0.5, 0.5], "provenance": "estimated", "source": "x"}
    r = client.post("/v1/race/simulate", json=body(model="M2", crr=0.3, thrust=thrust))
    data = r.json()
    assert data["finished"] is False and data["time_s"] is None


def test_invalid_inputs_rejected_with_reason() -> None:
    bad = {"t_s": [0, 1, 2], "force_n": [1, 1], "provenance": "estimated", "source": "x"}
    r = client.post("/v1/race/simulate", json=body(thrust=bad))
    assert r.status_code == 422
    assert "same length" in r.text
    assert client.post("/v1/race/simulate", json=body(mass_kg=-1)).status_code == 422
    assert client.post("/v1/race/simulate", json=body(extra=1)).status_code == 422


def test_unsorted_thrust_rejected() -> None:
    bad = {"t_s": [0, 2, 1], "force_n": [1, 1, 1], "provenance": "estimated", "source": "x"}
    r = client.post("/v1/race/simulate", json=body(thrust=bad))
    assert r.status_code == 422


def test_montecarlo_endpoint() -> None:
    from fastapi.testclient import TestClient

    from daedalus.api import create_app

    body = {
        "race": {
            "model": "M2",
            "mass_kg": 0.05,
            "track_length_m": 20.0,
            "thrust": {
                "t_s": [0, 0.3],
                "force_n": [8, 8],
                "provenance": "estimated",
                "source": "test",
            },
            "cda_m2": 0.0015,
            "crr": 0.01,
            "input_provenance": "estimated",
        },
        "n": 200,
        "seed": 3,
    }
    r = TestClient(create_app()).post("/v1/race/montecarlo", json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["finish_fraction"] == 1.0 and d["provenance"] == "predicted"
    assert sum(d["histogram"]["counts"]) == 200
    assert d["percentiles_s"]["p5"] < d["percentiles_s"]["p95"]
    assert d["sensitivity"]["thrust"] < 0
    assert d["trajectory_band"] is None

    body["trajectory_band"] = True
    r = TestClient(create_app()).post("/v1/race/montecarlo", json=body)
    assert r.status_code == 200, r.text
    band = r.json()["trajectory_band"]
    assert len(band["time_s"]) == len(band["p5"]) == len(band["p50"]) == len(band["p95"]) == 200
    assert band["time_s"][0] == 0.0 and band["time_s"][-1] > 0.5
    assert all(
        lo <= mid <= hi for lo, mid, hi in zip(band["p5"], band["p50"], band["p95"], strict=True)
    )
