"""Reference tests for TITAN dynamics against analytic solutions (spec §5.4)."""

import math

import numpy as np
import pytest

from daedalus.dynamics import (
    G0,
    CarParams,
    ModelLevel,
    SolverSettings,
    ThrustCurve,
    simulate,
)

TOL_S = 1e-6  # time tolerance against analytic answers


def test_m0_constant_acceleration() -> None:
    car = CarParams(mass_kg=0.05, track_length_m=20.0, constant_accel_m_s2=40.0)
    res = simulate(car, ModelLevel.M0)
    assert res.time_s == pytest.approx(math.sqrt(2 * 20 / 40), abs=1e-12)


def test_m1_constant_thrust_no_losses() -> None:
    car = CarParams(0.05, 20.0, thrust=ThrustCurve.constant(2.0, 2.0))
    res = simulate(car, ModelLevel.M1)
    assert res.finished
    assert res.time_s == pytest.approx(math.sqrt(2 * 20 * 0.05 / 2.0), abs=TOL_S)


def test_m1_ignores_losses_even_if_given() -> None:
    car = CarParams(0.05, 20.0, thrust=ThrustCurve.constant(2.0, 2.0), cda_m2=1e-3, crr=0.05)
    assert simulate(car, ModelLevel.M1).time_s == pytest.approx(1.0, abs=TOL_S)


def test_m2_quadratic_drag_constant_thrust() -> None:
    m, f, d, cda, rho = 0.05, 2.0, 20.0, 2e-3, 1.204
    k = 0.5 * rho * cda
    expected = m / math.sqrt(f * k) * math.acosh(math.exp(d * k / m))
    car = CarParams(m, d, thrust=ThrustCurve.constant(f, 3.0), cda_m2=cda, rho_kg_m3=rho)
    assert simulate(car, ModelLevel.M2).time_s == pytest.approx(expected, abs=TOL_S)


def test_m2_burn_then_constant_rolling_deceleration() -> None:
    m, f, tb, crr, d = 0.05, 4.0, 0.3, 0.1, 20.0
    a1 = (f - crr * m * G0) / m
    x1, v1, a2 = 0.5 * a1 * tb**2, a1 * tb, -crr * G0
    rem = d - x1
    t2 = (-v1 + math.sqrt(v1**2 + 2 * a2 * rem)) / a2
    car = CarParams(m, d, thrust=ThrustCurve.constant(f, tb), crr=crr)
    assert simulate(car, ModelLevel.M2).time_s == pytest.approx(tb + t2, abs=TOL_S)


def test_non_finish_is_reported_not_given_a_time() -> None:
    car = CarParams(0.05, 20.0, thrust=ThrustCurve.constant(0.5, 0.05), crr=0.3)
    res = simulate(car, ModelLevel.M2)
    assert not res.finished
    assert res.time_s is None
    assert res.stop_reason == "stopped_before_finish"


def test_callable_cda_matches_constant() -> None:
    base = dict(mass_kg=0.05, track_length_m=20.0, thrust=ThrustCurve.constant(2.0, 3.0))
    a = simulate(CarParams(**base, cda_m2=2e-3))  # type: ignore[arg-type]
    b = simulate(CarParams(**base, cda_m2=lambda v: 2e-3))  # type: ignore[arg-type]
    assert a.time_s == pytest.approx(b.time_s, abs=1e-12)


def test_step_size_convergence() -> None:
    car = CarParams(
        0.05,
        20.0,
        thrust=ThrustCurve(np.array([0.0, 0.05, 0.3, 0.5]), np.array([0.0, 6.0, 2.0, 0.0])),
        cda_m2=2e-3,
        crr=0.02,
    )
    coarse = simulate(car, settings=SolverSettings(max_step_s=1e-3))
    fine = simulate(car, settings=SolverSettings(max_step_s=1e-4))
    assert coarse.time_s is not None and fine.time_s is not None
    assert coarse.time_s == pytest.approx(fine.time_s, abs=1e-7)


def test_force_terms_reported() -> None:
    car = CarParams(0.05, 20.0, thrust=ThrustCurve.constant(2.0, 3.0), cda_m2=2e-3, crr=0.02)
    res = simulate(car)
    assert set(res.force_terms) == {"thrust_n", "drag_n", "rolling_n"}
    assert res.force_terms["drag_n"].shape == res.t.shape
    assert res.peak_speed_m_s > 0


@pytest.mark.parametrize(
    ("t", "f"),
    [([0.0], [1.0]), ([0.0, 0.0], [1.0, 1.0]), ([0.0, 1.0], [1.0, -1.0])],
)
def test_thrust_curve_validation(t: list[float], f: list[float]) -> None:
    with pytest.raises(ValueError):
        ThrustCurve(np.array(t), np.array(f))


def test_m1_requires_thrust() -> None:
    with pytest.raises(ValueError):
        simulate(CarParams(0.05, 20.0), ModelLevel.M1)
