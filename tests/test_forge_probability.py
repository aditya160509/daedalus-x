"""T20: manufacturing pass probability from a declared process sigma.

Fixtures are synthetic rule checks; they test the probability model, not the car.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from daedalus import forge
from daedalus.api import app
from daedalus.forge_probability import manufacturing_risk


def check(
    rule_id: str,
    value: float | None,
    *,
    lo: float | None = None,
    hi: float | None = None,
    penalty: str = "10 pts",
    unit: str = "mm",
) -> forge.Check:
    margin = None
    if value is not None:
        margin = min(
            value - lo if lo is not None else float("inf"),
            hi - value if hi is not None else float("inf"),
        )
    return forge.Check(
        rule_id,
        rule_id,
        1,
        unit,
        value,
        lo,
        hi,
        margin,
        "pass_cad_only",
        penalty,
        ("part",),
        "",
    )


def test_boundary_rule_has_half_pass_probability() -> None:
    result = manufacturing_risk([check("A", 0.0, lo=0.0)], sigma_mm=1.0, samples=40_000)
    assert result.rules[0].pass_probability == pytest.approx(0.5, abs=0.015)
    assert result.overall_pass_probability == pytest.approx(0.5, abs=0.015)


def test_flat_penalty_expected_loss_is_rate_times_failure_probability() -> None:
    result = manufacturing_risk([check("A", 0.0, lo=0.0, penalty="10 pts")], sigma_mm=1.0)
    assert result.expected_points_lost == pytest.approx(5.0, abs=0.15)
    assert result.rules[0].expected_points_lost == pytest.approx(5.0, abs=0.15)


def test_proportional_penalty_charges_whole_units_outside_the_limit() -> None:
    # P(X < -1) and P(X < -2) add one and two extra whole millimetres at sigma 0.5.
    result = manufacturing_risk(
        [check("A", 0.0, lo=0.0, penalty="2 pts/mm PP")], sigma_mm=0.5, samples=60_000
    )
    assert result.expected_points_lost == pytest.approx(1.046, abs=0.06)
    assert result.rules[0].expected_points_lost == pytest.approx(1.046, abs=0.06)


def test_independent_rules_multiply_the_overall_pass_probability() -> None:
    checks = [check("A", 0.0, lo=0.0), check("B", 0.0, lo=0.0)]
    result = manufacturing_risk(checks, sigma_mm=1.0, samples=40_000)
    assert result.overall_pass_probability == pytest.approx(0.25, abs=0.02)
    assert result.expected_points_lost == pytest.approx(10.0, abs=0.3)


def test_manual_and_non_millimetre_rules_are_excluded_not_assumed_to_pass() -> None:
    checks = [
        check("A", 0.0, lo=0.0),
        check("MANUAL", None, lo=0.0),
        check("ANGLE", 0.0, lo=-3.0, hi=3.0, unit="deg"),
    ]
    result = manufacturing_risk(checks, sigma_mm=0.5)
    assert [row.rule_id for row in result.rules] == ["A"]
    assert result.excluded_rules == 2

    overridden = manufacturing_risk(checks, sigma_mm=0.5, rule_sigmas={"ANGLE": 0.5})
    assert [row.rule_id for row in overridden.rules] == ["A", "ANGLE"]


def test_unstated_penalty_has_no_expected_points_but_keeps_pass_probability() -> None:
    result = manufacturing_risk(
        [check("A", 0.0, lo=0.0, penalty="not stated in the text")], sigma_mm=1.0
    )
    assert result.rules[0].expected_points_lost is None
    assert result.unquantified_rules == ("A",)
    assert result.expected_points_lost == 0.0


def test_seeded_runs_are_repeatable() -> None:
    checks = [check("A", 0.0, lo=0.0), check("B", 0.0, hi=1.0)]
    first = manufacturing_risk(checks, sigma_mm=0.4, samples=5_000, seed=3)
    second = manufacturing_risk(checks, sigma_mm=0.4, samples=5_000, seed=3)
    assert first == second


def test_unknown_sigma_override_is_rejected() -> None:
    with pytest.raises(ValueError, match="unknown rule"):
        manufacturing_risk([check("A", 0.0, lo=0.0)], sigma_mm=0.1, rule_sigmas={"B": 0.1})


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    design = tmp_path / "designs/car_a"
    design.mkdir(parents=True)
    (design / "geometry.json").write_text(
        json.dumps(
            {
                "source_file": "car.step",
                "source_sha256": "sha256:" + "0" * 64,
                "parts": [
                    {
                        "label": "Main",
                        "group": "body",
                        "bbox_min_m": [0.0, 0.0, 0.003],
                        "bbox_max_m": [0.2, 0.07, 0.05],
                    }
                ],
                "groups": {"body": ["Main"]},
            }
        )
    )
    return TestClient(app)


def test_api_returns_measured_rule_risks(client: TestClient) -> None:
    response = client.post(
        "/v1/forge/pass-probability",
        json={"design": "car_a", "sigma_mm": 0.05, "samples": 4_000},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["revision"] == "stem-racing-india-nf-2025-26"
    assert body["samples"] == 4_000
    assert body["rules"]
    assert all(rule["unit"] == "mm" for rule in body["rules"])
    assert 0.0 <= body["overall_pass_probability"] <= 1.0
    assert body["expected_points_lost"] >= 0.0
    assert body["p95_points_lost"] >= body["expected_points_lost"]
    assert any("not a measured capability" in item for item in body["assumptions"])


def test_api_rejects_zero_sigma_and_unknown_overrides(client: TestClient) -> None:
    assert (
        client.post(
            "/v1/forge/pass-probability",
            json={"design": "car_a", "sigma_mm": 0.0},
        ).status_code
        == 422
    )
    unknown = client.post(
        "/v1/forge/pass-probability",
        json={"design": "car_a", "sigma_mm": 0.05, "rule_sigmas": {"T9.9": 0.1}},
    )
    assert unknown.status_code == 422
    assert "unknown rule" in unknown.json()["detail"]
