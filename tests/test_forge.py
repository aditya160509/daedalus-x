"""FORGE (T11): margins and states on a synthetic geometry; non-computable rules stay manual."""

from __future__ import annotations

from daedalus import forge

BOOK = {
    "rules": [
        {
            "id": "L",
            "page": 1,
            "name": "len",
            "measure": "length_excl_cartridge",
            "unit": "mm",
            "min": 170,
            "max": 210,
            "penalty": "5",
        },
        {
            "id": "H",
            "page": 1,
            "name": "rw",
            "measure": "rear_wing_bottom",
            "unit": "mm",
            "min": 35,
            "penalty": "10",
        },
        {
            "id": "C",
            "page": 1,
            "name": "chord",
            "measure": "rear_wing_chord",
            "unit": "mm",
            "max": 20,
            "penalty": "5",
            "approx": True,
        },
        {
            "id": "M",
            "page": 1,
            "name": "mass",
            "measure": "mass",
            "unit": "g",
            "min": 60,
            "penalty": "10",
            "computable": False,
        },
    ]
}


def part(group: str, lo: list[float], hi: list[float]) -> dict[str, object]:
    return {
        "label": group,
        "group": group,
        "bbox_min_m": [v / 1000 for v in lo],
        "bbox_max_m": [v / 1000 for v in hi],
    }


GEOM = {
    "parts": [
        part("body", [0, -30, 0], [200, 30, 40]),
        part("rear_wing", [175, -35, 34.5], [200, 35, 40]),
        part("cartridge", [150, -9, 20], [230, 9, 38]),
    ]
}


def test_states_and_margins() -> None:
    c = {x.rule_id: x for x in forge.run_checks(BOOK, GEOM)}
    assert c["L"].value == 200 and c["L"].state == "pass_cad_only"  # cartridge excluded
    assert c["H"].state == "fail_cad" and c["H"].margin == -0.5
    assert c["C"].state == "at_risk"  # bbox estimate never proves a failure
    assert c["M"].state == "manual_review" and c["M"].value is None


def test_measured_rules_declare_only_supported_overlay_axes() -> None:
    """A06 never guesses a dimension axis: only span-like measures carry one."""
    c = {x.rule_id: x for x in forge.run_checks(BOOK, GEOM)}
    assert c["L"].axis == "x"  # length along x
    assert c["H"].axis == "z"  # bottom height
    assert c["C"].axis == "x"  # chord
    assert c["M"].axis is None  # manual rule, no CAD value
    assert forge._measure_axis("front_wing_clearance") is None
    assert forge._measure_axis("front_wing_span") == "y"
