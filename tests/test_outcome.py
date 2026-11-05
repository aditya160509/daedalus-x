"""Race outcome objective (T15): India NF points formulas, knock-out odds, car choice.

All times here are synthetic numbers chosen to hit the formulas, not data about any real car.
"""

from __future__ import annotations

import numpy as np
import pytest

from daedalus import outcome
from daedalus.outcome import OutcomeInputError

OTHERS = np.array([10.0, 11.0, 12.0, 13.0, 14.0])


def test_reaction_points_top_three_and_formula() -> None:
    assert outcome.reaction_points(9.0, OTHERS) == 105.0
    assert outcome.reaction_points(10.5, OTHERS) == 100.0
    assert outcome.reaction_points(11.5, OTHERS) == 95.0
    # 4th or slower: base = 1.2 x third fastest (12.0) = 14.4, fastest = 10.0
    expected = 5.0 + 90.0 / (14.4 - 10.0) * (14.4 - 12.5)
    assert outcome.reaction_points(12.5, OTHERS) == pytest.approx(expected)
    assert outcome.reaction_points(15.0, OTHERS) == 5.0


def test_reaction_points_dnf_and_small_fields() -> None:
    assert outcome.reaction_points(float("inf"), OTHERS) == 4.0
    assert outcome.reaction_points(12.0, np.array([10.0, 11.0])) == 95.0


def test_reaction_points_never_drop_below_the_floor() -> None:
    times = np.linspace(9.0, 40.0, 200)
    points = outcome._reaction_points_vector(times, np.sort(OTHERS))
    assert points.min() >= 5.0
    assert np.all(np.diff(points) <= 1e-9)  # slower never scores more


def test_best_of_two_beats_one_run() -> None:
    rng = np.random.default_rng(1)
    runs = np.random.default_rng(2).normal(1.2, 0.02, 4000)
    one = outcome.best_of(runs, 1, 20000, rng)
    two = outcome.best_of(runs, 2, 20000, rng)
    assert two.mean() < one.mean()
    with pytest.raises(OutcomeInputError):
        outcome.best_of(runs, 0, 10, rng)


def test_total_time_adds_reaction() -> None:
    car = np.full(100, 1.2)
    total = outcome.total_time_samples(car, reaction_mean_s=0.25, reaction_sd_s=0.03, seed=3)
    assert total.mean() == pytest.approx(1.45, abs=0.005)
    assert total.min() >= 1.2
    with pytest.raises(OutcomeInputError):
        outcome.total_time_samples(car, reaction_mean_s=-0.1, reaction_sd_s=0.01)


def test_head_to_head_is_symmetric_and_handles_ties_and_dnf() -> None:
    rng = np.random.default_rng(4)
    a = rng.normal(1.20, 0.02, 3000)
    b = rng.normal(1.20, 0.02, 3000)
    fast = rng.normal(1.10, 0.02, 3000)
    assert outcome.head_to_head(a, b) == pytest.approx(0.5, abs=0.03)
    assert outcome.head_to_head(fast, a) > 0.99
    assert outcome.head_to_head(a, fast) < 0.01
    assert outcome.head_to_head(a, b) + outcome.head_to_head(b, a) == pytest.approx(1.0)
    same = np.array([1.0, 1.0])
    assert outcome.head_to_head(same, np.array([1.0, 1.0, 1.0])) == pytest.approx(0.5)
    assert outcome.head_to_head(fast, a, own_dnf=1.0) == 0.0
    assert outcome.head_to_head(a, fast, opponent_dnf=1.0) == pytest.approx(1.0)


def test_knockout_distribution_and_points() -> None:
    dist = outcome.knockout_win_distribution([0.5, 0.5, 0.5, 0.5])
    assert dist.sum() == pytest.approx(1.0)
    assert outcome.expected_knockout_points([1.0, 1.0, 1.0, 1.0]) == 135.0
    assert outcome.expected_knockout_points([0.0, 0.0, 0.0, 0.0]) == 26.0
    assert outcome.expected_knockout_points([0.5, 0.5, 0.5, 0.5]) == pytest.approx(51.6875)
    with pytest.raises(OutcomeInputError):
        outcome.expected_knockout_points([0.5, 0.5])
    with pytest.raises(OutcomeInputError):
        outcome.expected_knockout_points([0.5, 0.5, 0.5, 1.5])


def test_cvar_exceeds_the_mean_for_a_spread() -> None:
    times = np.random.default_rng(5).normal(1.2, 0.03, 5000)
    assert outcome.cvar(times, 0.9) > times.mean()
    with pytest.raises(OutcomeInputError):
        outcome.cvar(times, 1.0)


def _field(source: outcome.FieldSource = "synthetic") -> outcome.FieldModel:
    rng = np.random.default_rng(6)
    others_total = np.sort(rng.normal(1.50, 0.06, 40))
    others_car = others_total - 0.25
    opponents = tuple(rng.normal(m, 0.02, 2000) for m in (1.60, 1.55, 1.50, 1.45))
    return outcome.FieldModel(others_total, others_car, opponents, source)


def test_expected_racing_outcome_components_add_up() -> None:
    car = np.random.default_rng(7).normal(1.18, 0.01, 3000)
    total = outcome.total_time_samples(car, reaction_mean_s=0.25, reaction_sd_s=0.03, seed=8)
    result = outcome.expected_racing_outcome(
        car_time_s=car, total_time_s=total, field_model=_field()
    )
    assert result.expected_total_points == pytest.approx(
        result.reaction_points_mean + result.knockout_points_mean + result.expected_bonus_points
    )
    bins = result.total_points_distribution
    assert sum(prob for _, prob in bins) == pytest.approx(1.0)
    assert sum(points * prob for points, prob in bins) == pytest.approx(
        result.expected_total_points, abs=0.5
    )
    assert 5.0 <= result.reaction_points_p05 <= result.reaction_points_p95 <= 105.0
    assert 26.0 <= result.knockout_points_mean <= 135.0
    assert result.field_source == "synthetic"
    assert any("field model is synthetic" in note for note in result.assumptions)
    again = outcome.expected_racing_outcome(
        car_time_s=car, total_time_s=total, field_model=_field()
    )
    assert again.to_mapping() == result.to_mapping()


def test_performance_failure_removes_the_bonus_only() -> None:
    car = np.random.default_rng(9).normal(1.0, 0.01, 3000)  # clearly the fastest car in the field
    total = outcome.total_time_samples(car, reaction_mean_s=0.25, reaction_sd_s=0.03, seed=10)
    legal = outcome.expected_racing_outcome(
        car_time_s=car, total_time_s=total, field_model=_field()
    )
    illegal = outcome.expected_racing_outcome(
        car_time_s=car, total_time_s=total, field_model=_field(), performance_compliant=False
    )
    assert legal.fastest_car_probability > 0.9
    assert legal.expected_bonus_points > 9.0
    assert illegal.expected_bonus_points == 0.0
    assert max(points for points, _ in illegal.total_points_distribution) <= 240
    assert illegal.reaction_points_mean == pytest.approx(legal.reaction_points_mean)


def test_a_faster_car_scores_more_points() -> None:
    def points(mean: float) -> float:
        car = np.random.default_rng(11).normal(mean, 0.01, 3000)
        total = outcome.total_time_samples(car, reaction_mean_s=0.25, reaction_sd_s=0.03, seed=12)
        return outcome.expected_racing_outcome(
            car_time_s=car, total_time_s=total, field_model=_field()
        ).expected_total_points

    assert points(1.10) > points(1.20) > points(1.35)


def test_field_model_validation() -> None:
    rng = np.random.default_rng(13)
    good = rng.normal(1.5, 0.05, 10)
    with pytest.raises(OutcomeInputError):
        outcome.FieldModel(good, good, (good,), "synthetic")
    with pytest.raises(OutcomeInputError):
        outcome.FieldModel(np.array([]), good, (good,) * 4, "synthetic")
    with pytest.raises(OutcomeInputError):
        outcome.FieldModel(good, np.array([1.0, -1.0]), (good,) * 4, "synthetic")


def test_car_choice_differs_between_weak_and_strong_opponents() -> None:
    rng = np.random.default_rng(14)
    steady = rng.normal(1.200, 0.005, 6000)
    erratic = rng.normal(1.205, 0.030, 6000)
    weak = rng.normal(1.25, 0.01, 6000)
    strong = rng.normal(1.190, 0.01, 6000)
    result = outcome.choose_cars(steady, erratic, (weak, weak, weak, strong))
    assert result.choices[0] == "A"  # steady car against a weak opponent
    assert result.choices[3] == "B"  # erratic car against a faster opponent
    assert result.gain_points > 0.0
    assert result.expected_points >= result.best_single_car_points
    with pytest.raises(OutcomeInputError):
        outcome.choose_cars(steady, erratic, (weak,))
