"""Race analysis (ORDER 4). Thrust curve and car are synthetic."""

from __future__ import annotations

import numpy as np
import pytest

from daedalus.dynamics import ThrustCurve
from daedalus.raceanalysis import Car, RaceAnalysisError, exchange_rates, time_budget, tornado

THRUST = ThrustCurve(np.array([0.0, 0.02, 0.1, 0.4, 0.6]), np.array([0.0, 4.0, 3.0, 1.5, 0.0]))
CAR = Car(THRUST, mass_kg=0.055, cda_m2=4e-4, crr=0.01)


def test_time_budget_terms_are_positive_and_add_reaction() -> None:
    b = time_budget(CAR, reaction_s=0.2)
    assert b["drag_ms"] > 0 and b["rolling_ms"] > 0 and b["mass_above_minimum_ms"] > 0
    assert b["total_time_ms"] == pytest.approx(b["car_time_ms"] + 200.0)


def test_a_car_at_the_legal_minimum_loses_nothing_to_mass() -> None:
    b = time_budget(Car(THRUST, mass_kg=0.050, cda_m2=4e-4, crr=0.01))
    assert b["mass_above_minimum_ms"] == pytest.approx(0.0, abs=1e-9)


def test_tornado_is_sorted_and_thrust_dominates() -> None:
    rows = tornado(CAR)
    swings = [abs(float(r["high_ms"]) - float(r["low_ms"])) for r in rows]
    assert swings == sorted(swings, reverse=True)
    assert rows[0]["input"] == "thrust"
    by = {r["input"]: r for r in rows}
    assert float(by["cda"]["high_ms"]) > 0 > float(by["cda"]["low_ms"])  # more drag, slower
    assert float(by["thrust"]["high_ms"]) < 0  # more thrust, faster


def test_exchange_rates_have_physical_signs_and_match_the_tornado() -> None:
    x = exchange_rates(CAR)
    assert x["ms_per_gram"] > 0 and x["ms_per_cm2_cda"] > 0 and x["ms_per_0p001_crr"] > 0
    assert x["ms_per_percent_thrust"] < 0
    by = {r["input"]: r for r in tornado(CAR)}
    ten_percent_thrust = float(by["thrust"]["high_ms"])
    assert ten_percent_thrust == pytest.approx(10 * x["ms_per_percent_thrust"], rel=0.2)


def test_bad_inputs_are_rejected() -> None:
    with pytest.raises(RaceAnalysisError):
        Car(THRUST, mass_kg=0.0, cda_m2=4e-4, crr=0.01)
    with pytest.raises(RaceAnalysisError):
        time_budget(CAR, reaction_s=-0.1)
    with pytest.raises(RaceAnalysisError):
        tornado(CAR, relative=0.9)
    weak = Car(ThrustCurve.constant(0.01, 0.05), mass_kg=0.055, cda_m2=4e-4, crr=0.05)
    with pytest.raises(RaceAnalysisError, match="finish"):
        time_budget(weak)


def test_sobol_ranks_thrust_and_returns_sampling_intervals() -> None:
    from daedalus.raceanalysis import sobol_time

    result = sobol_time(CAR)
    rows = result["rows"]
    assert isinstance(rows, list) and len(rows) == 4
    by_name = {row["name"]: row for row in rows}
    assert by_name["thrust"]["total_order"] > by_name["cda"]["total_order"]
    assert all(row["total_order_ci95"] >= 0 for row in rows)
