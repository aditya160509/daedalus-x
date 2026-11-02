"""SALib global sensitivity of a declared surrogate, not measured physical attribution."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Literal

import numpy as np
from numpy.typing import NDArray

Method = Literal["sobol", "morris"]


def analyze(
    model: Callable[[NDArray[np.float64]], NDArray[np.float64]],
    names: Sequence[str],
    *,
    method: Method = "sobol",
    seed: int = 7,
) -> dict[str, object]:
    """Independent uniform unit-cube inputs; fixed bounded CPU-only sample budgets."""
    problem = {"num_vars": len(names), "names": list(names), "bounds": [[0.0, 1.0] for _ in names]}
    if method == "sobol":
        from SALib.analyze import sobol as analyzer
        from SALib.sample import sobol as sampler

        inputs = sampler.sample(problem, 256, calc_second_order=False, seed=seed)
        output = _evaluate(model, inputs)
        result = analyzer.analyze(
            problem, output, calc_second_order=False, parallel=False, conf_level=0.95, seed=seed
        )
        rows = [
            {
                "name": name,
                "first_order": float(result["S1"][i]),
                "total_order": float(result["ST"][i]),
                "first_order_ci95": float(result["S1_conf"][i]),
                "total_order_ci95": float(result["ST_conf"][i]),
            }
            for i, name in enumerate(names)
        ]
    else:
        from SALib.analyze import morris as analyzer
        from SALib.sample import morris as sampler

        inputs = sampler.sample(problem, 64, num_levels=4, seed=seed)
        output = _evaluate(model, inputs)
        result = analyzer.analyze(problem, inputs, output, num_levels=4, conf_level=0.95, seed=seed)
        rows = [
            {
                "name": name,
                "mu_star": float(result["mu_star"][i]),
                "sigma": float(result["sigma"][i]),
                "mu_star_ci95": float(result["mu_star_conf"][i]),
            }
            for i, name in enumerate(names)
        ]
    if any(not np.isfinite(value) for row in rows for key, value in row.items() if key != "name"):
        raise ValueError(
            "Sensitivity indices are not finite; more informative observations are needed"
        )
    return {
        "method": method,
        "samples": len(inputs),
        "seed": seed,
        "rows": rows,
        "input_distribution": "independent uniform across declared parameter bounds",
        "target": "GP mean CdA",
        "confidence_level": 0.95,
    }


def _evaluate(
    model: Callable[[NDArray[np.float64]], NDArray[np.float64]], inputs: NDArray[np.float64]
) -> NDArray[np.float64]:
    output = np.asarray(model(inputs), dtype=float)
    if output.shape != (len(inputs),) or not np.isfinite(output).all():
        raise ValueError("Sensitivity model must return one finite output per sampled point")
    if np.ptp(output) < 1e-14:
        raise ValueError("Surrogate has no resolved output variation; sensitivity is undefined")
    return output
