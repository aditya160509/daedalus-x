"""T20: manufacturing pass probability from a declared process sigma.

The model applies a Normal manufacturing error to each computable CAD dimension. It is a
process-capability estimate from an assumed sigma, never a measured capability study: CAD
values are nominal and the caller declares the spread. Manual and unmeasured rules stay out.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from daedalus.forge import Check, penalty_terms

DEFAULT_SAMPLES = 20_000
MAX_SAMPLES = 100_000


@dataclass(frozen=True)
class RuleRisk:
    rule_id: str
    name: str
    page: int
    unit: str
    value: float
    min: float | None
    max: float | None
    margin: float | None
    sigma: float
    pass_probability: float
    expected_points_lost: float | None
    penalty: str


@dataclass(frozen=True)
class RiskResult:
    sigma_mm: float
    samples: int
    rules: tuple[RuleRisk, ...]
    overall_pass_probability: float
    expected_points_lost: float
    p95_points_lost: float
    cvar95_points_lost: float
    excluded_rules: int
    unquantified_rules: tuple[str, ...]
    assumptions: tuple[str, ...]


def manufacturing_risk(
    checks: list[Check],
    *,
    sigma_mm: float,
    rule_sigmas: dict[str, float] | None = None,
    samples: int = DEFAULT_SAMPLES,
    seed: int = 0,
) -> RiskResult:
    """Simulate independent Normal manufacturing errors at each measured CAD dimension.

    `sigma_mm` applies to every rule whose unit is millimetres. `rule_sigmas` can override a
    rule or provide a sigma for another unit (degrees, grams). A rule with no value, or no
    applicable sigma, is excluded and counted; it never becomes an invented pass.
    """
    if not math.isfinite(sigma_mm) or not 0 < sigma_mm <= 10:
        raise ValueError("sigma_mm must be a finite number greater than 0 and at most 10")
    if not 1_000 <= samples <= MAX_SAMPLES:
        raise ValueError(f"samples must be between 1,000 and {MAX_SAMPLES}")
    overrides = {rule_id: float(value) for rule_id, value in (rule_sigmas or {}).items()}
    known = {check.rule_id for check in checks}
    unknown = sorted(set(overrides) - known)
    if unknown:
        raise ValueError(f"sigma override for unknown rule(s): {', '.join(unknown)}")
    for rule_id, sigma in overrides.items():
        if not math.isfinite(sigma) or not 0 < sigma <= 100:
            raise ValueError(f"sigma for {rule_id} must be greater than 0 and at most 100")

    rng = np.random.default_rng(seed)
    rows: list[RuleRisk] = []
    passes: list[NDArray[np.bool_]] = []
    losses: list[NDArray[np.float64]] = []
    unquantified: list[str] = []
    excluded = 0

    for check in checks:
        sigma = overrides.get(check.rule_id, sigma_mm if check.unit == "mm" else None)
        if check.value is None or (check.min is None and check.max is None) or sigma is None:
            excluded += 1
            continue
        sample = rng.normal(check.value, sigma, samples)
        inside = np.ones(samples, dtype=np.bool_)
        if check.min is not None:
            inside &= sample >= check.min
        if check.max is not None:
            inside &= sample <= check.max
        terms = penalty_terms(check.penalty)
        if terms is None:
            loss = np.zeros(samples, dtype=np.float64)
            unquantified.append(check.rule_id)
            expected: float | None = None
        else:
            rate, basis = terms
            if basis is None:
                loss = np.where(inside, 0.0, rate)
            else:
                below = np.maximum(check.min - sample, 0.0) if check.min is not None else 0.0
                above = np.maximum(sample - check.max, 0.0) if check.max is not None else 0.0
                loss = rate * np.ceil(np.maximum(below, above))
            expected = float(np.mean(loss))
        passes.append(inside)
        losses.append(loss)
        rows.append(
            RuleRisk(
                rule_id=check.rule_id,
                name=check.name,
                page=check.page,
                unit=check.unit,
                value=check.value,
                min=check.min,
                max=check.max,
                margin=check.margin,
                sigma=sigma,
                pass_probability=float(np.mean(inside)),
                expected_points_lost=expected,
                penalty=check.penalty,
            )
        )

    if not rows:
        raise ValueError(
            "no computable millimetre rule with a CAD value; import a measured design or "
            "supply rule_sigmas for other units"
        )

    total = np.sum(np.stack(losses), axis=0)
    overall = float(np.mean(np.all(np.stack(passes), axis=0)))
    p95 = float(np.percentile(total, 95))
    tail = total[total >= p95]
    cvar = float(np.mean(tail)) if len(tail) else p95
    assumptions = (
        "CAD dimensions are nominal; manufacturing error is Normal with the declared sigma "
        "and independent between rules.",
        "Only rules with a computable CAD value and an applicable sigma enter the model; "
        "manual and unmeasured rules are excluded, not assumed to pass.",
        "Pass probability is a process-capability estimate from an assumed sigma, not a "
        "measured capability or a proof of compliance.",
        "Approximate CAD measures retain their method uncertainty; this model adds only the "
        "declared manufacturing spread.",
        "Points follow the rulebook penalty text, charged per whole unit where proportional; "
        "unstated penalties are not scored, and per-wheel or per-axle multipliers are not "
        "applied, so those totals can be conservative.",
        f"{samples:,} seeded draws; the overall pass probability assumes independent rule errors.",
    )
    return RiskResult(
        sigma_mm=sigma_mm,
        samples=samples,
        rules=tuple(rows),
        overall_pass_probability=overall,
        expected_points_lost=float(np.mean(total)),
        p95_points_lost=p95,
        cvar95_points_lost=cvar,
        excluded_rules=excluded,
        unquantified_rules=tuple(unquantified),
        assumptions=assumptions,
    )


__all__ = ["RiskResult", "RuleRisk", "manufacturing_risk"]
