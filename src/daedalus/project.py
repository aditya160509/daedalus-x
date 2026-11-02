"""Project twin (T33): Monte Carlo schedule and budget for the team's own plan.

The India NF project management scorecard (90 points) asks for a Gantt chart with dependencies
and time estimates, and its top band asks for "critical path analysis" and "predictions of
future project performance". This module takes the team's task list with three-point estimates
(optimistic, most likely, pessimistic), finds the critical path on the most likely durations,
and simulates the schedule to give the chance of finishing by a deadline, how often each task
ends up on the critical path, and the same for the budget.

Durations and costs are drawn from PERT-beta distributions, the standard choice for three-point
estimates. The numbers are only as good as the team's estimates; update them as tasks finish.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray

FloatArray = NDArray[np.float64]


class PlanInputError(ValueError):
    """Raised when tasks, estimates or dependencies cannot define a schedule."""


@dataclass(frozen=True)
class Estimate:
    """Three-point estimate: optimistic <= most likely <= pessimistic."""

    optimistic: float
    likely: float
    pessimistic: float

    def __post_init__(self) -> None:
        if not 0 <= self.optimistic <= self.likely <= self.pessimistic:
            raise PlanInputError("need 0 <= optimistic <= likely <= pessimistic")

    @property
    def pert_mean(self) -> float:
        return (self.optimistic + 4 * self.likely + self.pessimistic) / 6

    def sample(self, count: int, rng: np.random.Generator) -> FloatArray:
        span = self.pessimistic - self.optimistic
        if span == 0:
            return np.full(count, self.likely)
        alpha = 1 + 4 * (self.likely - self.optimistic) / span
        beta = 1 + 4 * (self.pessimistic - self.likely) / span
        return np.asarray(self.optimistic + span * rng.beta(alpha, beta, count), dtype=np.float64)


@dataclass(frozen=True)
class Task:
    id: str
    name: str
    days: Estimate
    depends_on: tuple[str, ...] = ()
    cost: Estimate | None = None  # in the team's currency
    owner: str = ""


def _order(tasks: Sequence[Task]) -> list[Task]:
    """Tasks in dependency order; raises on unknown dependencies or cycles."""
    by_id = {t.id: t for t in tasks}
    if len(by_id) != len(tasks):
        raise PlanInputError("task ids must be unique")
    for t in tasks:
        missing = [d for d in t.depends_on if d not in by_id]
        if missing:
            raise PlanInputError(f"{t.id} depends on unknown tasks {missing}")
    ordered: list[Task] = []
    state: dict[str, int] = {}  # 1 visiting, 2 done

    def visit(task: Task) -> None:
        if state.get(task.id) == 2:
            return
        if state.get(task.id) == 1:
            raise PlanInputError(f"dependency cycle through {task.id}")
        state[task.id] = 1
        for dep in task.depends_on:
            visit(by_id[dep])
        state[task.id] = 2
        ordered.append(task)

    for t in tasks:
        visit(t)
    return ordered


@dataclass(frozen=True)
class TaskTiming:
    id: str
    earliest_start: float
    earliest_finish: float
    latest_start: float
    latest_finish: float

    @property
    def slack(self) -> float:
        return self.latest_start - self.earliest_start


def critical_path(tasks: Sequence[Task]) -> tuple[float, tuple[str, ...], dict[str, TaskTiming]]:
    """Classic CPM on the most likely durations: duration, critical path ids and per-task slack."""
    ordered = _order(tasks)
    es: dict[str, float] = {}
    ef: dict[str, float] = {}
    for t in ordered:
        es[t.id] = max((ef[d] for d in t.depends_on), default=0.0)
        ef[t.id] = es[t.id] + t.days.likely
    total = max(ef.values(), default=0.0)
    successors: dict[str, list[str]] = {t.id: [] for t in ordered}
    for t in ordered:
        for d in t.depends_on:
            successors[d].append(t.id)
    lf: dict[str, float] = {}
    ls: dict[str, float] = {}
    for t in reversed(ordered):
        lf[t.id] = min((ls[s] for s in successors[t.id]), default=total)
        ls[t.id] = lf[t.id] - t.days.likely
    timing = {t.id: TaskTiming(t.id, es[t.id], ef[t.id], ls[t.id], lf[t.id]) for t in ordered}
    path = tuple(t.id for t in ordered if abs(timing[t.id].slack) < 1e-9)
    return total, path, timing


@dataclass(frozen=True)
class ScheduleForecast:
    likely_days: float  # deterministic critical path on the most likely durations
    critical_path: tuple[str, ...]
    p50_days: float
    p80_days: float
    p95_days: float
    finish_probability: float | None  # chance of finishing within the deadline, if one was given
    criticality: dict[str, float]  # share of simulations where each task was critical
    cost_p50: float | None
    cost_p80: float | None
    budget_probability: float | None
    assumptions: tuple[str, ...] = field(default_factory=tuple)

    def to_mapping(self) -> dict[str, object]:
        return {name: getattr(self, name) for name in self.__dataclass_fields__}


def forecast(
    tasks: Sequence[Task],
    *,
    deadline_days: float | None = None,
    budget: float | None = None,
    samples: int = 10_000,
    seed: int = 0,
) -> ScheduleForecast:
    """Monte Carlo forecast of finish time and cost, with each task's criticality index."""
    if not tasks:
        raise PlanInputError("need at least one task")
    if samples < 100:
        raise PlanInputError("need at least 100 samples")
    ordered = _order(tasks)
    likely, path, _ = critical_path(tasks)
    rng = np.random.default_rng(seed)
    index = {t.id: i for i, t in enumerate(ordered)}
    durations = np.column_stack([t.days.sample(samples, rng) for t in ordered])
    finish = np.zeros_like(durations)
    for i, t in enumerate(ordered):
        start = np.zeros(samples)
        for d in t.depends_on:
            start = np.maximum(start, finish[:, index[d]])
        finish[:, i] = start + durations[:, i]
    total = finish.max(axis=1)
    critical = _critical_counts(ordered, index, finish, durations)
    costs = [t.cost for t in ordered if t.cost is not None]
    cost = np.sum([c.sample(samples, rng) for c in costs], axis=0) if costs else None
    return ScheduleForecast(
        likely_days=likely,
        critical_path=path,
        p50_days=float(np.quantile(total, 0.5)),
        p80_days=float(np.quantile(total, 0.8)),
        p95_days=float(np.quantile(total, 0.95)),
        finish_probability=None
        if deadline_days is None
        else float(np.mean(total <= deadline_days)),
        criticality={t.id: float(critical[i] / samples) for i, t in enumerate(ordered)},
        cost_p50=None if cost is None else float(np.quantile(cost, 0.5)),
        cost_p80=None if cost is None else float(np.quantile(cost, 0.8)),
        budget_probability=None
        if cost is None or budget is None
        else float(np.mean(cost <= budget)),
        assumptions=(
            "durations and costs are PERT-beta from the team's three-point estimates",
            "tasks are independent; a task starts when all its dependencies finish",
            f"{samples} simulations, seed {seed}",
        ),
    )


def _critical_counts(
    ordered: list[Task], index: dict[str, int], finish: FloatArray, durations: FloatArray
) -> FloatArray:
    """Walk back from the last-finishing task along the latest-finishing dependency."""
    samples = finish.shape[0]
    counts = np.zeros(len(ordered))
    current = finish.argmax(axis=1)
    active = np.ones(samples, dtype=bool)
    for _ in range(len(ordered)):
        if not active.any():
            break
        np.add.at(counts, current[active], 1)
        nxt = np.full(samples, -1)
        for i, t in enumerate(ordered):
            here = active & (current == i)
            if not here.any() or not t.depends_on:
                continue
            deps = [index[d] for d in t.depends_on]
            dep_finish = finish[np.ix_(here, deps)]
            nxt[here] = np.asarray(deps)[dep_finish.argmax(axis=1)]
        active = nxt >= 0
        current = np.where(active, nxt, current)
    return counts
