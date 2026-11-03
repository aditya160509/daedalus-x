"""Paired timing comparisons using native SciPy inference and noncentral-t power."""

from __future__ import annotations

import csv
import io
from typing import TypedDict

import numpy as np
from pydantic import BaseModel, ConfigDict, Field
from scipy.integrate import quad
from scipy.optimize import brentq
from scipy.stats import chi2, nct, norm, t, ttest_rel


class TimingPair(TypedDict):
    pair_id: str
    baseline_s: float
    candidate_s: float


class PairedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    csv_text: str = Field(min_length=1, max_length=64_000)
    source_label: str = Field(min_length=1, max_length=150)
    pairing_basis: str = Field(min_length=5, max_length=1000)
    alpha: float = Field(default=0.05, ge=0.001, le=0.1)
    target_power: float = Field(default=0.8, ge=0.5, le=0.99)
    planned_pairs: int = Field(default=20, ge=3, le=1000)


def power(effect_sd: float, pairs: int, alpha: float) -> float:
    df = pairs - 1
    cutoff = t.ppf(1 - alpha / 2, df)
    shift = abs(effect_sd) * np.sqrt(pairs)
    # Some Boost versions return NaN in a vanishing left tail. Its normal bound is exact.
    left = 0.0 if norm.cdf(-shift) < 1e-14 else float(nct.cdf(-cutoff, df, shift))
    right = float(nct.sf(cutoff, df, shift))

    def conditional_tail(u: float, *, upper: bool) -> float:
        threshold = cutoff * np.sqrt(chi2.ppf(u, df) / df)
        return float(norm.sf(threshold - shift) if upper else norm.cdf(-threshold - shift))

    # Fall back to the defining normal/chi-square mixture when Boost loses a finite tail.
    def lower_integrand(u: float) -> float:
        return conditional_tail(u, upper=False)

    def upper_integrand(u: float) -> float:
        return conditional_tail(u, upper=True)

    if not np.isfinite(left):
        left = quad(lower_integrand, 0, 1, epsabs=1e-12)[0]
    if not np.isfinite(right):
        right = quad(upper_integrand, 0, 1, epsabs=1e-12)[0]
    return right + left


def analyze(request: PairedRequest) -> dict[str, object]:
    if not request.source_label.strip() or len(request.pairing_basis.strip()) < 5:
        raise ValueError("Name the timing source and describe how pairs were matched")
    reader = csv.DictReader(io.StringIO(request.csv_text.lstrip("\ufeff")))
    if reader.fieldnames != ["pair_id", "baseline_s", "candidate_s"]:
        raise ValueError("CSV headers must be pair_id,baseline_s,candidate_s (times in seconds)")
    rows: list[TimingPair] = []
    seen: set[str] = set()
    for line, row in enumerate(reader, 2):
        if len(rows) >= 500:
            raise ValueError("At most 500 complete pairs per comparison")
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f"Row {line} must contain exactly three columns")
        pair = row["pair_id"].strip()
        if not pair or pair in seen:
            raise ValueError(f"Row {line} needs a unique, nonempty pair_id")
        seen.add(pair)
        try:
            baseline, candidate = float(row["baseline_s"]), float(row["candidate_s"])
        except (ValueError, TypeError) as exc:
            raise ValueError(f"Row {line} has an invalid time") from exc
        if not all(np.isfinite(v) and 0 < v < 120 for v in (baseline, candidate)):
            raise ValueError(f"Row {line} times must be finite and in (0, 120) seconds")
        rows.append({"pair_id": pair, "baseline_s": baseline, "candidate_s": candidate})
    if len(rows) < 3:
        raise ValueError("At least three complete, explicitly matched pairs are needed")
    baseline = np.array([r["baseline_s"] for r in rows])
    candidate = np.array([r["candidate_s"] for r in rows])
    differences = candidate - baseline
    sd = float(np.std(differences, ddof=1))
    if sd < 1e-12:
        raise ValueError(
            "Paired differences have no usable spread; uncertainty cannot be estimated"
        )
    test = ttest_rel(candidate, baseline)
    interval = test.confidence_interval(confidence_level=1 - request.alpha)

    def target_gap(effect: float) -> float:
        return power(effect, request.planned_pairs, request.alpha) - request.target_power

    standardized_mde = brentq(target_gap, 0.0, 100.0)
    return {
        "provenance": "user_entered",
        "source_label": request.source_label,
        "pairing_basis": request.pairing_basis,
        "pairs": len(rows),
        "mean_difference_ms": float(np.mean(differences) * 1000),
        "sd_difference_ms": sd * 1000,
        "ci_ms": [float(interval.low * 1000), float(interval.high * 1000)],
        "p_two_sided": float(test.pvalue),
        "alpha": request.alpha,
        "planned_pairs": request.planned_pairs,
        "target_power": request.target_power,
        "minimum_detectable_ms": float(standardized_mde * sd * 1000),
        "rows": [
            {**row, "difference_ms": float(delta * 1000)}
            for row, delta in zip(rows, differences, strict=True)
        ],
        "assumptions": [
            "Candidate minus baseline: negative means the candidate was faster.",
            "Pairs must be matched by the declared protocol; independent differences are assumed.",
            "Student-t inference assumes approximately normal differences; no rows were removed.",
            "Power is prospective, two-sided, using pilot difference SD as a planning assumption.",
            "Source is user-entered, not independently verified physical measurement.",
            "Randomise/counterbalance run order and control lane, batch and environmental effects.",
        ],
    }
