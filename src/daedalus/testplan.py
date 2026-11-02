"""Test planner (T23): which physical test to run next to learn the most about the car.

Finish times mostly measure thrust. For a car that finishes 20 m in about a second, drag and
rolling resistance change the time by a few percent and a fraction of a percent, so the three
parameters are only weakly separable by timing runs, whatever track length or mass is chosen.
The planner quantifies this: it says how much any set of timing runs can learn about each
parameter and flags the ones that stay unidentified, so the team knows when a different kind of
test (a coast-down, a wind tunnel or CFD run for drag) is needed instead of more timing runs.

The planner uses a linear-Gaussian approximation. It differentiates the TITAN race time with
respect to the log of each parameter, builds the Fisher information of every candidate test, and
greedily picks the test that most increases the log-determinant of the total information
(D-optimal design). It reports the expected relative uncertainty of each parameter after every
step, which is what the chart on the Race page should show. The approximation is only as good as
the nominal parameters, so the plan should be rerun as real runs refine them.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from daedalus.dynamics import G0, ModelLevel, ThrustCurve
from daedalus.montecarlo import _coast_time, race_times

FloatArray = NDArray[np.float64]
PARAMETERS = ("cda", "crr", "thrust")
LOG_STEP = 0.01  # central difference step in ln(parameter)
IDENTIFIED_FRACTION = 0.5  # a parameter counts as learned if its sd falls below half its start


class PlanError(ValueError):
    """Raised when the planner inputs cannot define a plan."""


@dataclass(frozen=True)
class Condition:
    """One physical test: a track length and a car mass."""

    track_m: float
    mass_kg: float

    def __post_init__(self) -> None:
        if self.track_m <= 0 or self.mass_kg <= 0:
            raise PlanError("track_m and mass_kg must be positive")


@dataclass(frozen=True)
class CoastDown:
    """A push test with no cartridge: time to coast `distance_m` from a measured `speed_mps`.

    With no thrust, the time depends only on drag and rolling resistance, so this is the test
    that measures CdA and Crr when timing runs cannot. It needs good timing (about 1 ms) and a
    pair of coasts: a fast, long one where drag dominates (e.g. 10 m/s over 8 m) and a slow,
    short one where rolling dominates (e.g. 2 m/s over 1 m). Short slow coasts alone change
    the time by only a few milliseconds per 10% change in CdA.
    """

    speed_mps: float
    distance_m: float
    mass_kg: float

    def __post_init__(self) -> None:
        if self.speed_mps <= 0 or self.distance_m <= 0 or self.mass_kg <= 0:
            raise PlanError("speed, distance and mass must be positive")


Test = Condition | CoastDown


@dataclass(frozen=True)
class Nominal:
    """Current best guess of the three parameters the tests are meant to pin down."""

    cda_m2: float
    crr: float
    thrust_scale: float = 1.0
    rho_kg_m3: float = 1.204

    def __post_init__(self) -> None:
        if self.cda_m2 <= 0 or self.crr <= 0 or self.thrust_scale <= 0 or self.rho_kg_m3 <= 0:
            raise PlanError("nominal parameters must be positive")


@dataclass(frozen=True)
class PlanStep:
    condition: Test
    information_gain_nats: float  # increase in 0.5 ln det(information)
    relative_sd: dict[str, float]  # parameter sd as a fraction of its value, after this step


@dataclass(frozen=True)
class PlanResult:
    steps: tuple[PlanStep, ...]
    starting_relative_sd: dict[str, float]
    poorly_identified: tuple[str, ...]  # parameters the plan leaves above half their prior sd
    assumptions: tuple[str, ...]

    def to_mapping(self) -> dict[str, object]:
        return {
            "starting_relative_sd": self.starting_relative_sd,
            "poorly_identified": list(self.poorly_identified),
            "steps": [
                {
                    **_describe(s.condition),
                    "information_gain_nats": s.information_gain_nats,
                    "relative_sd": s.relative_sd,
                }
                for s in self.steps
            ],
            "assumptions": list(self.assumptions),
        }


def sensitivity(
    thrust: ThrustCurve, nominal: Nominal, condition: Test, dt_s: float = 1e-3
) -> FloatArray:
    """d(time) / d ln(parameter) in seconds, for (cda, crr, thrust), by central differences."""
    if isinstance(condition, CoastDown):
        return _coast_sensitivity(nominal, condition)
    up, down = np.exp(LOG_STEP), np.exp(-LOG_STEP)
    cda = np.full(6, nominal.cda_m2)
    crr = np.full(6, nominal.crr)
    scale = np.full(6, nominal.thrust_scale)
    cda[0], cda[1] = cda[0] * up, cda[1] * down
    crr[2], crr[3] = crr[2] * up, crr[3] * down
    scale[4], scale[5] = scale[4] * up, scale[5] * down
    times = race_times(
        thrust,
        scale,
        np.full(6, condition.mass_kg),
        cda,
        crr,
        nominal.rho_kg_m3,
        condition.track_m,
        ModelLevel.M2,
        dt_s,
    )
    if not np.all(np.isfinite(times)):
        raise PlanError(
            f"the car does not finish {condition.track_m:g} m at {condition.mass_kg:g} kg"
        )
    return np.array([(times[0] - times[1]), (times[2] - times[3]), (times[4] - times[5])]) / (
        2.0 * LOG_STEP
    )


def _relative_sd(information: FloatArray) -> dict[str, float]:
    sd = np.sqrt(np.diag(np.linalg.inv(information)))
    return {name: float(value) for name, value in zip(PARAMETERS, sd, strict=True)}


def _logdet(matrix: FloatArray) -> float:
    sign, value = np.linalg.slogdet(matrix)
    return float(value) if sign > 0 else float("-inf")


def plan_tests(
    thrust: ThrustCurve,
    nominal: Nominal,
    candidates: Sequence[Test],
    *,
    done: Sequence[Test] = (),
    sigma_s: float = 0.005,
    prior_relative_sd: float = 0.2,
    budget: int = 3,
    dt_s: float = 1e-3,
) -> PlanResult:
    """Choose `budget` tests from `candidates`, after the tests already `done`.

    `sigma_s` is the timing noise of one run (the start gate reads to a millisecond, but human
    reaction and cartridge variation make it larger); `prior_relative_sd` is how well each
    parameter is known before any test. A candidate may be chosen more than once.
    """
    if budget < 1 or not candidates:
        raise PlanError("need a positive budget and at least one candidate test")
    if sigma_s <= 0 or prior_relative_sd <= 0:
        raise PlanError("sigma_s and prior_relative_sd must be positive")
    jac = {c: sensitivity(thrust, nominal, c, dt_s) for c in {*candidates, *done}}
    information = np.eye(len(PARAMETERS)) / prior_relative_sd**2
    for condition in done:
        j = jac[condition]
        information = information + np.outer(j, j) / sigma_s**2
    starting = _relative_sd(information)
    steps: list[PlanStep] = []
    for _ in range(budget):
        base = _logdet(information)
        best = max(
            candidates,
            key=lambda c: _logdet(information + np.outer(jac[c], jac[c]) / sigma_s**2),
        )
        information = information + np.outer(jac[best], jac[best]) / sigma_s**2
        steps.append(PlanStep(best, 0.5 * (_logdet(information) - base), _relative_sd(information)))
    final = steps[-1].relative_sd
    return PlanResult(
        steps=tuple(steps),
        starting_relative_sd=starting,
        poorly_identified=tuple(
            k for k in PARAMETERS if final[k] > IDENTIFIED_FRACTION * starting[k]
        ),
        assumptions=(
            "linear-Gaussian approximation around the nominal parameters",
            f"timing noise {sigma_s:g} s per run, independent between runs",
            f"prior relative sd {prior_relative_sd:g} on each parameter",
            "the thrust curve shape is taken as known; only its scale is learned",
        ),
    )


def _coast_sensitivity(nominal: Nominal, test: CoastDown) -> FloatArray:
    up, down = np.exp(LOG_STEP), np.exp(-LOG_STEP)
    drag = 0.5 * nominal.rho_kg_m3 * nominal.cda_m2 / test.mass_kg
    roll = nominal.crr * G0
    a = np.array([drag * up, drag * down, drag, drag])
    b = np.array([roll, roll, roll * up, roll * down])
    times = _coast_time(np.full(4, test.speed_mps), a, b, np.full(4, test.distance_m))
    if not np.all(np.isfinite(times)):
        raise PlanError(f"the car stops before {test.distance_m:g} m from {test.speed_mps:g} m/s")
    return np.array([times[0] - times[1], times[2] - times[3], 0.0]) / (2.0 * LOG_STEP)


def _describe(test: Test) -> dict[str, object]:
    if isinstance(test, CoastDown):
        return {
            "kind": "coast_down",
            "speed_mps": test.speed_mps,
            "distance_m": test.distance_m,
            "mass_kg": test.mass_kg,
        }
    return {"kind": "timing_run", "track_m": test.track_m, "mass_kg": test.mass_kg}
