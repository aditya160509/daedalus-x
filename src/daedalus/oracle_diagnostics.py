"""Held-out GP diagnostics on the actual campaign targets, with honest provenance."""

from __future__ import annotations

import numpy as np
from scipy.stats import binomtest, norm

from daedalus import oracle


def leave_one_out(observations: list[oracle.Observation]) -> dict[str, object]:
    if not 4 <= len(observations) <= 64:
        raise ValueError("Leave-one-out diagnostics require 4-64 campaign observations")
    x = np.array([o.params for o in observations])
    y = np.array([o.cda_m2 for o in observations])
    rows = []
    standardized = []
    for index, target in enumerate(y):
        mask = np.arange(len(y)) != index
        gp = oracle.GP(x[mask], y[mask])
        mean, latent_sd = gp.predict(x[index : index + 1])
        # A future observed target includes fitted observation noise, not just latent variance.
        sd = float(np.sqrt(latent_sd[0] ** 2 + np.exp(gp.log_noise) * gp.sd**2))
        z = float((target - mean[0]) / sd)
        standardized.append(abs(z))
        half = float(norm.ppf(0.95) * sd)
        rows.append(
            {
                "index": index,
                "target_m2": float(target),
                "predicted_m2": float(mean[0]),
                "sd_m2": sd,
                "lower90_m2": float(mean[0] - half),
                "upper90_m2": float(mean[0] + half),
                "error_m2": float(mean[0] - target),
                "provenance": observations[index].provenance,
            }
        )
    coverage = []
    for nominal in (0.5, 0.8, 0.9, 0.95):
        count = int(np.sum(np.array(standardized) <= norm.ppf((1 + nominal) / 2)))
        interval = binomtest(count, len(y)).proportion_ci(confidence_level=0.95, method="wilson")
        coverage.append(
            {
                "nominal": nominal,
                "observed": count / len(y),
                "count": count,
                "lower95": float(interval.low),
                "upper95": float(interval.high),
            }
        )
    errors = np.array([r["error_m2"] for r in rows])
    return {
        "provenance": "synthetic"
        if all(o.provenance == "synthetic" for o in observations)
        else "mixed",
        "observations": len(y),
        "mae_m2": float(np.mean(abs(errors))),
        "rmse_m2": float(np.sqrt(np.mean(errors**2))),
        "rows": rows,
        "coverage": coverage,
        "assumptions": [
            "Each fold refits GP hyperparameters without its held-out target.",
            "Normal predictive intervals include the fitted GP observation nugget.",
            "Wilson coverage bounds assume approximate independence; folds share training data.",
            "Targets retain stored provenance; this is not independent physical validation.",
        ],
    }
