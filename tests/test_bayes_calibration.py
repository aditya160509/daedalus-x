"""Bayesian calibration (T17) on synthetic runs from a known car."""

from __future__ import annotations

import numpy as np
import pytest

from daedalus.bayes_calibration import BayesCalibrationError, Priors, calibrate
from daedalus.calibration import MeasuredRun
from daedalus.dynamics import ModelLevel, ThrustCurve
from daedalus.montecarlo import race_times

THRUST = ThrustCurve(np.array([0.0, 0.02, 0.1, 0.4, 0.6]), np.array([0.0, 4.0, 3.0, 1.5, 0.0]))
TRUTH = {"cda": 4.6e-4, "crr": 0.012, "thrust": 0.93}
PRIORS = Priors(cda_m2=4e-4, crr=0.01, thrust_scale=1.0)


def runs(
    n: int, *, seed: int, offset: float = 0.0, masses=(0.05,), tracks=(20.0,)
) -> list[MeasuredRun]:  # type: ignore[no-untyped-def]
    rng = np.random.default_rng(seed)
    out = []
    for i in range(n):
        m, track = masses[i % len(masses)], tracks[i % len(tracks)]
        t = race_times(
            THRUST,
            np.array([TRUTH["thrust"]]),
            np.array([m]),
            np.array([TRUTH["cda"]]),
            np.array([TRUTH["crr"]]),
            1.204,
            track,
            ModelLevel.M2,
            1e-3,
        )[0]
        out.append(
            MeasuredRun(
                time_s=float(t + offset + rng.normal(0, 0.004)),
                track_m=track,
                sigma_s=0.004,
                mass_kg=m,
            )
        )
    return out


@pytest.fixture(scope="module")
def posterior():  # type: ignore[no-untyped-def]
    return calibrate(runs(8, seed=1), THRUST, PRIORS, particles=800, stages=3, seed=2)


def test_thrust_is_learned_and_covers_the_truth(posterior) -> None:  # type: ignore[no-untyped-def]
    s = posterior.summaries["thrust_scale"]
    assert s.information_gain is not None and s.information_gain > 0.8
    assert s.p05 <= TRUTH["thrust"] <= s.p95


def test_drag_and_rolling_stay_prior_dominated_and_the_posterior_says_so(posterior) -> None:  # type: ignore[no-untyped-def]
    for name in ("cda_m2", "crr"):
        gain = posterior.summaries[name].information_gain
        assert gain is not None and gain < 0.5, name
    assert any("barely constrain" in w for w in posterior.warnings)


def test_posterior_predicts_a_new_run(posterior) -> None:  # type: ignore[no-untyped-def]
    pred = posterior.predict(THRUST, track_m=20.0, mass_kg=0.05, sigma_s=0.004)
    truth = race_times(
        THRUST,
        np.array([0.93]),
        np.array([0.05]),
        np.array([4.6e-4]),
        np.array([0.012]),
        1.204,
        20.0,
        ModelLevel.M2,
        1e-3,
    )[0]
    lo, hi = np.quantile(pred, [0.05, 0.95])
    assert lo <= truth <= hi
    assert hi - lo < 0.05


def test_reproducible_and_exportable() -> None:
    data = runs(3, seed=4)
    a = calibrate(data, THRUST, PRIORS, particles=300, seed=7)
    b = calibrate(data, THRUST, PRIORS, particles=300, seed=7)
    assert np.array_equal(a.draws["thrust_scale"], b.draws["thrust_scale"])
    assert set(a.to_mapping()["summaries"]) >= {"cda_m2", "thrust_scale", "offset_s"}  # type: ignore[arg-type]


def test_validation() -> None:
    with pytest.raises(BayesCalibrationError):
        calibrate([], THRUST, PRIORS)
    with pytest.raises(BayesCalibrationError):
        Priors(cda_m2=-1, crr=0.01)
    with pytest.raises(BayesCalibrationError):
        calibrate(runs(2, seed=1), THRUST, PRIORS, particles=10)
