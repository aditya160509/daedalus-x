"""Test planner (T23). Thrust curve, nominal parameters and candidates are synthetic."""

from __future__ import annotations

import itertools

import numpy as np
import pytest

from daedalus.dynamics import ThrustCurve
from daedalus.testplan import Condition, Nominal, PlanError, plan_tests, sensitivity

THRUST = ThrustCurve(
    np.array([0.0, 0.02, 0.1, 0.4, 0.6]), np.array([0.0, 4.0, 3.0, 1.5, 0.0])
)  # synthetic
NOMINAL = Nominal(cda_m2=4.0e-4, crr=0.01)
CANDIDATES = (
    Condition(20.0, 0.050),
    Condition(20.0, 0.057),
    Condition(10.0, 0.050),
    Condition(5.0, 0.050),
)


def test_sensitivities_have_the_physical_signs() -> None:
    d_cda, d_crr, d_thrust = sensitivity(THRUST, NOMINAL, Condition(20.0, 0.050))
    assert d_cda > 0  # more drag, slower
    assert d_crr > 0  # more rolling resistance, slower
    assert d_thrust < 0  # more thrust, faster


def test_finish_time_is_far_more_sensitive_to_thrust_than_to_drag_or_rolling() -> None:
    d_cda, d_crr, d_thrust = sensitivity(THRUST, NOMINAL, Condition(20.0, 0.050))
    assert abs(d_thrust) > 10 * abs(d_cda)
    assert abs(d_thrust) > 100 * abs(d_crr)


def test_each_step_reduces_uncertainty_and_gains_do_not_grow() -> None:
    plan = plan_tests(THRUST, NOMINAL, CANDIDATES, budget=4)
    sds = [plan.starting_relative_sd] + [s.relative_sd for s in plan.steps]
    for before, after in itertools.pairwise(sds):
        assert all(after[k] <= before[k] + 1e-12 for k in before)
    gains = [s.information_gain_nats for s in plan.steps]
    assert all(g > 0 for g in gains)
    assert all(b <= a + 1e-9 for a, b in itertools.pairwise(gains))


def test_timing_runs_learn_thrust_but_not_drag_or_rolling() -> None:
    plan = plan_tests(THRUST, NOMINAL, CANDIDATES, budget=4)
    final = plan.steps[-1].relative_sd
    assert final["thrust"] < 0.05 * plan.starting_relative_sd["thrust"]
    assert final["cda"] > 0.8 * plan.starting_relative_sd["cda"]
    assert final["crr"] > 0.95 * plan.starting_relative_sd["crr"]
    assert plan.poorly_identified == ("cda", "crr")


def test_a_test_already_done_is_worth_less_than_a_new_one() -> None:
    done = (Condition(20.0, 0.050),) * 3
    plan = plan_tests(THRUST, NOMINAL, CANDIDATES, done=done, budget=1)
    assert plan.steps[0].condition != Condition(20.0, 0.050)


def test_more_noise_means_less_is_learned() -> None:
    quiet = plan_tests(THRUST, NOMINAL, CANDIDATES, sigma_s=0.002, budget=3)
    noisy = plan_tests(THRUST, NOMINAL, CANDIDATES, sigma_s=0.05, budget=3)
    assert quiet.steps[-1].relative_sd["cda"] < noisy.steps[-1].relative_sd["cda"]


def test_plan_is_deterministic_and_exportable() -> None:
    a = plan_tests(THRUST, NOMINAL, CANDIDATES, budget=3).to_mapping()
    b = plan_tests(THRUST, NOMINAL, CANDIDATES, budget=3).to_mapping()
    assert a == b
    assert len(a["steps"]) == 3  # type: ignore[arg-type]
    assert a["assumptions"]


def test_validation() -> None:
    with pytest.raises(PlanError):
        plan_tests(THRUST, NOMINAL, (), budget=1)
    with pytest.raises(PlanError):
        plan_tests(THRUST, NOMINAL, CANDIDATES, budget=0)
    with pytest.raises(PlanError):
        plan_tests(THRUST, NOMINAL, CANDIDATES, sigma_s=0.0)
    with pytest.raises(PlanError):
        Condition(0.0, 0.05)
    with pytest.raises(PlanError):
        Nominal(cda_m2=-1.0, crr=0.01)
    with pytest.raises(PlanError):
        plan_tests(THRUST, NOMINAL, (Condition(2000.0, 0.05),), budget=1)
