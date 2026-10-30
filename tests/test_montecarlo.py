"""Monte Carlo race spread tests."""

import numpy as np
import pytest

from daedalus.dynamics import CarParams, ModelLevel, ThrustCurve, simulate
from daedalus.montecarlo import Uncertainty, run


def _car() -> CarParams:
    return CarParams(
        mass_kg=0.05,
        track_length_m=20.0,
        thrust=ThrustCurve.constant(8.0, 0.3),
        cda_m2=0.0015,
        crr=0.01,
    )


def test_zero_uncertainty_reproduces_single_run() -> None:
    car = _car()
    ref = simulate(car, ModelLevel.M2)
    mc = run(car, Uncertainty(mass=0, cda=0, crr=0, thrust=0), n=10)
    assert mc.finish_fraction == 1.0
    assert ref.time_s is not None
    assert mc.std_s == pytest.approx(0.0, abs=1e-12)
    assert mc.mean_s == pytest.approx(ref.time_s, abs=2e-4)
    assert all(v == 0.0 for v in mc.sensitivity.values())


def test_seeded_and_sensible() -> None:
    car = _car()
    a = run(car, Uncertainty(), n=200, seed=7)
    b = run(car, Uncertainty(), n=200, seed=7)
    np.testing.assert_array_equal(a.times_s, b.times_s)
    assert a.percentiles_s["p5"] < a.percentiles_s["p50"] < a.percentiles_s["p95"]
    # More thrust or less mass is faster: negative rank correlation with time.
    assert a.sensitivity["thrust"] < -0.3
    assert a.sensitivity["mass"] > 0


def test_non_finishers_are_counted_not_timed() -> None:
    weak = CarParams(
        mass_kg=0.05,
        track_length_m=20.0,
        thrust=ThrustCurve.constant(0.6, 0.3),
        cda_m2=0.0015,
        crr=0.05,
    )
    mc = run(weak, Uncertainty(thrust=0.3), n=50, seed=1)
    assert 0 <= mc.finish_fraction < 1
    assert mc.times_s.size == round(mc.finish_fraction * 50)


def test_rejects_bad_inputs() -> None:
    with pytest.raises(ValueError):
        Uncertainty(cda=0.6)
    with pytest.raises(ValueError):
        run(_car(), Uncertainty(), n=5)
