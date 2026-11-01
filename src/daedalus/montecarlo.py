"""Monte Carlo race-time spread (spec §5.2, P2-03).

Each input carries a Gaussian 1-sigma relative uncertainty. Samples are drawn with a fixed
seed so a result is reproducible from its request. Non-finishing samples are counted, never
given a time. Sensitivity is the Spearman rank correlation of each input with race time.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.stats import spearmanr

from daedalus.dynamics import G0, CarParams, ModelLevel, ThrustCurve

BURN_DT_S = 5e-5  # RK4 step during the thrust phase; error < 1e-6 s on race time
BAND_POINTS = 200  # common time grid for the v(t) percentile fan
FloatArray = NDArray[np.float64]
INPUTS = ("mass", "cda", "crr", "thrust")


@dataclass(frozen=True)
class Uncertainty:
    """1-sigma relative uncertainty per input (0.02 = 2%)."""

    mass: float = 0.005
    cda: float = 0.05
    crr: float = 0.2
    thrust: float = 0.05

    def __post_init__(self) -> None:
        for name in INPUTS:
            if not 0 <= getattr(self, name) < 0.5:
                raise ValueError(f"{name} uncertainty must be in [0, 0.5)")


@dataclass(frozen=True)
class TrajectoryBand:
    """Velocity percentiles on one shared time grid; all arrays have BAND_POINTS samples."""

    time_s: FloatArray
    p5: FloatArray
    p50: FloatArray
    p95: FloatArray


@dataclass(frozen=True)
class MonteCarloResult:
    n: int
    seed: int
    times_s: NDArray[np.float64]  # finishing samples only
    finish_fraction: float
    mean_s: float | None
    std_s: float | None
    percentiles_s: dict[str, float]  # p5, p50, p95
    sensitivity: dict[str, float]  # Spearman rho with time; NaN-free, 0 when input fixed
    band: TrajectoryBand | None = None


def run(
    car: CarParams,
    unc: Uncertainty,
    n: int = 500,
    seed: int = 0,
    model: ModelLevel = ModelLevel.M2,
    trajectory_band: bool = False,
) -> MonteCarloResult:
    if car.thrust is None:
        raise ValueError("Monte Carlo needs a thrust curve")
    if callable(car.cda_m2):
        raise ValueError("Monte Carlo needs a constant CdA")
    if not 10 <= n <= 5000:
        raise ValueError("n must be in [10, 5000]")
    rng = np.random.default_rng(seed)
    sigma = np.array([getattr(unc, k) for k in INPUTS])
    # Truncate at 4 sigma below so every factor stays positive.
    factors = np.clip(1.0 + rng.standard_normal((n, len(INPUTS))) * sigma, 0.05, None)

    mass = car.mass_kg * factors[:, 0]
    cda = float(car.cda_m2) * factors[:, 1]
    crr = car.crr * factors[:, 2]
    times = race_times(
        car.thrust, factors[:, 3], mass, cda, crr, car.rho_kg_m3, car.track_length_m, model
    )

    ok = np.isfinite(times)
    t = times[ok]
    sens: dict[str, float] = {}
    for j, k in enumerate(INPUTS):
        if sigma[j] == 0 or t.size < 3:
            sens[k] = 0.0
            continue
        rho = float(spearmanr(factors[ok, j], t).statistic)
        sens[k] = 0.0 if not np.isfinite(rho) else rho
    pct = (
        dict(
            zip(
                ("p5", "p50", "p95"), (float(x) for x in np.percentile(t, [5, 50, 95])), strict=True
            )
        )
        if t.size
        else {}
    )
    band = (
        _velocity_band(
            car.thrust, factors[:, 3], mass, cda, crr, car.rho_kg_m3, car.track_length_m, model, t
        )
        if trajectory_band
        else None
    )
    return MonteCarloResult(
        n=n,
        seed=seed,
        times_s=t,
        finish_fraction=float(ok.mean()),
        mean_s=float(t.mean()) if t.size else None,
        std_s=float(t.std(ddof=1)) if t.size > 1 else None,
        percentiles_s=pct,
        sensitivity=sens,
        band=band,
    )


def _velocity_band(
    thrust: ThrustCurve,
    thrust_scale: FloatArray,
    mass: FloatArray,
    cda: FloatArray,
    crr: FloatArray,
    rho: float,
    track_m: float,
    model: ModelLevel,
    times: FloatArray,
) -> TrajectoryBand:
    """v(t) percentiles across samples on a common grid from 0 to the slowest finish.

    The grid ends at the slowest finishing sample. Samples that cross the line earlier keep
    coasting on the same analytic solution, so every sample has a velocity at every grid time.
    """
    finite = times[np.isfinite(times)]
    end = float(finite.max()) if finite.size else thrust.burn_end_s
    grid = np.linspace(0.0, end, BAND_POINTS)
    velocities = velocity_trajectory(
        thrust, thrust_scale, mass, cda, crr, rho, track_m, model, grid
    )
    p5, p50, p95 = np.percentile(velocities, [5, 50, 95], axis=0)
    return TrajectoryBand(time_s=grid, p5=p5, p50=p50, p95=p95)


def race_times(
    thrust: ThrustCurve,
    thrust_scale: FloatArray,
    mass: FloatArray,
    cda: FloatArray,
    crr: FloatArray,
    rho: float,
    track_m: float,
    model: ModelLevel = ModelLevel.M2,
) -> FloatArray:
    """Race time for every sample at once; NaN for a non-finish.

    The burn phase is integrated with fixed-step RK4 across all samples together. After
    burnout the motion  dv/dt = -(a v^2 + b)  has an exact solution, so the coast phase and
    the finish crossing are evaluated in closed form instead of stepped.
    """
    times, _ = _integrate(thrust, thrust_scale, mass, cda, crr, rho, track_m, model)
    return times


def velocity_trajectory(
    thrust: ThrustCurve,
    thrust_scale: FloatArray,
    mass: FloatArray,
    cda: FloatArray,
    crr: FloatArray,
    rho: float,
    track_m: float,
    model: ModelLevel,
    record_times: FloatArray,
) -> FloatArray:
    """Velocity of every sample at `record_times`, shape (n_samples, record_times.size).

    Reuses the same RK4 burn integration as `race_times`; the coast phase is analytic.
    """
    _, velocities = _integrate(
        thrust, thrust_scale, mass, cda, crr, rho, track_m, model, record_times
    )
    return velocities


def _integrate(
    thrust: ThrustCurve,
    thrust_scale: FloatArray,
    mass: FloatArray,
    cda: FloatArray,
    crr: FloatArray,
    rho: float,
    track_m: float,
    model: ModelLevel,
    record_times: FloatArray | None = None,
) -> tuple[FloatArray, FloatArray]:
    losses = model is ModelLevel.M2
    a = 0.5 * rho * cda / mass if losses else np.zeros_like(mass)
    b = crr * G0 if losses else np.zeros_like(mass)
    n = mass.size
    x, v = np.zeros(n), np.zeros(n)
    t_fin = np.full(n, np.nan)

    t_end = thrust.burn_end_s
    steps = max(1, int(np.ceil(t_end / BURN_DT_S)))
    h = t_end / steps
    # Thrust per unit mass is sampled once on the RK4 half-step grid (index 2*i + j).
    grid = np.linspace(0.0, t_end, 2 * steps + 1)
    thrust_grid = np.interp(grid, thrust.t_s, thrust.force_n, left=0.0, right=0.0)
    per_mass = thrust_scale / mass

    if record_times is None:
        record_times = np.zeros(0)
    v_grid = np.zeros((n, record_times.size))
    # Each record time belongs to one RK4 step; frac is its position inside that step.
    step_idx = np.clip((record_times / h).astype(int), 0, steps - 1)
    frac = np.clip((record_times - step_idx * h) / h, 0.0, 1.0)
    in_burn = record_times <= t_end

    def accel(k: int, v_: FloatArray) -> FloatArray:
        f = thrust_grid[k] * per_mass
        loss = a * v_ * v_ + np.where(v_ > 0, b, 0.0)
        acc = f - loss
        return np.where((v_ <= 0) & (acc < 0), 0.0, acc)

    for i in range(steps):
        t = i * h
        k1v = accel(2 * i, v)
        k1x = v
        k2v = accel(2 * i + 1, v + h / 2 * k1v)
        k2x = v + h / 2 * k1v
        k3v = accel(2 * i + 1, v + h / 2 * k2v)
        k3x = v + h / 2 * k2v
        k4v = accel(2 * i + 2, v + h * k3v)
        k4x = v + h * k3v
        x_new = x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x)
        v_new = np.maximum(v + h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v), 0.0)
        crossed = np.isnan(t_fin) & (x_new >= track_m)
        if crossed.any():
            # Cubic Hermite would be marginally better; linear is < 1e-9 s at this step.
            frac_finish = (track_m - x[crossed]) / (x_new[crossed] - x[crossed])
            t_fin[crossed] = t + frac_finish * h
        if record_times.size:
            here = in_burn & (step_idx == i)
            if here.any():
                v_grid[:, here] = v[:, None] + frac[None, here] * (v_new - v)[:, None]
        x, v = x_new, v_new

    beyond = np.flatnonzero(record_times > t_end)
    for j in beyond:
        v_grid[:, j] = _coast_velocity(v, a, b, float(record_times[j] - t_end))

    todo = np.isnan(t_fin)
    d = track_m - x[todo]
    t_fin[todo] = t_end + _coast_time(v[todo], a[todo], b[todo], d)
    return t_fin, v_grid


def _coast_velocity(v0: FloatArray, a: FloatArray, b: FloatArray, dt: float) -> FloatArray:
    """Speed dt seconds after burnout under dv/dt = -(a v^2 + b); 0 once the car stops."""
    out = np.zeros_like(v0)
    eps = 1e-14
    moving = v0 > 0

    m = moving & (a > eps) & (b > eps)
    if m.any():
        phase = np.arctan(v0[m] * np.sqrt(a[m] / b[m])) - np.sqrt(a[m] * b[m]) * dt
        out[m] = np.where(phase > 0, np.sqrt(b[m] / a[m]) * np.tan(np.maximum(phase, 0.0)), 0.0)

    m = moving & (a > eps) & (b <= eps)
    if m.any():
        out[m] = v0[m] / (1.0 + a[m] * v0[m] * dt)

    m = moving & (a <= eps)
    if m.any():
        out[m] = np.maximum(v0[m] - b[m] * dt, 0.0)

    return out


def _coast_time(v0: FloatArray, a: FloatArray, b: FloatArray, d: FloatArray) -> FloatArray:
    """Time to cover distance d from speed v0 under dv/dt = -(a v^2 + b); NaN if it stops first."""
    out = np.full(v0.size, np.nan)
    eps = 1e-14
    moving = v0 > 0

    # a > 0, b > 0: v = sqrt(b/a) tan(th0 - w t), x = ln(cos(th0 - w t)/cos th0) / a
    m = moving & (a > eps) & (b > eps)
    if m.any():
        w = np.sqrt(a[m] * b[m])
        th0 = np.arctan(v0[m] * np.sqrt(a[m] / b[m]))
        c = np.cos(th0) * np.exp(a[m] * d[m])
        ok = c <= 1.0
        res = np.full(w.size, np.nan)
        res[ok] = (th0[ok] - np.arccos(c[ok])) / w[ok]
        out[m] = res

    # b = 0: v = v0 / (1 + a v0 t), x = ln(1 + a v0 t) / a  (never stops)
    m = moving & (a > eps) & (b <= eps)
    if m.any():
        out[m] = np.expm1(a[m] * d[m]) / (a[m] * v0[m])

    # a = 0: constant deceleration b (or none)
    m = moving & (a <= eps)
    if m.any():
        bb = b[m]
        disc = v0[m] ** 2 - 2 * bb * d[m]
        res = np.full(bb.size, np.nan)
        nob = bb <= eps
        res[nob] = d[m][nob] / v0[m][nob]
        dec = ~nob & (disc >= 0)
        res[dec] = (v0[m][dec] - np.sqrt(disc[dec])) / bb[dec]
        out[m] = res

    out[d <= 0] = 0.0
    return out
