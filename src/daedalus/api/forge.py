"""FORGE endpoints (T11): rule checks for a design, CAD-only until inspected."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from daedalus import forge, forge_sheet
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


@router.get("/sheet.pdf")
def sheet(design: str = "orbit_baseline", rulebook: str = DEFAULT_RULEBOOK) -> Response:
    """Printable scrutineering sheet: every rule, its limits, the CAD result and blank boxes."""
    path = _rulebook_path(rulebook)
    design_dir = _design_dir(design)
    book = forge.load_rulebook(path)
    results = forge.check_design(design_dir, path)
    pdf = forge_sheet.compile_sheet(forge_sheet.sheet_data(book, results, design=design))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="daedalus-x-scrutineering-sheet.pdf"'},
    )
