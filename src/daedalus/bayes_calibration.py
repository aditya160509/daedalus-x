"""Bayesian calibration (T17): what the measured runs have and have not taught the model.

`calibration.fit` returns one best-fit (CdA, Crr, thrust scale) with bootstrap intervals. This
module returns the joint posterior instead, with a model-offset term and extra run-to-run noise,
and reports for each parameter how far the runs moved it from its prior (`information_gain`).
That number is the honest answer to "did the runs measure CdA?": with finish times alone it is
usually close to zero for CdA and Crr, as the test planner (T23) predicts.

The posterior is found by adaptive importance sampling on TITAN M2 through the vectorised
`montecarlo.race_times`, is reproducible from its seed, and reports its effective sample size.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from daedalus.calibration import MeasuredRun
from daedalus.dynamics import ModelLevel, ThrustCurve
from daedalus.montecarlo import race_times

FloatArray = NDArray[np.float64]
NAMES = ("cda_m2", "crr", "thrust_scale")
LOG_2PI = float(np.log(2 * np.pi))


class BayesCalibrationError(ValueError):
    """Raised when runs or priors cannot define a posterior."""


@dataclass(frozen=True)
class Priors:
    """Log-normal priors (median and sd of the natural log) and the noise and offset priors."""

    cda_m2: float
    crr: float
    thrust_scale: float = 1.0
    relative_sd: float = 0.3
    extra_noise_scale_s: float = 0.01  # half-normal scale on noise beyond each run's sigma_s
    offset_sd_s: float = 0.02  # normal prior on a constant model-vs-car offset

    def __post_init__(self) -> None:
        if min(self.cda_m2, self.crr, self.thrust_scale) <= 0:
            raise BayesCalibrationError("prior medians must be positive")
        if min(self.relative_sd, self.extra_noise_scale_s, self.offset_sd_s) <= 0:
            raise BayesCalibrationError("prior spreads must be positive")


@dataclass(frozen=True)
class Summary:
    median: float
    p05: float
    p95: float
    information_gain: float | None  # 1 - posterior var / prior var, for log-parameters and offset


@dataclass(frozen=True)
class Posterior:
    draws: dict[str, FloatArray]  # cda_m2, crr, thrust_scale, extra_noise_s, offset_s
    summaries: dict[str, Summary]
    effective_sample_size: float
    seed: int
    warnings: tuple[str, ...]

    def predict(
        self,
        thrust: ThrustCurve,
        *,
        track_m: float,
        mass_kg: float,
        rho_kg_m3: float = 1.204,
        sigma_s: float = 0.0,
        seed: int = 0,
    ) -> FloatArray:
        """Posterior predictive finish times for a new run, including offset and noise."""
        d = self.draws
        n = d["cda_m2"].size
        t = race_times(
            thrust,
            d["thrust_scale"],
            np.full(n, mass_kg),
            d["cda_m2"],
            d["crr"],
            rho_kg_m3,
            track_m,
            ModelLevel.M2,
            1e-3,
        )
        if not np.all(np.isfinite(t)):
            raise BayesCalibrationError("some posterior cars do not finish this run")
        noise = np.sqrt(d["extra_noise_s"] ** 2 + sigma_s**2)
        rng = np.random.default_rng(seed)
        return np.asarray(t + d["offset_s"] + rng.normal(size=n) * noise, dtype=np.float64)

    def density_curves(self, priors: Priors) -> dict[str, list[tuple[float, float, float]]]:
        """Analytic prior and posterior histogram densities on shared bins."""
        from scipy.stats import halfnorm, lognorm, norm

        distributions = {
            name: lognorm(priors.relative_sd, scale=getattr(priors, name)) for name in NAMES
        }
        distributions["extra_noise_s"] = halfnorm(scale=priors.extra_noise_scale_s)
        distributions["offset_s"] = norm(scale=priors.offset_sd_s)
        curves = {}
        for name, distribution in distributions.items():
            posterior = self.draws[name]
            lo = min(float(distribution.ppf(0.001)), float(posterior.min()))
            hi = max(float(distribution.ppf(0.999)), float(posterior.max()))
            edges = np.linspace(lo, hi, 41)
            counts, _ = np.histogram(posterior, bins=edges)
            widths = np.diff(edges)
            centers = (edges[:-1] + edges[1:]) / 2
            prior = np.diff(distribution.cdf(edges)) / widths
            density = counts / (posterior.size * widths)
            curves[name] = [
                (float(x), float(a), float(b))
                for x, a, b in zip(centers, prior, density, strict=True)
            ]
        return curves

    def to_mapping(self) -> dict[str, object]:
        return {
            "summaries": {k: vars(v) for k, v in self.summaries.items()},
            "effective_sample_size": self.effective_sample_size,
            "seed": self.seed,
            "warnings": list(self.warnings),
        }


class _Problem:
    def __init__(
        self, runs: Sequence[MeasuredRun], thrust: ThrustCurve, priors: Priors, rho: float
    ) -> None:
        if not runs:
            raise BayesCalibrationError("need at least one measured run")
        self.thrust, self.priors, self.rho = thrust, priors, rho
        self.y = np.array([r.time_s for r in runs])
        self.sig = np.array([r.sigma_s for r in runs])
        self.track = np.array([r.track_m for r in runs])
        self.mass = np.array([r.mass_kg for r in runs])
        self.mu = np.log([priors.cda_m2, priors.crr, priors.thrust_scale])
        self.dim = 5  # ln cda, ln crr, ln thrust, ln extra noise, offset

    def sample_prior(self, n: int, rng: np.random.Generator) -> FloatArray:
        p = self.priors
        z = np.empty((n, self.dim))
        z[:, :3] = self.mu + p.relative_sd * rng.normal(size=(n, 3))
        z[:, 3] = np.log(np.maximum(np.abs(rng.normal(0, p.extra_noise_scale_s, n)), 1e-9))
        z[:, 4] = rng.normal(0, p.offset_sd_s, n)
        return z

    def log_prior(self, z: FloatArray) -> FloatArray:
        p = self.priors
        s = p.relative_sd
        out = -0.5 * np.sum(((z[:, :3] - self.mu) / s) ** 2 + LOG_2PI, axis=1) - 3 * np.log(s)
        noise = np.exp(z[:, 3])
        out = out + 0.5 * np.log(2 / np.pi) - np.log(p.extra_noise_scale_s)
        out = out - 0.5 * (noise / p.extra_noise_scale_s) ** 2 + z[:, 3]
        out = out - 0.5 * (z[:, 4] / p.offset_sd_s) ** 2 - 0.5 * LOG_2PI - np.log(p.offset_sd_s)
        return np.asarray(out, dtype=np.float64)

    def log_likelihood(self, z: FloatArray) -> FloatArray:
        n, k = z.shape[0], self.y.size
        rep = np.repeat
        t = race_times(
            self.thrust,
            rep(np.exp(z[:, 2]), k),
            np.tile(self.mass, n),
            rep(np.exp(z[:, 0]), k),
            rep(np.exp(z[:, 1]), k),
            self.rho,
            np.tile(self.track, n),
            ModelLevel.M2,
            1e-3,
        ).reshape(n, k)
        var = self.sig**2 + np.exp(z[:, 3])[:, None] ** 2
        resid = self.y - t - z[:, 4][:, None]
        ll = -0.5 * np.sum(resid**2 / var + np.log(var) + LOG_2PI, axis=1)
        return np.where(np.isfinite(ll), ll, -np.inf)


def _normalise(log_w: FloatArray) -> FloatArray:
    if not np.isfinite(log_w).any():
        raise BayesCalibrationError("no sampled car reproduces the runs; check units and priors")
    w = np.exp(log_w - np.max(log_w[np.isfinite(log_w)]))
    w = np.where(np.isfinite(w), w, 0.0)
    return np.asarray(w / w.sum(), dtype=np.float64)


def calibrate(
    runs: Sequence[MeasuredRun],
    thrust: ThrustCurve,
    priors: Priors,
    *,
    rho_kg_m3: float = 1.204,
    particles: int = 3000,
    stages: int = 4,
    draws: int = 3000,
    seed: int = 0,
) -> Posterior:
    """Joint posterior of CdA, Crr, thrust scale, extra noise and a constant offset."""
    if particles < 200 or stages < 1 or draws < 100:
        raise BayesCalibrationError("need particles >= 200, stages >= 1 and draws >= 100")
    prob = _Problem(runs, thrust, priors, rho_kg_m3)
    rng = np.random.default_rng(seed)
    z = prob.sample_prior(particles, rng)
    w = _normalise(prob.log_likelihood(z))
    for stage in range(stages + 1):
        mean = w @ z
        centred = z - mean
        cov = 2.25 * (centred * w[:, None]).T @ centred + 1e-10 * np.eye(prob.dim)
        chol = np.linalg.cholesky(cov)
        count = 3 * particles if stage == stages else particles
        gauss = rng.random(count) < 0.9
        z = prob.sample_prior(count, rng)
        z[gauss] = (mean + rng.normal(size=(count, prob.dim)) @ chol.T)[gauss]
        solved = np.linalg.solve(chol, (z - mean).T).T
        log_g = -0.5 * (np.sum(solved**2, axis=1) + prob.dim * LOG_2PI) - np.sum(
            np.log(np.diag(chol))
        )
        log_q = np.logaddexp(np.log(0.9) + log_g, np.log(0.1) + prob.log_prior(z))
        w = _normalise(prob.log_prior(z) + prob.log_likelihood(z) - log_q)
    ess = float(1.0 / np.sum(w**2))
    chosen = z[rng.choice(z.shape[0], size=draws, p=w)]
    out = {name: np.exp(chosen[:, i]) for i, name in enumerate(NAMES)}
    out["extra_noise_s"] = np.exp(chosen[:, 3])
    out["offset_s"] = chosen[:, 4]
    summaries: dict[str, Summary] = {}
    for i, name in enumerate(NAMES):
        gain = 1 - float(np.var(chosen[:, i])) / priors.relative_sd**2
        summaries[name] = _summary(out[name], max(0.0, gain))
    summaries["extra_noise_s"] = _summary(out["extra_noise_s"], None)
    summaries["offset_s"] = _summary(
        out["offset_s"], max(0.0, 1 - float(np.var(chosen[:, 4])) / priors.offset_sd_s**2)
    )
    warnings = []
    if ess < 200:
        warnings.append(f"effective sample size {ess:.0f}; posterior is approximate")
    unlearned = [n for n in NAMES if (summaries[n].information_gain or 0.0) < 0.5]
    if unlearned:
        warnings.append(f"the runs barely constrain {', '.join(unlearned)}; still prior-dominated")
    return Posterior(out, summaries, ess, seed, tuple(warnings))


def _summary(values: FloatArray, gain: float | None) -> Summary:
    lo, med, hi = np.quantile(values, [0.05, 0.5, 0.95])
    return Summary(float(med), float(lo), float(hi), gain)
