"""Race outcome objective (T15): India NF racing points, knock-out odds and tail risk.

ORACLE minimises drag area, but the competition scores racing points. A car with a slightly
lower mean time can score fewer points if it is erratic, because reaction points depend on the
best of a few runs against a field and knock-out points depend on beating one opponent at a time.
This module turns a car's race-time samples and a model of the field into expected points using
the formulas in the STEM Racing India NF 2025-26 Competition Regulations (C9.5, C9.6, C9.6.1).

Everything the field model supplies (other teams' times, bracket opponents, reaction time spread)
is an assumption until real results exist, so the result carries the field source label and never
presents an estimate as a measurement.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Literal

import numpy as np
from numpy.typing import NDArray

FloatArray = NDArray[np.float64]
FieldSource = Literal["measured", "estimated", "synthetic"]

REACTION_TOP_POINTS = (105.0, 100.0, 95.0)  # fastest, 2nd, 3rd total race time (C9.5)
REACTION_FLOOR_POINTS = 5.0
REACTION_SPAN_POINTS = 90.0
BASE_TIME_FACTOR = 1.2  # base time is 120% of the third fastest total race time
REACTION_DNF_DEDUCTION = 1.0
KNOCKOUT_POINTS = (26.0, 52.0, 85.0, 106.0, 135.0)  # by rounds won, 0 to 4 (C9.6)
KNOCKOUT_ROUNDS = len(KNOCKOUT_POINTS) - 1
FASTEST_CAR_BONUS = 10.0  # C9.6.1
DEFAULT_DRAWS = 20_000


class OutcomeInputError(ValueError):
    """Raised when times, probabilities or field inputs cannot define an outcome."""


def _finite_times(values: FloatArray | Sequence[float], name: str) -> FloatArray:
    array = np.asarray(values, dtype=np.float64)
    if array.ndim != 1 or array.size == 0:
        raise OutcomeInputError(f"{name} must be a non-empty one-dimensional array")
    if np.any(np.isnan(array)) or np.any(array <= 0):
        raise OutcomeInputError(f"{name} must hold positive times (use inf for a DNF)")
    return array


def _probability(value: float, name: str) -> float:
    if not 0.0 <= value <= 1.0:
        raise OutcomeInputError(f"{name} must be between 0 and 1, got {value}")
    return float(value)


def reaction_points(own_best_s: float, other_best_s: FloatArray | Sequence[float]) -> float:
    """Reaction racing points for one team (C9.5), given every other team's best total time.

    The three fastest teams score 105, 100 and 95. Everyone else scores
    5 + 90 / (Base - fastest) x (Base - own best), where Base is 120% of the third fastest total
    race time, and never less than 5. A DNF as the best result scores 1 point less than the floor.
    """
    others = np.sort(_finite_times(other_best_s, "other_best_s"))
    return float(_reaction_points_vector(np.array([own_best_s], dtype=np.float64), others)[0])


def _reaction_points_vector(own_best_s: FloatArray, sorted_others: FloatArray) -> FloatArray:
    """Vectorised C9.5 points; `sorted_others` must be ascending."""
    finite = np.isfinite(own_best_s)
    rank = 1 + np.searchsorted(sorted_others, own_best_s, side="left")  # others strictly faster
    top = np.array(REACTION_TOP_POINTS, dtype=np.float64)
    points = np.full(own_best_s.shape, REACTION_FLOOR_POINTS, dtype=np.float64)
    if sorted_others.size >= 3:
        base = BASE_TIME_FACTOR * sorted_others[2]
        fastest = sorted_others[0]
        slope = REACTION_SPAN_POINTS / (base - fastest)
        scaled = REACTION_FLOOR_POINTS + slope * (base - np.where(finite, own_best_s, base))
        points = np.maximum(REACTION_FLOOR_POINTS, scaled)
    in_top = rank <= len(REACTION_TOP_POINTS)
    points = np.where(in_top, top[np.clip(rank, 1, len(top)) - 1], points)
    return np.where(finite, points, REACTION_FLOOR_POINTS - REACTION_DNF_DEDUCTION)


def best_of(samples: FloatArray, races: int, draws: int, rng: np.random.Generator) -> FloatArray:
    """Distribution of the best (lowest) of `races` independent runs drawn from `samples`."""
    if races < 1:
        raise OutcomeInputError("races must be at least 1")
    picks = rng.integers(0, samples.size, size=(draws, races))
    return np.asarray(samples[picks].min(axis=1), dtype=np.float64)


def total_time_samples(
    car_times_s: FloatArray | Sequence[float],
    *,
    reaction_mean_s: float,
    reaction_sd_s: float,
    draws: int = DEFAULT_DRAWS,
    seed: int = 0,
) -> FloatArray:
    """Total race time (car time plus driver reaction) as shown on the start gate (C1.8).

    Reaction time is drawn from a normal distribution truncated at zero. The caller must supply
    the mean and spread: there is no default because the right values come from the team's own
    reaction trainer, not from a guess.
    """
    car = _finite_times(car_times_s, "car_times_s")
    if reaction_mean_s < 0 or reaction_sd_s < 0:
        raise OutcomeInputError("reaction mean and spread must be non-negative")
    rng = np.random.default_rng(seed)
    car_draw = car[rng.integers(0, car.size, size=draws)]
    reaction = np.maximum(rng.normal(reaction_mean_s, reaction_sd_s, size=draws), 0.0)
    return np.asarray(car_draw + reaction, dtype=np.float64)


def head_to_head(
    own_s: FloatArray | Sequence[float],
    opponent_s: FloatArray | Sequence[float],
    *,
    own_dnf: float = 0.0,
    opponent_dnf: float = 0.0,
) -> float:
    """Probability of beating one opponent in a single knock-out race (ties count half).

    Samples are treated as independent draws and every pairing is used. A DNF loses the race,
    and if both cars DNF the result counts as a loss for the car being scored.
    """
    own = np.sort(_finite_times(own_s, "own_s"))
    opp = _finite_times(opponent_s, "opponent_s")
    own_fail = _probability(own_dnf, "own_dnf")
    opp_fail = _probability(opponent_dnf, "opponent_dnf")
    at_or_below = np.searchsorted(own, opp, side="right")
    own_faster = np.searchsorted(own, opp, side="left")  # own samples strictly below each opponent
    ties = at_or_below - own_faster
    p_time = float((own_faster.sum() + 0.5 * ties.sum()) / (own.size * opp.size))
    return (1.0 - own_fail) * ((1.0 - opp_fail) * p_time + opp_fail)


def knockout_win_distribution(round_win_probabilities: Sequence[float]) -> FloatArray:
    """Probability of winning exactly 0, 1, 2, 3 and 4 rounds, for a 16-team bracket.

    The scoring table in C9.6 has five outcomes (26, 52, 85, 106 and 135 points), which fits four
    rounds. The text's names for the rounds are inconsistent, so this works by rounds won.
    """
    if len(round_win_probabilities) != KNOCKOUT_ROUNDS:
        raise OutcomeInputError(f"need {KNOCKOUT_ROUNDS} round win probabilities")
    p = np.array([_probability(v, "round win probability") for v in round_win_probabilities])
    survive = np.concatenate(([1.0], np.cumprod(p)))
    lose_here = survive[:-1] * (1.0 - p)
    return np.concatenate((lose_here, [survive[-1]])).astype(np.float64)


def expected_knockout_points(round_win_probabilities: Sequence[float]) -> float:
    """Expected knock-out points (C9.6) for a car with these round-by-round win probabilities."""
    return float(knockout_win_distribution(round_win_probabilities) @ np.array(KNOCKOUT_POINTS))


def cvar(times_s: FloatArray | Sequence[float], level: float = 0.9) -> float:
    """Mean of the slowest `1 - level` share of runs: a tail-risk race time."""
    times = _finite_times(times_s, "times_s")
    if not 0.0 <= level < 1.0:
        raise OutcomeInputError("level must be in [0, 1)")
    threshold = float(np.quantile(times, level))
    return float(times[times >= threshold].mean())


@dataclass(frozen=True)
class FieldModel:
    """Everything about the other teams. All of it is an assumption until results exist."""

    other_best_total_s: FloatArray  # every other team's best reaction-race total time
    other_best_car_s: FloatArray  # every other team's best car race time (for the bonus)
    round_opponents_s: tuple[FloatArray, ...]  # one total-time sample set per knock-out round
    source: FieldSource

    def __post_init__(self) -> None:
        _finite_times(self.other_best_total_s, "other_best_total_s")
        _finite_times(self.other_best_car_s, "other_best_car_s")
        if len(self.round_opponents_s) != KNOCKOUT_ROUNDS:
            raise OutcomeInputError(f"need {KNOCKOUT_ROUNDS} knock-out opponents")
        for index, samples in enumerate(self.round_opponents_s):
            _finite_times(samples, f"round_opponents_s[{index}]")


@dataclass(frozen=True)
class RacingOutcome:
    """Expected racing points with their spread and the assumptions behind them."""

    reaction_points_mean: float
    reaction_points_p05: float
    reaction_points_p95: float
    knockout_points_mean: float
    round_win_probabilities: tuple[float, ...]
    fastest_car_probability: float
    expected_bonus_points: float
    expected_total_points: float
    field_source: FieldSource
    performance_compliant: bool
    assumptions: tuple[str, ...] = field(default_factory=tuple)

    def to_mapping(self) -> dict[str, object]:
        return {name: getattr(self, name) for name in self.__dataclass_fields__}


def _fastest_car_probability(car_times_s: FloatArray, other_best_car_s: FloatArray) -> float:
    return float(np.mean(car_times_s < other_best_car_s.min()))


def expected_racing_outcome(
    *,
    car_time_s: FloatArray | Sequence[float],
    total_time_s: FloatArray | Sequence[float],
    field_model: FieldModel,
    reaction_races: int = 2,
    dnf_probability: float = 0.0,
    performance_compliant: bool = True,
    draws: int = DEFAULT_DRAWS,
    seed: int = 0,
) -> RacingOutcome:
    """Expected India NF racing points (reaction, knock-out and fastest-car bonus) for one car.

    `car_time_s` are car race times (start-box fire to finish beam) and `total_time_s` are the
    same runs plus reaction time. `reaction_races` is how many reaction races count: C9.5 says two
    total times are considered while C9.1 says four races are run, so it is a parameter. A car
    that breaks a performance rule is ineligible for Fastest Car (C3.6.2) and gets no bonus.
    """
    car = _finite_times(car_time_s, "car_time_s")
    total = _finite_times(total_time_s, "total_time_s")
    rng = np.random.default_rng(seed)
    best_total = best_of(total, reaction_races, draws, rng)
    others = np.sort(field_model.other_best_total_s)
    reaction = _reaction_points_vector(best_total, others)
    round_p = tuple(
        head_to_head(total, opp, own_dnf=dnf_probability) for opp in field_model.round_opponents_s
    )
    p_fastest = _fastest_car_probability(
        best_of(car, reaction_races, draws, rng), field_model.other_best_car_s
    )
    bonus = FASTEST_CAR_BONUS * p_fastest if performance_compliant else 0.0
    knockout = expected_knockout_points(round_p)
    assumptions = (
        f"field model is {field_model.source}",
        f"best of {reaction_races} reaction races counts",
        "knock-out assumes a 16-team bracket and independent rounds",
        "reaction time spread comes from the caller, not from measured data",
    )
    return RacingOutcome(
        reaction_points_mean=float(reaction.mean()),
        reaction_points_p05=float(np.quantile(reaction, 0.05)),
        reaction_points_p95=float(np.quantile(reaction, 0.95)),
        knockout_points_mean=knockout,
        round_win_probabilities=round_p,
        fastest_car_probability=p_fastest,
        expected_bonus_points=bonus,
        expected_total_points=float(reaction.mean()) + knockout + bonus,
        field_source=field_model.source,
        performance_compliant=performance_compliant,
        assumptions=assumptions,
    )


@dataclass(frozen=True)
class PortfolioResult:
    """Car A or Car B chosen per round (C9.7.2) against always racing the better single car."""

    choices: tuple[str, ...]
    round_win_probabilities: tuple[float, ...]
    expected_points: float
    best_single_car: str
    best_single_car_points: float
    gain_points: float


def choose_cars(
    car_a_total_s: FloatArray | Sequence[float],
    car_b_total_s: FloatArray | Sequence[float],
    round_opponents_s: Sequence[FloatArray],
    *,
    dnf_a: float = 0.0,
    dnf_b: float = 0.0,
) -> PortfolioResult:
    """Pick the better of two different cars in every knock-out round.

    Each team nominates Car A or B before each round (C9.7.2b), so two cars with different risk
    profiles are a real portfolio: a steadier car against a similar opponent, a higher-variance
    car against a faster one. The cars must be geometrically identical under T3.1.4, so this is
    for two builds that differ in tuning, not in design.
    """
    if len(round_opponents_s) != KNOCKOUT_ROUNDS:
        raise OutcomeInputError(f"need {KNOCKOUT_ROUNDS} knock-out opponents")
    pa = [head_to_head(car_a_total_s, o, own_dnf=dnf_a) for o in round_opponents_s]
    pb = [head_to_head(car_b_total_s, o, own_dnf=dnf_b) for o in round_opponents_s]
    choices = tuple("A" if a >= b else "B" for a, b in zip(pa, pb, strict=True))
    chosen = tuple(max(a, b) for a, b in zip(pa, pb, strict=True))
    points = expected_knockout_points(chosen)
    points_a, points_b = expected_knockout_points(pa), expected_knockout_points(pb)
    single = "A" if points_a >= points_b else "B"
    single_points = max(points_a, points_b)
    return PortfolioResult(
        choices=choices,
        round_win_probabilities=chosen,
        expected_points=points,
        best_single_car=single,
        best_single_car_points=single_points,
        gain_points=points - single_points,
    )
