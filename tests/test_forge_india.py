"""FORGE with the India NF 2025-26 rulebook (ORDER 1): rules, measures, points at risk, sheet.

Geometry here is synthetic and only exercises the measures; it is not data about the real car.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from daedalus import forge, forge_sheet

BOOK_PATH = Path(__file__).resolve().parents[1] / "rulebooks" / "stem-racing-india-nf-2025-26.yaml"

# Competition Regulations C3.6.2: the rules highlighted as Performance
PERFORMANCE_RULES = [
    "T3.3",
    "T3.6",
    "T4.2",
    "T4.4.1",
    "T5.6",
    "T7.2",
    "T7.3",
    "T7.4",
    "T7.5",
    "T7.6",
    "T7.7",
    "T7.8",
    "T7.9",
    "T7.10",
    "T7.11",
    "T8.6.1",
    "T8.6.2",
    "T8.6.3",
    "T8.7",
    "T8.8",
    "T9.5.1",
    "T9.5.2",
    "T9.5.3",
    "T9.6",
    "T9.7",
]
# Competition Regulations C4.5: the Safe/Fit to race rules that get the 10-minute service fix
SAFE_TO_RACE_RULES = [
    "T3.2",
    "T4.4.4",
    "T4.4.5",
    "T5.1",
    "T5.3",
    "T5.4",
    "T5.5",
    "T5.6",
    "T6.1",
    "T6.2",
    "T6.3",
    "T7.13",
]


def part(label: str, group: str, lo: list[float], hi: list[float]) -> dict[str, object]:
    return {
        "label": label,
        "group": group,
        "bbox_min_m": [v / 1000 for v in lo],
        "bbox_max_m": [v / 1000 for v in hi],
    }


def axle(x_mm: float, radius_mm: float) -> dict[str, object]:
    return {
        "axis": [0, 1, 0],
        "origin": [x_mm / 1000, 0, radius_mm / 1000],
        "radius_m": radius_mm / 1000,
    }


def car(
    *,
    wheelbase: float = 130.0,
    front_gap: float = 40.0,
    rear_gap: float = 32.0,
    wheel_diameter: float = 30.0,
    body_floor: float = 3.0,
    cartridge_end: float = 212.0,
    axles: bool = True,
) -> dict[str, object]:
    """Nose at x = 0, tail downstream, front axle at x = 40 mm; wheels on the track at z = 0."""
    front_x, rear_x = 40.0, 40.0 + wheelbase
    r = wheel_diameter / 2
    fy, ry = front_gap / 2, rear_gap / 2

    def wheel(label: str, x: float, y_in: float, width: float, side: int) -> dict[str, object]:
        lo, hi = sorted((side * y_in, side * (y_in + width)))
        return part(label, "wheels", [x - r, lo, 0.0], [x + r, hi, wheel_diameter])

    parts = [
        part("Main Body", "body", [20, -15, body_floor], [190, 15, 40]),
        part("Front Wing", "front_wing", [0, -30, 3.0], [20, 30, 12]),
        part("Rear Wing", "rear_wing", [185, -30, 40], [205, 30, 55]),
        part("CO2 Cartridge", "cartridge", [160, -9, 28], [cartridge_end, 9, 46]),
        wheel("wheel_FL", front_x, fy, 14.0, 1),
        wheel("wheel_FR", front_x, fy, 14.0, -1),
        wheel("wheel_RL", rear_x, ry, 19.0, 1),
        wheel("wheel_RR", rear_x, ry, 19.0, -1),
        part("axle_front", "wheels", [front_x - 3, -fy, 12], [front_x + 3, fy, 18]),
    ]
    geometry: dict[str, object] = {
        "parts": parts,
        "groups": {
            "wheels_front": ["wheel_FL", "wheel_FR", "axle_front"],
            "wheels_rear": ["wheel_RL", "wheel_RR"],
        },
    }
    if axles:
        geometry["axles"] = {
            "wheels_front": axle(front_x, r),
            "wheels_rear": axle(rear_x, r),
        }
    return geometry


def results(geometry: dict[str, object]) -> dict[str, forge.Check]:
    book = forge.load_rulebook(BOOK_PATH)
    return {c.rule_id: c for c in forge.run_checks(book, geometry)}


def covers(rule_id: str, key: str) -> bool:
    """True when `rule_id` is `key` or a numbered or suffixed child of it (T7.4.1, T7.5-F)."""
    return rule_id == key or rule_id.startswith((key + ".", key + "-"))


def test_rulebook_is_well_formed() -> None:
    book = forge.load_rulebook(BOOK_PATH)
    rules = book["rules"]
    assert isinstance(rules, list)
    ids = [r["id"] for r in rules]
    assert len(ids) == len(set(ids))
    for r in rules:
        assert {"id", "page", "name", "measure", "unit", "penalty", "class"} <= set(r)
        assert r["class"] in {"general", "safety", "performance"}
        assert isinstance(r["page"], int) and 1 <= r["page"] <= 58
    assert book["is_reference_only"] is False


def test_performance_rules_match_the_competition_regulations_list() -> None:
    rules = forge.load_rulebook(BOOK_PATH)["rules"]
    performance = [r["id"] for r in rules if r["class"] == "performance"]  # type: ignore[index]
    for rule_id in performance:
        assert any(covers(rule_id, key) for key in PERFORMANCE_RULES), rule_id
    for key in PERFORMANCE_RULES:
        assert any(covers(rule_id, key) for rule_id in performance), key


def test_safe_to_race_rules_match_the_competition_regulations_list() -> None:
    rules = forge.load_rulebook(BOOK_PATH)["rules"]
    rectify = sorted(r["id"] for r in rules if r.get("rectify"))  # type: ignore[index]
    assert rectify == sorted(SAFE_TO_RACE_RULES)


def test_every_rule_gets_a_state_and_manual_rules_are_never_green() -> None:
    checks = results(car())
    valid = {"pass_cad_only", "at_risk", "fail_cad", "manual_review"}
    assert all(c.state in valid for c in checks.values())
    book = forge.load_rulebook(BOOK_PATH)
    for rule in book["rules"]:  # type: ignore[attr-defined]
        if not rule.get("computable", True):
            assert checks[rule["id"]].state == "manual_review"
            assert checks[rule["id"]].value is None


def test_baseline_layout_measures() -> None:
    c = results(car())
    assert c["T3.4"].value == 70.0  # widest part: rear wheels, 2 x 35 mm
    assert c["T3.5"].value == 55.0  # tallest feature: the rear wing top
    assert c["T3.7"].value == 3.0  # lowest non-wheel part above the track
    assert c["T7.3"].value == 130.0
    assert c["T7.5-F"].value == 30.0 and c["T7.5-R"].value == 30.0
    assert c["T7.4.1"].value == 14.0 and c["T7.4.2"].value == 19.0
    assert c["T7.2.1"].value == 40.0 and c["T7.2.2"].value == 32.0
    assert c["T8.2"].value == 24.0  # plane A is 16 mm ahead of the front axle at x = 40
    assert c["T9.4.2"].value == 19.0  # tail at 205, plane B at 170 + 16
    assert c["T5.6"].value == 7.0  # cartridge sticks out 7 mm beyond the rear wing
    assert c["T5.2"].value == 37.0  # cartridge centre height
    assert c["T2.7.1-L"].value == 170.0
    assert [i for i, ch in c.items() if ch.state in {"fail_cad", "at_risk"}] == ["T9.4.1"]


def test_axle_bushes_are_not_counted_as_wheels() -> None:
    c = results(car())
    assert "axle_front" not in c["T7.4.1"].parts
    assert set(c["T7.4.1"].parts) == {"wheel_FL", "wheel_FR"}


def test_failures_are_detected_with_margins() -> None:
    c = results(car(wheelbase=118.0, front_gap=36.0, wheel_diameter=26.5, cartridge_end=203.0))
    assert c["T7.3"].state == "fail_cad" and c["T7.3"].margin == -2.0
    assert c["T7.2.1"].state == "fail_cad" and c["T7.2.1"].margin == -2.0
    assert c["T7.5-F"].state == "fail_cad"
    # cartridge ends 2 mm short of the rear wing: protrusion -2 mm against a 5 mm minimum
    assert c["T5.6"].value == -2.0
    assert c["T5.6"].state == "fail_cad" and c["T5.6"].margin == -7.0


def test_a_car_without_axle_data_falls_back_to_manual_review() -> None:
    c = results(car(axles=False))
    for rule_id in ("T7.3", "T7.5-F", "T7.5-R", "T8.2", "T9.4.2", "T7.4.1", "T7.2.1"):
        assert c[rule_id].state == "manual_review", rule_id
    assert c["T3.4"].state != "manual_review"


def test_penalty_points_are_proportional_per_whole_unit() -> None:
    assert forge.penalty_points("5 pts/mm PP", -2.3) == 15.0  # rounds up to 3 whole mm
    assert forge.penalty_points("5 pts/mm PP", 0.4) == 5.0  # at risk: one unit if it fails
    assert forge.penalty_points("10 pts/g PP", -0.1) == 10.0
    assert forge.penalty_points("10 pts", -4.0) == 10.0  # flat
    assert forge.penalty_points("2.5 pts per wheel", None) == 2.5
    assert forge.penalty_points("not stated in the text", -1.0) is None


def test_points_at_risk_sums_failures() -> None:
    checks = forge.run_checks(
        forge.load_rulebook(BOOK_PATH),
        car(wheelbase=118.0, front_gap=36.0, cartridge_end=203.0),
    )
    risk = forge.points_at_risk(checks)
    # T7.3: 5 pts/mm x 2; T7.2.1: 2.5 pts/mm x 2; T5.6: 10 pts/mm x 7 (margin -7 vs the minimum)
    assert risk.failing_points == 10.0 + 5.0 + 70.0
    assert set(risk.failing_rules) == {"T7.3", "T7.2.1", "T5.6"}
    assert risk.at_risk_points == 0.0
    assert risk.manual_review_rules > 40
    assert risk.unquantified_rules == ()


def test_at_risk_rules_are_scored_separately() -> None:
    checks = forge.run_checks(forge.load_rulebook(BOOK_PATH), car(front_gap=38.4))
    risk = forge.points_at_risk(checks)
    assert "T7.2.1" in risk.at_risk_rules  # 0.4 mm margin
    assert risk.at_risk_points == 2.5
    assert risk.failing_points == 10.0  # rear wing starts 1 mm ahead of plane B


def test_sheet_rows_cover_every_rule_and_compile_to_pdf() -> None:
    book = forge.load_rulebook(BOOK_PATH)
    checks = forge.run_checks(book, car(wheelbase=118.0))
    data = forge_sheet.sheet_data(
        book, checks, design="synthetic", generated="2026-11-02 00:00 UTC"
    )
    assert len(data["rows"]) == len(book["rules"])  # type: ignore[arg-type]
    assert data["failing_points"] == 10.0
    assert forge_sheet.limit_text(65.0, 85.0, "mm") == "65 to 85 mm"
    assert forge_sheet.limit_text(50.0, None, "g") == ">= 50 g"
    assert forge_sheet.limit_text(None, None, "check") == "check"
    pdf = forge_sheet.compile_sheet(data)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 5_000


def test_sheet_rejects_mismatched_checks() -> None:
    book = forge.load_rulebook(BOOK_PATH)
    checks = forge.run_checks(book, car())
    with pytest.raises(ValueError):
        forge_sheet.sheet_data(book, checks[:-1], design="x")


def test_frontier_ranks_the_tightest_rule_first() -> None:
    checks = forge.run_checks(forge.load_rulebook(BOOK_PATH), car(front_gap=38.4))
    rows = forge.frontier(checks)
    assert rows[0].rule_id == "T9.4.1"  # rear wing is 1 mm ahead of plane B
    assert next(r for r in rows if r.rule_id == "T7.2.1").headroom == pytest.approx(0.4)
    assert rows[0].limit_side == "min"
    assert rows[0].points_if_one_unit_over == 10.0
    assert [r.headroom for r in rows] == sorted(r.headroom for r in rows)
    assert all(r.rule_id != "T3.6" for r in rows)  # mass is not measured from CAD


def test_estimates_never_prove_a_pass() -> None:
    c = results(car())
    for rule in ("T8.6.1", "T8.6.2", "T7.4.1", "T9.4.3"):
        assert c[rule].value is not None
        assert c[rule].state == "manual_review"


def test_sampled_thickness_uses_worst_extreme() -> None:
    geometry = car()
    geometry["forge_features"] = {
        "Front Wing": {"thickness_min_mm": 3.0, "thickness_max_mm": 7.5},
        "halo_notch": {"notch_height_mm": 34.2},
    }
    c = results(geometry)
    assert c["T8.6.3"].value == 7.5
    assert c["T8.6.3"].state == "at_risk"
    assert c["T4.4.4"].value == 34.2
    assert c["T4.4.4"].parts == ("halo_notch",)
