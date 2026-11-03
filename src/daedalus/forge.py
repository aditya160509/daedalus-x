"""FORGE (T11): rulebook checks against CAD geometry (spec §6). CAD-only until measured."""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

import yaml

State = Literal["pass_cad_only", "at_risk", "fail_cad", "manual_review"]
AT_RISK_MM = 1.0  # within 1 mm of a limit is flagged amber: CAD and the build differ by about this
PLANE_OFFSET_MM = 16.0  # reference planes A and B sit 16.0 mm beyond the axle centre lines (T1.17)
WHEEL_SOLID_TOLERANCE = 0.03  # a wheel solid spans the wheel diameter in z within 3 percent
Measures = dict[str, tuple[float, tuple[str, ...]]]


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
    book = yaml.safe_load(path.read_text())
    if not isinstance(book, dict):
        raise TypeError(f"{path} is not a rulebook mapping")
    return {str(k): v for k, v in book.items()}


def measures(geometry: dict[str, object]) -> Measures:
    """Measurements in mm from part bounding boxes.

    The engineering frame has x running from the nose (x = 0) downstream to the tail, y lateral
    and z up with the lowest point on the ground (z = 0).
    """
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
    out.update(_layout_measures(geometry, parts))
    out.update(_feature_measures(geometry, parts))
    return out


def _feature_measures(geometry: dict[str, object], parts: list[dict[str, object]]) -> Measures:
    """Only source-derived named features; never infer notch identity from a legal height."""
    features = geometry.get("forge_features", {})
    if not isinstance(features, dict):
        return {}
    out: Measures = {}
    for group in ("front_wing", "rear_wing"):
        selected = [p for p in parts if p["group"] == group]
        samples = [features.get(str(p["label"]), {}) for p in selected]
        if samples and all("thickness_min_mm" in sample for sample in samples):
            low = min(float(sample["thickness_min_mm"]) for sample in samples)
            high = max(float(sample["thickness_max_mm"]) for sample in samples)
            # Report the sampled extreme with the smallest clearance to the 2-6 mm limits.
            out[f"{group}_thickness"] = (
                low if low - 2.0 <= 6.0 - high else high,
                _label_set(selected),
            )
    notches = [(label, data) for label, data in features.items() if "notch_height_mm" in data]
    if len(notches) == 1:
        label, data = notches[0]
        out["halo_notch_height"] = (float(data["notch_height_mm"]), (label,))
    return out


def _bounds(part: dict[str, object], axis: int) -> tuple[float, float]:
    """Part bounding-box limits along one axis, in mm."""
    lo, hi = part["bbox_min_m"], part["bbox_max_m"]
    return float(lo[axis]) * 1000.0, float(hi[axis]) * 1000.0  # type: ignore[index]


def _label_set(parts: list[dict[str, object]]) -> tuple[str, ...]:
    return tuple(str(p["label"]) for p in parts)


def _axle_x_mm(geometry: dict[str, object], name: str) -> float | None:
    axles = geometry.get("axles")
    if not isinstance(axles, dict) or name not in axles:
        return None
    return float(axles[name]["origin"][0]) * 1000.0  # type: ignore[index]


def _wheel_solids(
    geometry: dict[str, object], parts: list[dict[str, object]], axle: str, radius_m: float
) -> list[dict[str, object]]:
    """Wheel solids of one axle: parts whose height spans the wheel diameter."""
    groups = geometry.get("groups")
    labels = set(groups.get(axle, ())) if isinstance(groups, dict) else set()
    diameter = 2.0 * radius_m * 1000.0
    solids = []
    for p in parts:
        z_lo, z_hi = _bounds(p, 2)
        if (
            p["label"] in labels
            and abs((z_hi - z_lo) - diameter) <= WHEEL_SOLID_TOLERANCE * diameter
        ):
            solids.append(p)
    return solids


def _layout_measures(geometry: dict[str, object], parts: list[dict[str, object]]) -> Measures:
    """Overall layout, wheel and overhang measures that need the axle positions."""
    out: Measures = {}
    wheels = [p for p in parts if p["group"] == "wheels"]
    body_like = [p for p in parts if p["group"] not in ("wheels", "internal")]
    cartridge = [p for p in parts if p["group"] == "cartridge"]
    car = [p for p in parts if p["group"] not in ("cartridge", "internal")]
    track_z = min((_bounds(p, 2)[0] for p in wheels), default=None)
    if track_z is None:
        track_z = min(_bounds(p, 2)[0] for p in parts)
    top = max(_bounds(p, 2)[1] for p in parts if p["group"] != "internal")
    out["height_overall"] = (top - track_z, ())
    if body_like:
        clearance = min(_bounds(p, 2)[0] for p in body_like) - track_z
        out["ground_clearance"] = (clearance, _label_set(body_like))
    nose_x = min(_bounds(p, 0)[0] for p in car)
    tail_x = max(_bounds(p, 0)[1] for p in car)
    body = [p for p in parts if p["group"] == "body"]
    if body:
        low = min(_bounds(p, 0)[0] for p in body)
        high = max(_bounds(p, 0)[1] for p in body)
        out["body_length"] = (high - low, _label_set(body))
    if cartridge:
        reach = max(_bounds(p, 0)[1] for p in cartridge)
        out["cartridge_protrusion"] = (reach - tail_x, _label_set(cartridge))
    front_x, rear_x = _axle_x_mm(geometry, "wheels_front"), _axle_x_mm(geometry, "wheels_rear")
    if front_x is not None:
        out["nose_overhang"] = ((front_x - PLANE_OFFSET_MM) - nose_x, ())
    if rear_x is not None:
        rear_parts = [p for p in car if _bounds(p, 0)[1] > rear_x + PLANE_OFFSET_MM]
        if rear_parts:
            # Whole-part upper bound: conservative where a part crosses plane B.
            out["rear_overhang_height"] = (
                max(_bounds(p, 2)[1] for p in rear_parts) - track_z,
                _label_set(rear_parts),
            )
        wing = [p for p in parts if p["group"] == "rear_wing"]
        if wing:
            out["rear_wing_location"] = (
                min(_bounds(p, 0)[0] for p in wing) - (rear_x + PLANE_OFFSET_MM),
                _label_set(wing),
            )
        out["rear_overhang_length"] = (tail_x - (rear_x + PLANE_OFFSET_MM), ())
    if front_x is not None and rear_x is not None:
        out["wheelbase"] = (abs(rear_x - front_x), ())
    out.update(_wheel_measures(geometry, parts))
    return out


def _wheel_measures(geometry: dict[str, object], parts: list[dict[str, object]]) -> Measures:
    axles = geometry.get("axles")
    out: Measures = {}
    if not isinstance(axles, dict):
        return out
    for axle, prefix in (("wheels_front", "front"), ("wheels_rear", "rear")):
        if axle not in axles:
            continue
        radius_m = float(axles[axle]["radius_m"])
        solids = _wheel_solids(geometry, parts, axle, radius_m)
        labels = _label_set(solids)
        out[f"{prefix}_wheel_diameter"] = (2.0 * radius_m * 1000.0, labels)
        if not solids:
            continue
        out[f"{prefix}_wheel_contact_width"] = (
            min(_bounds(p, 1)[1] - _bounds(p, 1)[0] for p in solids),
            labels,
        )
        features = geometry.get("forge_features", {})
        if isinstance(features, dict):
            bands = [features.get(str(p["label"]), {}) for p in solids]
            if all("rolling_width_mm" in band for band in bands):
                out[f"{prefix}_wheel_contact_width"] = (
                    min(float(band["rolling_width_mm"]) for band in bands),
                    labels,
                )
            if all("rolling_diameter_mm" in band for band in bands):
                diameters = [float(band["rolling_diameter_mm"]) for band in bands]
                out[f"{prefix}_wheel_diameter"] = (
                    min(diameters)
                    if min(diameters) - 28 <= 32 - max(diameters)
                    else max(diameters),
                    labels,
                )
        left = [p for p in solids if sum(_bounds(p, 1)) > 0]
        right = [p for p in solids if sum(_bounds(p, 1)) <= 0]
        if left and right:
            gap = min(_bounds(p, 1)[0] for p in left) - max(_bounds(p, 1)[1] for p in right)
            out[f"{prefix}_wheel_gap"] = (gap, labels)
    return out


@dataclass(frozen=True)
class PointsAtRisk:
    """Penalty points implied by the CAD checks. Manual-review rules are counted, not scored."""

    failing_points: float
    at_risk_points: float
    failing_rules: tuple[str, ...]
    at_risk_rules: tuple[str, ...]
    manual_review_rules: int
    unquantified_rules: tuple[str, ...] = field(default_factory=tuple)


_PENALTY = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*pts?(?:\s*(?:/|per)\s*(mm|g)\b)?")


def penalty_points(penalty: str, margin: float | None) -> float | None:
    """Points charged for a rule with this penalty text and margin (negative means outside).

    A per-mm or per-gram penalty is charged for every whole unit outside the limit, rounded up
    (T2.5.2). Anything else is charged once. Returns None when the text states no points.
    """
    terms = penalty_terms(penalty)
    if terms is None:
        return None
    rate, basis = terms
    if basis is None:
        return rate
    units = math.ceil(max(0.0, -(margin or 0.0)))
    return rate * max(1, units)


def penalty_terms(penalty: str) -> tuple[float, str | None] | None:
    """Rate and proportional unit from a penalty string, or None when no points are stated."""
    match = _PENALTY.match(penalty)
    if match is None:
        return None
    return float(match.group(1)), match.group(2)


def points_at_risk(checks: list[Check]) -> PointsAtRisk:
    """Sum the penalties the CAD checks say are being lost now and those at risk of being lost."""
    failing = at_risk = 0.0
    failing_ids: list[str] = []
    risk_ids: list[str] = []
    unquantified: list[str] = []
    manual = 0
    for c in checks:
        if c.state == "manual_review":
            manual += 1
            continue
        if c.state == "pass_cad_only":
            continue
        points = penalty_points(c.penalty, c.margin)
        if points is None:
            unquantified.append(c.rule_id)
        elif c.state == "fail_cad":
            failing += points
            failing_ids.append(c.rule_id)
        else:
            at_risk += points
            risk_ids.append(c.rule_id)
    return PointsAtRisk(
        failing_points=failing,
        at_risk_points=at_risk,
        failing_rules=tuple(failing_ids),
        at_risk_rules=tuple(risk_ids),
        manual_review_rules=manual,
        unquantified_rules=tuple(unquantified),
    )


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
        if r.get("approx"):
            # Estimates can flag a risk, but neither a CAD pass nor a definite failure.
            state = "at_risk" if margin < AT_RISK_MM else "manual_review"
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
    raw = (design_dir / "geometry.json").read_bytes()
    geometry = json.loads(raw)
    sidecar = design_dir / "forge-features.json"
    if sidecar.is_file():
        derived = json.loads(sidecar.read_text())
        if (
            derived.get("version") == 1
            and derived.get("geometry_sha256") == hashlib.sha256(raw).hexdigest()
            and derived.get("source_sha256") == geometry.get("source_sha256")
        ):
            geometry["forge_features"] = derived["features"]
    return run_checks(load_rulebook(rulebook_path), geometry)


@dataclass(frozen=True)
class FrontierRow:
    rule_id: str
    name: str
    headroom: float  # margin to the nearest limit in the rule's unit; negative means outside
    unit: str
    points_if_one_unit_over: float | None
    limit_side: Literal["min", "max"]


def frontier(checks: list[Check]) -> list[FrontierRow]:
    """T29: every measured rule ranked by how close the design sits to its nearest limit.

    The top of the list is where a millimetre of manufacturing error costs points, so it is
    where to hold tolerances tightest and where a design could be pushed no further.
    """
    rows = []
    for c in checks:
        if c.value is None or c.margin is None:
            continue
        to_min = c.value - c.min if c.min is not None else math.inf
        to_max = c.max - c.value if c.max is not None else math.inf
        rows.append(
            FrontierRow(
                rule_id=c.rule_id,
                name=c.name,
                headroom=c.margin,
                unit=c.unit,
                points_if_one_unit_over=penalty_points(c.penalty, -1.0),
                limit_side="min" if to_min <= to_max else "max",
            )
        )
    return sorted(rows, key=lambda r: r.headroom)
