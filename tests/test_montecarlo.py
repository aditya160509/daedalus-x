"""Monte Carlo race spread tests."""

import time

import numpy as np
import pytest

from daedalus.dynamics import CarParams, ModelLevel, ThrustCurve, simulate
from daedalus.montecarlo import BAND_POINTS, Uncertainty, race_times, run


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


def test_trajectory_band_is_the_deterministic_velocity_at_zero_uncertainty() -> None:
    car = _car()
    ref = simulate(car, ModelLevel.M2)
    mc = run(car, Uncertainty(mass=0, cda=0, crr=0, thrust=0), n=10, trajectory_band=True)
    band = mc.band
    assert band is not None
    assert band.time_s.size == BAND_POINTS
    assert band.time_s[0] == 0.0
    assert ref.time_s is not None
    assert band.time_s[-1] == pytest.approx(ref.time_s, abs=2e-4)
    # Zero input spread means a zero-width fan: p5 == p50 == p95 everywhere.
    np.testing.assert_allclose(band.p5, band.p50, atol=1e-12)
    np.testing.assert_allclose(band.p95, band.p50, atol=1e-12)
    expected = np.interp(band.time_s, ref.t, ref.v)
    np.testing.assert_allclose(band.p50, expected, atol=2e-3)


def test_trajectory_band_orders_percentiles_and_is_absent_by_default() -> None:
    car = _car()
    assert run(car, Uncertainty(), n=50, seed=2).band is None
    band = run(car, Uncertainty(), n=200, seed=2, trajectory_band=True).band
    assert band is not None
    assert np.all(band.p5 <= band.p50 + 1e-12)
    assert np.all(band.p50 <= band.p95 + 1e-12)
    assert np.all(np.diff(band.time_s) > 0)
    assert np.all(band.p95 >= 0)


def test_trajectory_band_runtime_for_1000_samples() -> None:
    start = time.perf_counter()
    run(_car(), Uncertainty(), n=1000, seed=0, trajectory_band=True)
    assert time.perf_counter() - start < 1.2


def test_race_times_accepts_a_different_track_length_per_sample() -> None:
    # Regression: an array track_m crashed when samples crossed the line at different steps.
    thrust = ThrustCurve(np.array([0.0, 0.02, 0.1, 0.4, 0.6]), np.array([0.0, 4.0, 3.0, 1.5, 0.0]))
    ones = np.ones(3)
    tracks = np.array([5.0, 10.0, 20.0])
    together = race_times(
        thrust, ones, ones * 0.05, ones * 4e-4, ones * 0.01, 1.204, tracks, ModelLevel.M2
    )
    alone = [
        race_times(
            thrust,
            ones[:1],
            ones[:1] * 0.05,
            ones[:1] * 4e-4,
            ones[:1] * 0.01,
            1.204,
            t,
            ModelLevel.M2,
        )[0]
        for t in tracks
    ]
    assert np.allclose(together, alone)
    assert np.all(np.diff(together) > 0)


def test_cartridge_spread_and_tether_prior() -> None:
    car = _car()
    fixed = dict(mass=0.0, cda=0.0, crr=0.0, thrust=0.0)
    baseline = run(car, Uncertainty(**fixed), n=40)
    cartridge = run(car, Uncertainty(**fixed, cartridge_mass_half_range_g=0.5), n=40)
    tether = run(car, Uncertainty(**fixed, tether_force_scale_n=0.01), n=40)
    assert cartridge.std_s is not None and cartridge.std_s > 0
    assert cartridge.sensitivity["cartridge_mass"] > 0.9
    assert tether.mean_s is not None and baseline.mean_s is not None
    assert tether.mean_s > baseline.mean_s
    assert tether.sensitivity["tether_force"] > 0.9


def test_gas_release_matches_analytic_constant_thrust_burn() -> None:
    from daedalus.montecarlo import _integrate

    thrust = ThrustCurve.constant(1.0, 0.5)
    times, v = _integrate(
        thrust,
        np.ones(1),
        np.array([0.06]),
        np.zeros(1),
        np.zeros(1),
        1.2,
        20.0,
        ModelLevel.M1,
        np.array([0.5, 1.0]),
        gas_kg=0.008,
    )
    expected_v = (0.5 / 0.008) * np.log(0.06 / 0.052)
    assert times[0] > 0.5
    assert v[0] == pytest.approx([expected_v, expected_v], rel=1e-8)
