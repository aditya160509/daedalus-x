"""FORGE endpoints (T11): rule checks for a design, CAD-only until inspected."""

from __future__ import annotations

import json
import math
from dataclasses import asdict
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from daedalus import forge, forge_probability
from daedalus.api.engineering import data_root

router = APIRouter(prefix="/v1/forge", tags=["forge"])
RULEBOOK_DIR = Path(__file__).resolve().parents[3] / "rulebooks"
RULEBOOKS = {
    "india-nf-2025-26": RULEBOOK_DIR / "stem-racing-india-nf-2025-26.yaml",
    "development-2026-27": RULEBOOK_DIR / "stem-racing-development-2026-27.yaml",
}
DEFAULT_RULEBOOK = "india-nf-2025-26"
RULEBOOK = RULEBOOKS[DEFAULT_RULEBOOK]


def _rulebook_path(name: str) -> Path:
    if name not in RULEBOOKS:
        raise HTTPException(404, f"rulebook {name!r} not found; choose from {sorted(RULEBOOKS)}")
    return RULEBOOKS[name]


def _design_dir(design: str) -> Path:
    if "/" in design or ".." in design or "\\" in design:
        raise HTTPException(404, f"design {design!r} not found")
    design_dir = data_root() / "designs" / design
    if not (design_dir / "geometry.json").is_file():
        raise HTTPException(404, f"design {design!r} not found")
    return design_dir


@router.get("/checks")
def checks(design: str, rulebook: str = DEFAULT_RULEBOOK) -> dict[str, object]:
    path = _rulebook_path(rulebook)
    design_dir = _design_dir(design)
    book = forge.load_rulebook(path)
    results = forge.check_design(design_dir, path)
    return {
        "revision": book["revision"],
        "rulebook": rulebook,
        "is_reference_only": book["is_reference_only"],
        "checks": [asdict(c) for c in results],
        "points_at_risk": asdict(forge.points_at_risk(results)),
    }


@router.get("/frontier")
def frontier(design: str, rulebook: str = DEFAULT_RULEBOOK) -> dict[str, object]:
    """T29: measured rules ranked by headroom to the nearest limit, tightest first."""
    path = _rulebook_path(rulebook)
    results = forge.check_design(_design_dir(design), path)
    return {"rows": [asdict(r) for r in forge.frontier(results)]}


@router.get("/frontier-samples")
def frontier_samples(design: str, rulebook: str = DEFAULT_RULEBOOK) -> dict[str, object]:
    """Observed CAD sample frontier under the same computable dimensional checks."""
    rule_path = _rulebook_path(rulebook)
    reference = _design_dir(design)
    basis = {
        r.rule_id
        for r in forge.check_design(reference, rule_path)
        if r.unit == "mm" and r.margin is not None and r.state != "manual_review"
    }
    rows = []
    skipped = 0
    others = sorted(
        p for p in reference.parent.iterdir() if p != reference and (p / "geometry.json").is_file()
    )
    for path in [reference, *others[:39]]:
        try:
            geometry = json.loads((path / "geometry.json").read_text())
            area = float(geometry["frontal_area_m2"])
            if not math.isfinite(area) or area <= 0:
                raise ValueError("positive frontal area required")
            checks = forge.check_design(path, rule_path)
        except (OSError, ValueError, KeyError, TypeError):
            skipped += 1
            continue
        margins = {
            r.rule_id: r.margin
            for r in checks
            if r.unit == "mm" and r.margin is not None and r.state != "manual_review"
        }
        if not basis or not basis.issubset(margins):
            skipped += 1
            continue
        rows.append(
            {
                "design": path.name,
                "area_cm2": area * 10000,
                "margin_mm": min(margins[r] for r in basis),
                "failed": sum(r.state == "fail_cad" for r in checks),
                "manual": sum(r.state == "manual_review" for r in checks),
            }
        )
    eligible = [row for row in rows if row["failed"] == 0]
    for row in rows:
        row["frontier"] = row["failed"] == 0 and not any(
            other["area_cm2"] <= row["area_cm2"]
            and other["margin_mm"] >= row["margin_mm"]
            and (other["area_cm2"] < row["area_cm2"] or other["margin_mm"] > row["margin_mm"])
            for other in eligible
        )
    return {
        "rows": rows,
        "rules": len(basis),
        "excluded": skipped,
        "outside_sample_limit": max(0, len(others) - 39),
    }


@router.post("/measure")
def measure(design: str) -> dict[str, object]:
    """Derive CAD features without modifying the immutable imported geometry."""
    from daedalus.api.cad import _source_step
    from daedalus.forge_features import measure_design

    directory = _design_dir(design)
    source = _source_step(directory)
    if source is None:
        raise HTTPException(409, "Original STEP source is unavailable; import it in Design Studio")
    try:
        features = measure_design(directory, source)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"design": design, "parts_measured": len(features)}


class ProbabilityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    design: str = Field(min_length=1, max_length=120)
    rulebook: str = Field(default=DEFAULT_RULEBOOK, max_length=120)
    sigma_mm: float = Field(gt=0, le=10)
    rule_sigmas: dict[str, float] = Field(default_factory=dict, max_length=200)
    samples: int = Field(default=forge_probability.DEFAULT_SAMPLES, ge=1_000, le=100_000)


@router.post("/pass-probability")
def pass_probability(request: ProbabilityRequest) -> dict[str, object]:
    """T20: P(pass) and expected points lost under a declared manufacturing sigma."""
    path = _rulebook_path(request.rulebook)
    book = forge.load_rulebook(path)
    checks = forge.check_design(_design_dir(request.design), path)
    try:
        result = forge_probability.manufacturing_risk(
            checks,
            sigma_mm=request.sigma_mm,
            rule_sigmas=request.rule_sigmas,
            samples=request.samples,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return {
        "design": request.design,
        "rulebook": request.rulebook,
        "revision": book["revision"],
        **asdict(result),
    }
