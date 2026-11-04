"""Reproducible equal-budget optimiser benchmark on ORACLE's synthetic objective."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator
from scipy.optimize import minimize
from scipy.stats import qmc, t

from daedalus import oracle


class BenchmarkSpec(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    budget: int = Field(default=20, ge=8, le=32)
    n_init: int = Field(default=8, ge=4, le=12)
    seeds: int = Field(default=10, ge=10, le=20)
    seed: int = Field(default=7, ge=0, le=2**31 - 1)

    @model_validator(mode="after")
    def validate_startup(self) -> BenchmarkSpec:
        if self.n_init >= self.budget:
            raise ValueError("n_init must be less than budget")
        return self


def _reference() -> float:
    """Numerical multistart reference; this is not a certified global optimum."""
    starts = [np.full(oracle.DIM, 0.5), np.zeros(oracle.DIM), np.ones(oracle.DIM)]
    starts.extend(np.eye(oracle.DIM))

    def objective(x: np.ndarray) -> float:
        return float(oracle.synthetic_cda(x)[0]) * 1e6

    fits = [
        minimize(
            objective,
            x,
            method="L-BFGS-B",
            bounds=[(0.0, 1.0)] * oracle.DIM,
        )
        for x in starts
    ]
    return min(float(f.fun) for f in fits) / 1e6


def _interval(curves: np.ndarray) -> tuple[list[float], list[float], list[float]]:
    mean = np.mean(curves, axis=0)
    half = (
        t.ppf(0.975, curves.shape[0] - 1)
        * np.std(curves, axis=0, ddof=1)
        / np.sqrt(curves.shape[0])
    )
    return mean.tolist(), (mean - half).tolist(), (mean + half).tolist()


def run(
    spec: BenchmarkSpec, *, on_progress: Callable[[dict[str, object]], None] | None = None
) -> dict[str, Any]:
    """Compare six search methods on the synthetic objective, with equal total budgets."""
    import optuna

    reference = _reference()
    names = [
        ("gp_ei", "ORACLE GP / EI"),
        ("tpe", "Optuna TPE"),
        ("cmaes", "Optuna CMA-ES"),
        ("sobol", "Sobol"),
        ("lhs", "Latin hypercube"),
        ("random", "Random"),
    ]
    curves: dict[str, list[np.ndarray]] = {key: [] for key, _ in names}
    evaluations: list[dict[str, Any]] = []
    previous_verbosity = optuna.logging.get_verbosity()
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    try:
        for seed_index in range(spec.seeds):
            run_seed = spec.seed + seed_index
            initial = qmc.LatinHypercube(d=oracle.DIM, seed=run_seed).random(spec.n_init)
            for method_index, (method, _) in enumerate(names):
                study: optuna.Study | None = None
                trial: optuna.Trial | None = None
                design = np.empty((0, oracle.DIM))
                if method in ("tpe", "cmaes"):
                    sampler = (
                        optuna.samplers.TPESampler(seed=run_seed, n_startup_trials=spec.n_init)
                        if method == "tpe"
                        else optuna.samplers.CmaEsSampler(
                            seed=run_seed, n_startup_trials=spec.n_init
                        )
                    )
                    study = optuna.create_study(direction="minimize", sampler=sampler)
                    for point in initial:
                        study.enqueue_trial({f"x{i}": float(v) for i, v in enumerate(point)})
                elif method == "sobol":
                    power = int(np.ceil(np.log2(spec.budget)))
                    design = qmc.Sobol(d=oracle.DIM, scramble=True, seed=run_seed).random_base2(
                        power
                    )[: spec.budget]
                elif method == "lhs":
                    design = qmc.LatinHypercube(d=oracle.DIM, seed=run_seed + 100_000).random(
                        spec.budget
                    )
                elif method == "random":
                    design = np.random.default_rng(run_seed + 200_000).random(
                        (spec.budget, oracle.DIM)
                    )
                points: list[np.ndarray] = []
                values: list[float] = []
                for index in range(spec.budget):
                    if method in ("tpe", "cmaes"):
                        assert study is not None  # noqa: S101
                        trial = study.ask()
                        point = np.array(
                            [trial.suggest_float(f"x{i}", 0.0, 1.0) for i in range(oracle.DIM)]
                        )
                        reason = (
                            "Shared Latin-hypercube initialization."
                            if index < spec.n_init
                            else (
                                "Optuna TPE selected this point from its observation history."
                                if method == "tpe"
                                else "Optuna CMA-ES suggestion; independent fallback is possible."
                            )
                        )
                    elif method == "gp_ei":
                        if index < spec.n_init:
                            point = initial[index]
                            reason = "Shared Latin-hypercube initialization."
                        else:
                            point, _, _ = oracle.next_best(
                                np.asarray(points), np.asarray(values), seed=run_seed + index
                            )
                            reason = (
                                "ORACLE selected the candidate with greatest expected improvement."
                            )
                    else:
                        point = design[index]
                        reason = {
                            "sobol": "Scrambled Sobol space-filling design.",
                            "lhs": "Latin-hypercube space-filling design.",
                            "random": "Independent uniform random sample.",
                        }[method]
                    value = float(oracle.synthetic_cda(point)[0])
                    if method in ("tpe", "cmaes"):
                        assert study is not None and trial is not None  # noqa: S101
                        study.tell(trial, value)
                    points.append(point)
                    values.append(value)
                    evaluations.append(
                        {
                            "method": method,
                            "seed": run_seed,
                            "index": index + 1,
                            "unit": point.tolist(),
                            "cda_m2": value,
                            "reason": reason,
                        }
                    )
                curves[method].append(np.minimum.accumulate(values))
                if on_progress:
                    on_progress(
                        {
                            "completed": seed_index * len(names) + method_index + 1,
                            "total": spec.seeds * len(names),
                            "method": method,
                            "seed": run_seed,
                        }
                    )
    finally:
        optuna.logging.set_verbosity(previous_verbosity)
    methods = []
    for method, label in names:
        samples = np.asarray(curves[method])
        mean, lower, upper = _interval(samples)
        rmean, rlower, rupper = _interval(samples - reference)
        methods.append(
            {
                "id": method,
                "label": label,
                "mean_cda_m2": mean,
                "lower_cda_m2": lower,
                "upper_cda_m2": upper,
                "mean_regret_m2": rmean,
                "lower_regret_m2": rlower,
                "upper_regret_m2": rupper,
            }
        )
    return {
        "provenance": "synthetic",
        "spec": spec.model_dump(),
        "reference_cda_m2": reference,
        "methods": methods,
        "evaluations": evaluations,
        "assumptions": [
            "Synthetic objective over the full unit cube; not CFD or physical proof.",
            "Reference is the best numerical multistart minimum, not a certified global optimum.",
            (
                "GP/EI, TPE and CMA-ES share seeded Latin-hypercube startup evaluations; "
                "startup counts within each budget."
            ),
            (
                "Sobol uses a scrambled base-2 design truncated to budget; "
                "LHS/random use independent seeded full-budget designs."
            ),
            "Intervals are untrimmed 95% Student-t confidence intervals for the across-seed mean.",
            "CMA-ES may sample independently until enough completed observations exist.",
        ],
    }
