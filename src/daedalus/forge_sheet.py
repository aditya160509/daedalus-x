"""Printable scrutineering sheet (ORDER 1): every rule with its limits, penalty and CAD result.

The sheet mirrors the judges' specification scorecard: one row per rule, the CAD result, and blank
boxes for Car A, Car B and remarks so the team can run its own scrutineering before the event.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import typst

from daedalus.forge import Check, points_at_risk

TEMPLATE = Path(__file__).resolve().parent / "report" / "sheet.typ"
STATE_TEXT = {
    "pass_cad_only": "pass (CAD)",
    "at_risk": "AT RISK",
    "fail_cad": "FAIL (CAD)",
    "manual_review": "measure",
}


def limit_text(lo: float | None, hi: float | None, unit: str) -> str:
    """Human limit such as '65-85 mm', '>= 50 g' or 'check'."""
    if lo is not None and hi is not None:
        return f"{lo:g} to {hi:g} {unit}"
    if lo is not None:
        return f">= {lo:g} {unit}"
    if hi is not None:
        return f"<= {hi:g} {unit}"
    return "check"


def sheet_data(
    book: dict[str, object],
    checks: list[Check],
    *,
    design: str,
    generated: str | None = None,
) -> dict[str, object]:
    """Rows and totals for the template. `checks` must come from the same rulebook."""
    rules = book["rules"]
    if not isinstance(rules, list) or len(rules) != len(checks):
        raise ValueError("checks do not match the rulebook rules")
    rows = []
    for rule, c in zip(rules, checks, strict=True):
        rows.append(
            {
                "id": c.rule_id,
                "name": c.name,
                "page": c.page,
                "class": str(rule.get("class", "general")),
                "limit": limit_text(c.min, c.max, c.unit),
                "penalty": c.penalty,
                "value": "-" if c.value is None else f"{c.value:.1f} {c.unit}",
                "state": STATE_TEXT[c.state],
            }
        )
    risk = points_at_risk(checks)
    body = json.dumps(rows, sort_keys=True)
    return {
        "revision": str(book["revision"]),
        "design": design,
        "generated": generated or datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
        "hash": "sha256:" + hashlib.sha256(body.encode()).hexdigest()[:12],
        "failing_points": risk.failing_points,
        "at_risk_points": risk.at_risk_points,
        "manual_review": risk.manual_review_rules,
        "rows": rows,
    }


def compile_sheet(data: dict[str, object]) -> bytes:
    """Compile the Typst template with `data` and return the PDF bytes."""
    pdf = typst.compile(
        str(TEMPLATE), root=str(TEMPLATE.parent), sys_inputs={"data": json.dumps(data)}
    )
    return bytes(pdf)
