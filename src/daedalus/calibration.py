"""Maximum-likelihood calibration of TITAN parameters from measured race times (spec §6.3, P2-02).

Gaussian measurement noise turns the fit into weighted least squares, solved with SciPy
`least_squares` (trf, bounded). The fitted parameters are CdA, Crr and — when the data can
support it — a thrust scale. Predictions reuse the vectorised `montecarlo.race_times`, so a
fit over n runs costs one RK4 pass per residual evaluation; a coarser step (`dt_s`) keeps
seeded bootstrap refits affordable at the cost of milliseconds of integration accuracy.

Parameter identifiability needs *varied* tracks: from identical races the three parameters
are nearly degenerate, so callers should pass runs over at least three distinct distances.
Leave-one-out prediction error and the residual RMS are reported so a bad fit is visible,
never silently accepted. The result is a new `Model` record (kind `titan`, config pinned);
storing it is the caller's job and it never overwrites an earlier model.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import partial
from typing import cast

import numpy as np
from numpy.typing import NDArray
from pydantic import BaseModel, ConfigDict, Field
from scipy.optimize import least_squares

from daedalus import contracts as c
from daedalus import montecarlo
from daedalus.dynamics import ModelLevel, ThrustCurve
from daedalus.store import sha256_of

FloatArray = NDArray[np.float64]

# Physical bounds; the same limits the race API enforces at predict time.
CDA_BOUNDS = (1e-6, 0.05)
CRR_BOUNDS = (0.0, 1.0)
SCALE_BOUNDS = (0.05, 5.0)
DNF_PENALTY_S = 1e3  # residual weight for a predicted non-finish

BOOTSTRAP_LEVEL = 0.95


class CalibrationInputError(ValueError):
    """Raised when the measured runs cannot define a calibration."""


@dataclass(frozen=True)
class ThrustSpec:
    """A thrust curve exactly as the fit consumed it, for deterministic hashing."""

    t_s: tuple[float, ...]
    force_n: tuple[float, ...]


def canonical_training_bytes(points: list[dict[str, float]], curve: ThrustSpec) -> bytes:
    """Deterministic serialisation of exactly what the fit saw; hashed into the Model record."""
    body = {
        "model": "titan",
        "points": sorted(points, key=lambda p: json.dumps(p, sort_keys=True)),
        "thrust": {"t_s": list(curve.t_s), "force_n": list(curve.force_n)},
    }
    return json.dumps(body, sort_keys=True, allow_nan=False).encode()


class MeasuredRun(BaseModel):
    """One measured race run: finish time, its track and timing noise."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    time_s: float = Field(gt=0)
    track_m: float = Field(gt=0, le=100)
    sigma_s: float = Field(default=0.01, gt=0, le=1.0)
    mass_kg: float = Field(gt=0, le=1)
    reaction_s: float | None = Field(default=None, ge=0)


@dataclass(frozen=True)
class ParameterFit:
    name: str
    value: float
    unit: str
    ci_low: float
    ci_high: float


@dataclass(frozen=True)
class Calibration:
    cda_m2: ParameterFit
    crr: ParameterFit
    thrust_scale: ParameterFit
    residual_rms_s: float
    loo_errors_s: tuple[float, ...]
    loo_rmse_s: float
    n_runs: int
    bootstrap_samples: int
    bootstrap_failed: int
    bootstrap_level: float
    training_data_hash: str

    def to_model(self, *, domain: str = "TITAN M2 race time") -> c.Model:
        """A new append-only Model record; the caller adds it to the store."""
        config: dict[str, str | float | int | bool] = {
            "cda_m2": self.cda_m2.value,
            "crr": self.crr.value,
            "thrust_scale": self.thrust_scale.value,
            "ci_low_cda_m2": self.cda_m2.ci_low,
            "ci_high_cda_m2": self.cda_m2.ci_high,
            "ci_low_crr": self.crr.ci_low,
            "ci_high_crr": self.crr.ci_high,
            "ci_low_thrust_scale": self.thrust_scale.ci_low,
            "ci_high_thrust_scale": self.thrust_scale.ci_high,
            "residual_rms_s": self.residual_rms_s,
            "loo_rmse_s": self.loo_rmse_s,
            "n_runs": self.n_runs,
            "bootstrap_samples": self.bootstrap_samples,
        }
        return c.Model(
            kind="titan",
            training_data_hash=self.training_data_hash,
            config=config,
            domain=domain,
        )


def _predict(
    x: NDArray[np.float64],
    thrust: ThrustCurve,
    mass_kg: float | FloatArray,
    tracks: FloatArray,
    rho: float,
    dt_s: float,
    fit_scale: bool,
) -> FloatArray:
    n = tracks.size
    scale = np.full(n, x[2]) if fit_scale else np.ones(n)
    masses = np.full(n, mass_kg) if np.isscalar(mass_kg) else np.asarray(mass_kg, float)
    times = montecarlo.race_times(
        thrust,
        scale,
        masses,
        np.full(n, x[0]),
        np.full(n, x[1]),
        rho,
        np.asarray(tracks, float),
        ModelLevel.M2,
        dt_s,
    )
    # A DNF is effectively an infinitely bad prediction under these parameters.
    return np.where(np.isnan(times), DNF_PENALTY_S, times)


def fit(
    points: list[MeasuredRun],
    thrust: ThrustCurve,
    *,
    rho_kg_m3: float = 1.204,
    fit_thrust_scale: bool = True,
    dt_s: float = 1e-3,
    bootstrap_samples: int = 1000,
    max_bootstrap_nfev: int = 60,
    seed: int = 0,
) -> Calibration:
    """Weighted MLE of (CdA, Crr[, thrust scale]) with 95% bootstrap CIs and LOO errors."""
    if len(points) < 3:
        raise CalibrationInputError("calibration needs at least 3 measured runs")
    times = np.array([p.time_s for p in points], float)
    sigmas = np.array([p.sigma_s for p in points], float)
    tracks = np.array([p.track_m for p in points], float)
    masses = np.array([p.mass_kg for p in points], float)
    if np.any(sigmas <= 0):
        raise CalibrationInputError("every sigma_s must be positive")

    def unpack(x: NDArray[np.float64]) -> NDArray[np.float64]:
        return x[:3] if fit_thrust_scale else np.array([x[0], x[1], 1.0])

    def residual(
        x: NDArray[np.float64], tt: FloatArray, ss: FloatArray, ff: NDArray[np.intp] | None
    ) -> FloatArray:
        pred = _predict(
            x,
            thrust,
            masses[ff] if ff is not None else masses,
            tracks[ff] if ff is not None else tracks,
            rho_kg_m3,
            dt_s,
            fit_thrust_scale,
        )
        return (pred - tt) / ss

    bounds = (
        [CDA_BOUNDS[0], CRR_BOUNDS[0]] + ([SCALE_BOUNDS[0]] if fit_thrust_scale else []),
        [CDA_BOUNDS[1], CRR_BOUNDS[1]] + ([SCALE_BOUNDS[1]] if fit_thrust_scale else []),
    )
    x0 = np.array([0.0025, 0.01, 1.0][: (3 if fit_thrust_scale else 2)])
    # Parameters differ by ~3 orders of magnitude; scale steps by their typical size.
    x_scale = np.array([0.001, 0.005, 0.1][: x0.size])

    result = least_squares(
        partial(residual, tt=times, ss=sigmas, ff=None),
        x0,
        bounds=cast("tuple[list[float], list[float]]", bounds),
        method="trf",
        x_scale=x_scale,
        diff_step=1e-4,
        max_nfev=400,
    )
    x_hat = unpack(result.x)
    fitted_times = _predict(x_hat, thrust, masses, tracks, rho_kg_m3, dt_s, fit_thrust_scale)
    residuals = fitted_times - times
    residual_rms = float(np.sqrt(np.mean((residuals / sigmas) ** 2)))

    # Leave-one-out: refit without run i, predict its time back. How well does it generalise?
    loo_errors: list[float] = []
    for i in range(len(points)):
        keep = np.arange(len(points)) != i
        loo = least_squares(
            partial(residual, tt=times[keep], ss=sigmas[keep], ff=np.flatnonzero(keep)),
            x0,
            bounds=cast("tuple[list[float], list[float]]", bounds),
            method="trf",
            x_scale=x_scale,
            diff_step=1e-4,
            max_nfev=200,
        )
        pred = _predict(
            unpack(loo.x),
            thrust,
            masses[i : i + 1],
            tracks[i : i + 1],
            rho_kg_m3,
            dt_s,
            fit_thrust_scale,
        )
        loo_errors.append(float(pred[0] - times[i]))

    # Seeded bootstrap resampling of the measured runs for 95% percentile CIs.
    rng = np.random.default_rng(seed)
    samples: list[NDArray[np.float64]] = []
    failed = 0
    for _ in range(bootstrap_samples):
        idx = rng.integers(0, len(points), len(points))
        try:
            res = least_squares(
                partial(residual, tt=times[idx], ss=sigmas[idx], ff=idx),
                x_hat[: (3 if fit_thrust_scale else 2)],
                bounds=cast("tuple[list[float], list[float]]", bounds),
                method="trf",
                x_scale=x_scale,
                diff_step=1e-4,
                max_nfev=max_bootstrap_nfev,
            )
        except (ValueError, FloatingPointError):
            failed += 1
            continue
        if not res.success or not np.all(np.isfinite(res.x)):
            failed += 1
            continue
        samples.append(res.x)
    if len(samples) < max(30, bootstrap_samples // 10):
        raise CalibrationInputError(
            f"bootstrap collapsed: {len(samples)}/{bootstrap_samples} resamples converged"
        )
    stack = np.vstack(samples)
    lo, hi = (1 - BOOTSTRAP_LEVEL) / 2, 1 - (1 - BOOTSTRAP_LEVEL) / 2
    cis = np.percentile(stack, [100 * lo, 100 * hi], axis=0)

    training_data_hash = sha256_of(
        canonical_training_bytes(
            [p.model_dump(mode="json") for p in points],
            ThrustSpec(
                t_s=tuple(float(t) for t in thrust.t_s),
                force_n=tuple(float(f) for f in thrust.force_n),
            ),
        )
    )

    def est(i: int, unit: str) -> ParameterFit:
        name = ("cda_m2", "crr", "thrust_scale")[i]
        return ParameterFit(
            name=name,
            value=float(x_hat[i]),
            unit=unit,
            ci_low=float(cis[0, i]),
            ci_high=float(cis[1, i]),
        )

    scale_fit = (
        est(2, "dimensionless")
        if fit_thrust_scale
        else ParameterFit("thrust_scale", 1.0, "dimensionless", 1.0, 1.0)
    )
    return Calibration(
        cda_m2=est(0, "m^2"),
        crr=est(1, "dimensionless"),
        thrust_scale=scale_fit,
        residual_rms_s=residual_rms,
        loo_errors_s=tuple(loo_errors),
        loo_rmse_s=float(np.sqrt(np.mean(np.asarray(loo_errors) ** 2))),
        n_runs=len(points),
        bootstrap_samples=len(samples),
        bootstrap_failed=failed,
        bootstrap_level=BOOTSTRAP_LEVEL,
        training_data_hash=training_data_hash,
    )
