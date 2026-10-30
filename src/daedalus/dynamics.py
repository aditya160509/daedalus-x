"""TITAN race dynamics, models M0-M2 (spec §5.1, §5.1a).

All inputs and outputs are SI (m, s, kg, N). State is (x, v) along the track:

    m * dv/dt = F_prop(t) - 0.5 * rho * CdA(v) * v**2 - F_roll

The run ends at the official finish distance. A car that stops before the finish is a
non-finish and never gets a travel time.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from enum import StrEnum

import numpy as np
from numpy.typing import NDArray
from scipy.integrate import solve_ivp

G0 = 9.80665  # m/s^2
FloatArray = NDArray[np.float64]


class ModelLevel(StrEnum):
    M0 = "M0"  # constant acceleration
    M1 = "M1"  # time-varying thrust, constant mass, no losses
    M2 = "M2"  # M1 + aerodynamic drag + rolling resistance


@dataclass(frozen=True)
class ThrustCurve:
    """Tabulated thrust; linear interpolation inside, zero outside [t[0], t[-1]]."""

    t_s: FloatArray
    force_n: FloatArray

    def __post_init__(self) -> None:
        if self.t_s.ndim != 1 or self.t_s.shape != self.force_n.shape or self.t_s.size < 2:
            raise ValueError("thrust curve needs matching 1-D arrays with >= 2 samples")
        if np.any(np.diff(self.t_s) <= 0):
            raise ValueError("thrust curve times must be strictly increasing")
        if np.any(self.force_n < 0):
            raise ValueError("thrust must be non-negative")

    @property
    def burn_end_s(self) -> float:
        return float(self.t_s[-1])

    def __call__(self, t: float) -> float:
        if t < self.t_s[0] or t > self.t_s[-1]:
            return 0.0
        return float(np.interp(t, self.t_s, self.force_n))

    @classmethod
    def constant(cls, force_n: float, duration_s: float) -> ThrustCurve:
        return cls(np.array([0.0, duration_s]), np.array([force_n, force_n]))


CdAFunction = Callable[[float], float]


@dataclass(frozen=True)
class CarParams:
    mass_kg: float
    track_length_m: float
    thrust: ThrustCurve | None = None
    cda_m2: float | CdAFunction = 0.0
    crr: float = 0.0  # rolling resistance coefficient (F = crr * m * g while moving)
    rho_kg_m3: float = 1.204
    constant_accel_m_s2: float | None = None  # M0 only

    def __post_init__(self) -> None:
        if self.mass_kg <= 0 or self.track_length_m <= 0:
            raise ValueError("mass and track length must be positive")
        if self.crr < 0 or self.rho_kg_m3 <= 0:
            raise ValueError("crr must be >= 0 and density > 0")

    def cda(self, v: float) -> float:
        return self.cda_m2(v) if callable(self.cda_m2) else self.cda_m2


@dataclass(frozen=True)
class RaceResult:
    model: ModelLevel
    finished: bool
    time_s: float | None  # None when the car does not finish
    t: FloatArray
    x: FloatArray
    v: FloatArray
    peak_speed_m_s: float
    stop_reason: str
    force_terms: dict[str, FloatArray] = field(default_factory=dict)


@dataclass(frozen=True)
class SolverSettings:
    rtol: float = 1e-9
    atol: float = 1e-11
    max_step_s: float = 1e-3
    max_time_s: float = 10.0


def simulate(
    car: CarParams,
    model: ModelLevel = ModelLevel.M2,
    settings: SolverSettings | None = None,
    *,
    force_terms: bool = True,
) -> RaceResult:
    s = settings or SolverSettings()
    if model is ModelLevel.M0:
        return _simulate_m0(car, s)
    if car.thrust is None:
        raise ValueError(f"{model} needs a thrust curve")
    thrust = car.thrust
    with_losses = model is ModelLevel.M2

    def drag(v: float) -> float:
        return 0.5 * car.rho_kg_m3 * car.cda(v) * v * v if with_losses else 0.0

    def roll(v: float) -> float:
        return car.crr * car.mass_kg * G0 if (with_losses and v > 0) else 0.0

    def rhs(t: float, y: FloatArray) -> list[float]:
        v = max(float(y[1]), 0.0)
        accel = (thrust(t) - drag(v) - roll(v)) / car.mass_kg
        if v <= 0 and accel < 0:  # static: losses cannot push the car backwards
            accel = 0.0
        return [v, accel]

    def finish(t: float, y: FloatArray) -> float:
        return float(y[0] - car.track_length_m)

    def stopped(t: float, y: FloatArray) -> float:
        # Only meaningful after the thrust has ended.
        return float(y[1]) if t > thrust.burn_end_s else 1.0

    finish.terminal = True  # type: ignore[attr-defined]
    finish.direction = 1  # type: ignore[attr-defined]
    stopped.terminal = True  # type: ignore[attr-defined]
    stopped.direction = -1  # type: ignore[attr-defined]

    sol = solve_ivp(
        rhs,
        (0.0, s.max_time_s),
        [0.0, 0.0],
        events=[finish, stopped],
        rtol=s.rtol,
        atol=s.atol,
        max_step=s.max_step_s,
        dense_output=False,
    )
    t, x, v = sol.t, sol.y[0], np.maximum(sol.y[1], 0.0)
    finished = bool(sol.t_events[0].size)
    if finished:
        reason, time_s = "finish", float(sol.t_events[0][0])
    elif sol.t_events[1].size:
        reason, time_s = "stopped_before_finish", None
    elif not sol.success:
        reason, time_s = f"solver_failure: {sol.message}", None
    else:
        reason, time_s = "max_time_reached", None

    terms = (
        {
            "thrust_n": np.array([thrust(ti) for ti in t]),
            "drag_n": np.array([drag(vi) for vi in v]),
            "rolling_n": np.array([roll(vi) for vi in v]),
        }
        if force_terms
        else {}
    )
    return RaceResult(model, finished, time_s, t, x, v, float(v.max()), reason, terms)


def _simulate_m0(car: CarParams, s: SolverSettings) -> RaceResult:
    a = car.constant_accel_m_s2
    if a is None or a <= 0:
        raise ValueError("M0 needs a positive constant_accel_m_s2")
    time_s = float(np.sqrt(2 * car.track_length_m / a))
    t = np.linspace(0.0, time_s, 200)
    return RaceResult(
        ModelLevel.M0, True, time_s, t, 0.5 * a * t**2, a * t, a * time_s, "finish (analytic)"
    )
