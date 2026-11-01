"""FORGE endpoints (T11): rule checks for a design, CAD-only until inspected."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

from fastapi import APIRouter, HTTPException

from daedalus import forge
from daedalus.api.engineering import data_root

router = APIRouter(prefix="/v1/forge", tags=["forge"])
RULEBOOK = (
    Path(__file__).resolve().parents[3] / "rulebooks" / "stem-racing-development-2026-27.yaml"
)


@router.get("/checks")
def checks(design: str) -> dict[str, object]:
    design_dir = data_root() / "designs" / design
    if not (design_dir / "geometry.json").is_file() or "/" in design or ".." in design:
        raise HTTPException(404, f"design {design!r} not found")
    book = forge.load_rulebook(RULEBOOK)
    return {
        "revision": book["revision"],
        "is_reference_only": book["is_reference_only"],
        "checks": [asdict(c) for c in forge.check_design(design_dir, RULEBOOK)],
    }
