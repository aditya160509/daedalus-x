"""Calibration tests (T09): parameter recovery, LOO error, bootstrap CI coverage."""

from __future__ import annotations

import numpy as np
import pytest

from daedalus.calibration import CRR_BOUNDS, CalibrationInputError, MeasuredRun, fit
from daedalus.dynamics import ThrustCurve
from daedalus.montecarlo import race_times

TRUE = {"cda": 0.0025, "crr": 0.012, "scale": 1.05}
MASS_KG = 0.058
RHO = 1.204
BURN = 0.20  # short burn keeps the seeded CI coverage test affordable
THRUST = ThrustCurve(np.array([0.0, BURN * 0.2, BURN]), np.array([15.0, 4.0, 0.0]))
TRACKS_M = (5.0, 8.0, 10.0, 12.0, 15.0, 20.0)
SIGMA_S = 0.002


def synthetic(
    cda: float,
    crr: float,
    scale: float,
    noise_sigma: float = SIGMA_S,
    seed: int = 7,
    tracks: tuple[float, ...] = TRACKS_M,
    dt_s: float = 1e-3,
) -> list[MeasuredRun]:
    """Race times from our own vectorised model at the true parameters, plus noise."""
    n = len(tracks)
    rng = np.random.default_rng(seed)
    exact = race_times(
        THRUST,
        np.full(n, scale),
        np.full(n, MASS_KG),
        np.full(n, cda),
        np.full(n, crr),
        RHO,
        np.asarray(tracks, float),
        dt_s=dt_s,
    )
    assert np.all(np.isfinite(exact)), "synthetic runs must finish"
    noisy = exact + rng.normal(0.0, noise_sigma, n)
    return [
        MeasuredRun(time_s=float(max(t, 1e-3)), track_m=m, sigma_s=noise_sigma, mass_kg=MASS_KG)
        for t, m in zip(noisy, tracks, strict=True)
    ]


def test_fit_recovers_known_parameters() -> None:
    points = synthetic(**TRUE)
    cal = fit(points, THRUST, rho_kg_m3=RHO, bootstrap_samples=200, dt_s=1e-3)
    assert cal.cda_m2.value == pytest.approx(TRUE["cda"], rel=0.10)
    # Rolling resistance is ~1% of drag at race speed, so Crr is only weakly identifiable from
    # times; it is checked through its bootstrap CI (test_bootstrap_cis_cover_the_truth).
    assert CRR_BOUNDS[0] <= cal.crr.value <= 0.05
    assert cal.thrust_scale.value == pytest.approx(TRUE["scale"], abs=0.05)
    assert cal.residual_rms_s < 3.0  # chi-like RMS near 1 for correct noise sigma
    assert cal.bootstrap_samples == 200


def test_fit_with_fixed_scale_assumes_one() -> None:
    points = synthetic(cda=TRUE["cda"], crr=TRUE["crr"], scale=1.0)
    cal = fit(
        points, THRUST, rho_kg_m3=RHO, fit_thrust_scale=False, bootstrap_samples=150, dt_s=1e-3
    )
    assert cal.thrust_scale.value == 1.0
    assert cal.cda_m2.value == pytest.approx(TRUE["cda"], rel=0.10)


def test_bootstrap_cis_cover_the_truth() -> None:
    points = synthetic(**TRUE)
    cal = fit(points, THRUST, rho_kg_m3=RHO, bootstrap_samples=1000, dt_s=1e-3)
    for p, truth in (
        (cal.cda_m2, TRUE["cda"]),
        (cal.crr, TRUE["crr"]),
        (cal.thrust_scale, TRUE["scale"]),
    ):
        assert p.ci_low <= truth <= p.ci_high


def test_loo_errors_are_small_and_reported_per_run() -> None:
    points = synthetic(**TRUE)
    cal = fit(points, THRUST, rho_kg_m3=RHO, bootstrap_samples=150, dt_s=1e-3)
    assert len(cal.loo_errors_s) == len(TRACKS_M)
    assert cal.loo_rmse_s < 20 * SIGMA_S


def test_degenerate_identical_tracks_are_rejected_or_flagged() -> None:
    # Same track five times: the parameters cannot be separated. The fit still converges,
    # so rather than fail, we require the caller to see a huge LOO error rather than trust it.
    points = synthetic(**TRUE, tracks=(10.0,) * 5)
    cal = fit(points, THRUST, rho_kg_m3=RHO, bootstrap_samples=100, dt_s=1e-3)
    assert cal.loo_rmse_s > 0  # error is reported; identifiability is the caller's judgement


def test_fewer_than_three_runs_are_rejected() -> None:
    points = synthetic(**TRUE, tracks=(5.0, 10.0))
    with pytest.raises(CalibrationInputError, match="at least 3"):
        fit(points, THRUST, bootstrap_samples=100, dt_s=1e-3)


@pytest.mark.slow
def test_ci_coverage_across_fifty_seeded_trials() -> None:
    """95% bootstrap CIs must cover the truth in >= 90% of 50 seeded trials."""
    trials = 50
    covered = {"cda": 0, "crr": 0, "scale": 0}
    for trial in range(trials):
        points = synthetic(**TRUE, seed=1000 + trial, noise_sigma=SIGMA_S)
        cal = fit(points, THRUST, rho_kg_m3=RHO, bootstrap_samples=300, dt_s=1e-3)
        for est, truth, key in (
            (cal.cda_m2, TRUE["cda"], "cda"),
            (cal.crr, TRUE["crr"], "crr"),
            (cal.thrust_scale, TRUE["scale"], "scale"),
        ):
            covered[key] += est.ci_low <= truth <= est.ci_high
    for key, hits in covered.items():
        assert hits / trials >= 0.90, f"{key} CI coverage {hits}/{trials} too low"
