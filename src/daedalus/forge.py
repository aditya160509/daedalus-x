"""FORGE (T11): rulebook checks against CAD geometry (spec §6). CAD-only until measured."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import yaml

State = Literal["pass_cad_only", "at_risk", "fail_cad", "manual_review"]
AT_RISK_MM = 1.0  # within 1 mm of a limit is flagged amber: CAD and the build differ by about this


@dataclass(frozen=True)
class Check:
    rule_id: str
    name: str
    page: int
    unit: str
    value: float | None
    min: float | None
    max: float | None
    margin: float | None
    state: State
    penalty: str
    parts: tuple[str, ...]
    note: str


def load_rulebook(path: Path) -> dict[str, object]:
    return yaml.safe_load(path.read_text())


def measures(geometry: dict[str, object]) -> dict[str, tuple[float, tuple[str, ...]]]:
    """Measurements in mm from part bounding boxes (x forward, y lateral, z up, ground z=0)."""
    parts = geometry["parts"]
    if not isinstance(parts, list):
        raise TypeError("geometry.parts must be a list")
    by: dict[str, list[dict[str, object]]] = {}
    for p in parts:
        by.setdefault(str(p["group"]), []).append(p)

    def box(group: str) -> tuple[list[float], list[float], tuple[str, ...]]:
        ps = by.get(group, [])
        lo = [min(float(p["bbox_min_m"][i]) for p in ps) * 1000 for i in range(3)]  # type: ignore[index]
        hi = [max(float(p["bbox_max_m"][i]) for p in ps) * 1000 for i in range(3)]  # type: ignore[index]
        return lo, hi, tuple(str(p["label"]) for p in ps)

    out: dict[str, tuple[float, tuple[str, ...]]] = {}
    car = [g for g in by if g != "cartridge"]
    lo = [min(box(g)[0][i] for g in car) for i in range(3)]
    hi = [max(box(g)[1][i] for g in car) for i in range(3)]
    out["length_excl_cartridge"] = (hi[0] - lo[0], ())
    out["width"] = (hi[1] - lo[1], ())
    if "cartridge" in by:
        c_lo, c_hi, c_parts = box("cartridge")
        out["cartridge_centre_height"] = ((c_lo[2] + c_hi[2]) / 2 - lo[2], c_parts)
    for g in ("front_wing", "rear_wing"):
        if g in by:
            w_lo, w_hi, w_parts = box(g)
            out[f"{g}_span"] = (w_hi[1] - w_lo[1], w_parts)
            out[f"{g}_chord"] = (w_hi[0] - w_lo[0], w_parts)
            out[f"{g}_bottom"] = (w_lo[2] - lo[2], w_parts)
    return out


def run_checks(rulebook: dict[str, object], geometry: dict[str, object]) -> list[Check]:
    m = measures(geometry)
    checks = []
    rules = rulebook["rules"]
    if not isinstance(rules, list):
        raise TypeError("rulebook.rules must be a list")
    for r in rules:
        lo, hi = r.get("min"), r.get("max")
        got = m.get(r["measure"]) if r.get("computable", True) else None
        if got is None:
            checks.append(
                Check(
                    r["id"],
                    r["name"],
                    r["page"],
                    r["unit"],
                    None,
                    lo,
                    hi,
                    None,
                    "manual_review",
                    r["penalty"],
                    (),
                    r.get("note", "measure on the car"),
                )
            )
            continue
        v, parts = got
        margin = min(
            v - lo if lo is not None else float("inf"), hi - v if hi is not None else float("inf")
        )
        state: State = (
            "fail_cad" if margin < 0 else "at_risk" if margin < AT_RISK_MM else "pass_cad_only"
        )
        if state == "fail_cad" and r.get("approx"):
            state = "at_risk"  # a bounding-box estimate cannot prove a failure
        checks.append(
            Check(
                r["id"],
                r["name"],
                r["page"],
                r["unit"],
                round(v, 2),
                lo,
                hi,
                round(margin, 2),
                state,
                r["penalty"],
                parts,
                r.get("note", ""),
            )
        )
    return checks


def check_design(design_dir: Path, rulebook_path: Path) -> list[Check]:
    return run_checks(
        load_rulebook(rulebook_path), json.loads((design_dir / "geometry.json").read_text())
    )
