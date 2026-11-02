"""Project twin (T33). The tasks are illustrative, not the team's real plan."""

from __future__ import annotations

import numpy as np
import pytest

from daedalus.project import Estimate, PlanInputError, Task, critical_path, forecast


def fixed(days: float) -> Estimate:
    return Estimate(days, days, days)


def test_pert_samples_have_the_pert_mean() -> None:
    e = Estimate(2.0, 4.0, 12.0)
    draws = e.sample(200_000, np.random.default_rng(0))
    assert draws.mean() == pytest.approx(e.pert_mean, rel=0.01)
    assert draws.min() >= 2.0 and draws.max() <= 12.0


def test_chain_of_fixed_tasks_adds_up_and_is_all_critical() -> None:
    tasks = [
        Task("cad", "CAD", fixed(5)),
        Task("cfd", "CFD", fixed(3), ("cad",)),
        Task("cnc", "CNC", fixed(2), ("cfd",)),
    ]
    total, path, timing = critical_path(tasks)
    assert total == 10.0
    assert path == ("cad", "cfd", "cnc")
    assert all(t.slack == 0 for t in timing.values())
    f = forecast(tasks, deadline_days=10.0, samples=500)
    assert f.p50_days == pytest.approx(10.0)
    assert f.finish_probability == 1.0
    assert all(v == pytest.approx(1.0) for v in f.criticality.values())


def test_parallel_branches_take_the_longer_one_and_report_slack() -> None:
    tasks = [
        Task("cad", "CAD", fixed(5)),
        Task("portfolio", "Portfolio", fixed(2), ("cad",)),
        Task("cnc", "CNC", fixed(4), ("cad",)),
        Task("submit", "Submit", fixed(1), ("portfolio", "cnc")),
    ]
    total, path, timing = critical_path(tasks)
    assert total == 10.0
    assert "portfolio" not in path and "cnc" in path
    assert timing["portfolio"].slack == pytest.approx(2.0)
    f = forecast(tasks, samples=500)
    assert f.criticality["cnc"] == 1.0 and f.criticality["portfolio"] == 0.0


def test_uncertainty_widens_the_forecast_and_lowers_the_on_time_chance() -> None:
    tasks = [
        Task("a", "A", Estimate(3, 5, 12)),
        Task("b", "B", Estimate(2, 4, 10), ("a",)),
    ]
    f = forecast(tasks, deadline_days=9.0, samples=20_000, seed=1)
    assert f.likely_days == 9.0
    assert f.p50_days > 9.0  # right-skewed estimates finish later than the most likely plan
    assert 0.0 < f.finish_probability < 0.5  # type: ignore[operator]
    assert f.p50_days < f.p80_days < f.p95_days


def test_budget_forecast() -> None:
    tasks = [
        Task("wheels", "Wheels", fixed(1), cost=Estimate(1000, 1500, 3000)),
        Task("block", "Block", fixed(1), cost=Estimate(500, 500, 500)),
    ]
    f = forecast(tasks, budget=2200.0, samples=20_000, seed=2)
    assert f.cost_p50 is not None and 2000 < f.cost_p50 < 2400
    assert f.budget_probability is not None and 0.3 < f.budget_probability < 0.8
    assert f.to_mapping()["cost_p80"] == f.cost_p80


def test_bad_plans_are_rejected() -> None:
    with pytest.raises(PlanInputError, match="cycle"):
        critical_path([Task("a", "A", fixed(1), ("b",)), Task("b", "B", fixed(1), ("a",))])
    with pytest.raises(PlanInputError, match="unknown"):
        critical_path([Task("a", "A", fixed(1), ("ghost",))])
    with pytest.raises(PlanInputError, match="unique"):
        critical_path([Task("a", "A", fixed(1)), Task("a", "A2", fixed(1))])
    with pytest.raises(PlanInputError):
        Estimate(5, 3, 8)
    with pytest.raises(PlanInputError):
        forecast([])
