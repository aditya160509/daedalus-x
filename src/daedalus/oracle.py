"""ORACLE (T10): Gaussian-process next-best-experiment search on CdA (spec §3).

A small numpy/scipy GP (RBF, ML-II hyperparameters) with expected improvement. Lean on purpose:
with ~30 CFD runs a GP is the honest surrogate, and it avoids a PyTorch dependency.
"""

from __future__ import annotations

import fcntl
import json
import math
import os
import tempfile
from collections.abc import Callable
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import minimize
from scipy.stats import norm, qmc

from daedalus.contracts import Provenance

FloatArray = NDArray[np.float64]


@dataclass(frozen=True)
class Variable:
    name: str
    unit: str
    low: float
    high: float


VARIABLES: tuple[Variable, ...] = (
    Variable("front_wing_aoa", "deg", 0.0, 12.0),
    Variable("body_taper", "", 0.6, 1.0),
    Variable("nose_height", "mm", 5.0, 25.0),
    Variable("rear_wing_chord", "mm", 10.0, 30.0),
)
DIM = len(VARIABLES)


def to_physical(u: FloatArray) -> FloatArray:
    lo = np.array([v.low for v in VARIABLES])
    hi = np.array([v.high for v in VARIABLES])
    return lo + np.asarray(u) * (hi - lo)


def synthetic_cda(u: FloatArray) -> FloatArray:
    """Smooth stand-in drag area (m²) used until the CFD campaign exists. Labelled SYNTHETIC."""
    u = np.atleast_2d(u)
    return 0.0025 * (
        1.0
        + 0.18 * (u[:, 0] - 0.35) ** 2
        + 0.12 * (u[:, 1] - 0.7) ** 2
        + 0.06 * (u[:, 2] - 0.4) ** 2
        + 0.08 * u[:, 3] * u[:, 0]
        + 0.02 * np.sin(5 * u[:, 2])
    )


class GP:
    """Zero-mean GP on standardised targets with an anisotropic RBF kernel."""

    def __init__(self, x: FloatArray, y: FloatArray) -> None:
        self.x = np.asarray(x, float)
        self.mu, self.sd = float(np.mean(y)), float(np.std(y) or 1.0)
        self.y = (np.asarray(y, float) - self.mu) / self.sd
        res = minimize(
            self._nll,
            np.zeros(DIM + 1) - 1.0,
            method="L-BFGS-B",
            bounds=[(-3.0, 1.5)] * DIM + [(-8.0, -1.0)],
        )
        self.fit_success, self.fit_message = bool(res.success), str(res.message)
        self.log_ls, self.log_noise = res.x[:DIM], res.x[DIM]
        k = self._k(self.x, self.x) + np.exp(self.log_noise) * np.eye(len(self.x))
        self.chol = np.linalg.cholesky(k + 1e-9 * np.eye(len(self.x)))
        self.alpha = np.linalg.solve(self.chol.T, np.linalg.solve(self.chol, self.y))

    def _k(self, a: FloatArray, b: FloatArray, log_ls: FloatArray | None = None) -> FloatArray:
        ls = np.exp(self.log_ls if log_ls is None else log_ls)
        d = (a[:, None, :] - b[None, :, :]) / ls
        return np.exp(-0.5 * np.sum(d * d, axis=-1))

    def _nll(self, p: FloatArray) -> float:
        k = self._k(self.x, self.x, p[:DIM]) + (np.exp(p[DIM]) + 1e-9) * np.eye(len(self.x))
        try:
            c = np.linalg.cholesky(k)
        except np.linalg.LinAlgError:
            return 1e10
        a = np.linalg.solve(c.T, np.linalg.solve(c, self.y))
        return float(0.5 * self.y @ a + np.sum(np.log(np.diag(c))))

    def predict(self, xs: FloatArray) -> tuple[FloatArray, FloatArray]:
        ks = self._k(np.atleast_2d(xs), self.x)
        mean = ks @ self.alpha
        v = np.linalg.solve(self.chol, ks.T)
        var = np.clip(1.0 - np.sum(v * v, axis=0), 1e-12, None)
        return mean * self.sd + self.mu, np.sqrt(var) * self.sd

    def diagnostics(self) -> dict[str, object]:
        return {
            "fit_success": self.fit_success,
            "fit_message": self.fit_message,
            "noise_sd_m2": float(np.sqrt(np.exp(self.log_noise)) * self.sd),
            "noise_source": "marginal_likelihood_fit_not_repeat_measurements",
            "repeat_inputs": len(self.x) - len(np.unique(self.x, axis=0)),
            "length_scales": [
                {
                    "name": variable.name,
                    "unit": variable.unit or "1",
                    "normalised": float(np.exp(log_scale)),
                    "physical": float(np.exp(log_scale) * (variable.high - variable.low)),
                    "at_bound": bool(np.isclose(log_scale, -3.0) or np.isclose(log_scale, 1.5)),
                }
                for variable, log_scale in zip(VARIABLES, self.log_ls, strict=True)
            ],
        }


def expected_improvement(gp: GP, xs: FloatArray, best: float) -> FloatArray:
    mean, sd = gp.predict(xs)
    z = (best - mean) / sd
    ei: FloatArray = (best - mean) * norm.cdf(z) + sd * norm.pdf(z)
    return ei


def candidates(n: int = 2000, seed: int = 0) -> FloatArray:
    return qmc.LatinHypercube(d=DIM, seed=seed).random(n)


def study_feasible(unit: FloatArray) -> NDArray[np.bool_]:
    """Study-family bounds only; FORGE and physical checks remain separate gates."""
    values = np.atleast_2d(unit)
    if values.shape[1] != DIM:
        raise ValueError(f"Expected {DIM} design variables")
    return (
        np.isfinite(values).all(axis=1)
        & (values >= 0).all(axis=1)
        & (values <= 1).all(axis=1)
        & (values[:, 3] >= 0.25)
        & (values[:, 3] <= 0.75)
    )


def next_best(
    x: FloatArray,
    y: FloatArray,
    seed: int = 0,
    candidate_filter: Callable[[FloatArray], NDArray[np.bool_]] | None = None,
) -> tuple[FloatArray, float, GP]:
    gp = GP(x, y)
    cand = candidates(seed=seed)
    if candidate_filter is not None:
        cand = cand[candidate_filter(cand)]
    if not len(cand):
        raise ValueError("No candidate satisfies the declared study-family constraints")
    ei = expected_improvement(gp, cand, float(np.min(y)))
    i = int(np.argmax(ei))
    return cand[i], float(ei[i]), gp


def benchmark(budget: int = 20, n_init: int = 8, seeds: int = 5) -> dict[str, list[float]]:
    """Best CdA found vs runs used: GP-EI against Latin hypercube, same budget, averaged."""
    gp_curves: list[FloatArray] = []
    lhs_curves: list[FloatArray] = []
    for s in range(seeds):
        x = qmc.LatinHypercube(d=DIM, seed=100 + s).random(n_init)
        y = synthetic_cda(x)
        for _ in range(budget - n_init):
            u, _, _ = next_best(x, y, seed=s)
            x, y = np.vstack([x, u]), np.append(y, synthetic_cda(u))
        gp_curves.append(np.minimum.accumulate(y))
        lhs_curves.append(
            np.minimum.accumulate(
                synthetic_cda(qmc.LatinHypercube(d=DIM, seed=200 + s).random(budget))
            )
        )
    return {"gp": np.mean(gp_curves, 0).tolist(), "lhs": np.mean(lhs_curves, 0).tolist()}


@dataclass(frozen=True)
class Observation:
    params: tuple[float, ...]  # unit cube
    cda_m2: float
    provenance: str

    def __post_init__(self) -> None:
        if len(self.params) != DIM or not all(
            math.isfinite(v) and 0 <= v <= 1 for v in self.params
        ):
            raise ValueError(
                "Observation parameters must be finite values in the declared unit cube"
            )
        if not math.isfinite(self.cda_m2) or not 0 < self.cda_m2 < 0.1:
            raise ValueError("Observation CdA must be finite and between 0 and 0.1 m²")
        Provenance(self.provenance)


def forecast(observations: list[Observation], unit: tuple[float, ...]) -> dict[str, float | str]:
    x = np.asarray([o.params for o in observations])
    y = np.asarray([o.cda_m2 for o in observations])
    point = np.asarray([unit])
    gp = GP(x, y)
    mean, sd = gp.predict(point)
    return {
        "predicted_cda_m2": float(mean[0]),
        "sd_m2": float(sd[0]),
        "ei_m2": float(expected_improvement(gp, point, float(y.min()))[0]),
        "provenance": "synthetic"
        if any(o.provenance == "synthetic" for o in observations)
        else "predicted",
    }


class Campaign:
    """Observations on disk; a SYNTHETIC Latin-hypercube seed until CFD results arrive."""

    def __init__(self, root: Path) -> None:
        self.path = root / "oracle" / "observations.json"

    def load(self) -> list[Observation]:
        if self.path.exists():
            return [
                Observation(tuple(o["params"]), o["cda_m2"], o["provenance"])
                for o in json.loads(self.path.read_text())
            ]
        x = qmc.LatinHypercube(d=DIM, seed=7).random(8)
        return [
            Observation(tuple(map(float, u)), float(c), Provenance.SYNTHETIC.value)
            for u, c in zip(x, synthetic_cda(x), strict=True)
        ]

    def add(self, obs: Observation) -> list[Observation]:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # Serialize read/append/replace across API processes; readers see complete revisions.
        with self.path.with_suffix(".lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            all_obs = [*self.load(), obs]
            name: str | None = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w", dir=self.path.parent, delete=False
                ) as file:
                    name = file.name
                    json.dump([asdict(o) for o in all_obs], file, allow_nan=False)
                    file.flush()
                    os.fsync(file.fileno())
                os.replace(name, self.path)
            finally:
                if name is not None:
                    Path(name).unlink(missing_ok=True)
        return all_obs


def pareto(gp: GP, pop: int = 60, gens: int = 40, seed: int = 0) -> dict[str, FloatArray]:
    """NSGA-II (pymoo) front of predicted CdA versus its GP uncertainty over feasible designs.

    Trades expected drag against confidence: the low-drag end is where to look next, the
    low-uncertainty end is the safest build. Infeasible study-family points are penalised.
    """
    from pymoo.algorithms.moo.nsga2 import NSGA2
    from pymoo.core.problem import Problem
    from pymoo.optimize import minimize as moo_minimize

    class _Trade(Problem):
        def __init__(self) -> None:
            super().__init__(n_var=DIM, n_obj=2, n_ieq_constr=1, xl=0.0, xu=1.0)

        def _evaluate(
            self, x: FloatArray, out: dict[str, object], *args: object, **kw: object
        ) -> None:
            mean, sd = gp.predict(x)
            out["F"] = np.column_stack([mean, sd])
            out["G"] = np.where(study_feasible(x), -1.0, 1.0)

    res = moo_minimize(_Trade(), NSGA2(pop_size=pop), ("n_gen", gens), seed=seed, verbose=False)
    order = np.argsort(res.F[:, 0])
    return {
        "unit": np.asarray(res.X)[order],
        "cda_m2": res.F[order, 0],
        "cda_sd_m2": res.F[order, 1],
    }
