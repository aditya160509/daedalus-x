"""Beam FEM (T21) against textbook solutions. Dimensions are illustrative, not the real car."""

from __future__ import annotations

import math

import pytest

from daedalus.structure import (
    MATERIALS,
    RULE_LOAD_TESTS,
    Material,
    Section,
    StructureError,
    hanging_load_n,
    solve_beam,
)

AL = MATERIALS["aluminium_6061_t6"]
ROD = Section.circle(0.003)
EI = AL.youngs_modulus_pa * ROD.second_moment_m4


def test_cantilever_tip_load_matches_pl3_over_3ei() -> None:
    p, length = 1.0, 0.03
    r = solve_beam(length, ROD, AL, supports={0.0: "fixed"}, point_loads_n={length: p})
    assert r.max_deflection_m == pytest.approx(p * length**3 / (3 * EI), rel=1e-9)
    assert r.max_moment_nm == pytest.approx(p * length, rel=1e-6)


def test_simply_supported_udl_matches_5wl4_over_384ei() -> None:
    q, length = 10.0, 0.05
    r = solve_beam(
        length, ROD, AL, supports={0.0: "pinned", length: "pinned"}, distributed_n_per_m=q
    )
    assert r.max_deflection_m == pytest.approx(5 * q * length**4 / (384 * EI), rel=1e-6)
    assert r.max_moment_nm == pytest.approx(q * length**2 / 8, rel=0.01)


def test_fixed_fixed_central_load_matches_pl3_over_192ei() -> None:
    p, length = 2.0, 0.06
    r = solve_beam(
        length, ROD, AL, supports={0.0: "fixed", length: "fixed"}, point_loads_n={length / 2: p}
    )
    assert r.max_deflection_m == pytest.approx(p * length**3 / (192 * EI), rel=1e-6)
    assert r.max_moment_nm == pytest.approx(p * length / 8, rel=0.01)


def test_stress_and_safety_factor() -> None:
    p, length = 1.0, 0.03
    r = solve_beam(length, ROD, AL, supports={0.0: "fixed"}, point_loads_n={length: p})
    stress = p * length * (0.0015) / ROD.second_moment_m4
    assert r.max_stress_pa == pytest.approx(stress, rel=1e-6)
    assert r.safety_factor == pytest.approx(AL.strength_pa / stress, rel=1e-6)
    assert r.to_mapping()["material_source"] == "estimated"


def test_a_thicker_wing_deflects_less() -> None:
    abs_ = MATERIALS["abs"]
    load = {0.025: hanging_load_n(0.05)}
    thin = solve_beam(
        0.025, Section.rectangle(0.02, 0.002), abs_, supports={0.0: "fixed"}, point_loads_n=load
    )
    thick = solve_beam(
        0.025, Section.rectangle(0.02, 0.004), abs_, supports={0.0: "fixed"}, point_loads_n=load
    )
    assert thick.max_deflection_m == pytest.approx(thin.max_deflection_m / 8, rel=1e-6)


def test_rule_load_tests_are_recorded() -> None:
    assert RULE_LOAD_TESTS["T6.3 tether guide"] == 0.2
    assert hanging_load_n(0.1) == pytest.approx(0.980665)


def test_sections() -> None:
    assert Section.rectangle(0.01, 0.002).second_moment_m4 == pytest.approx(0.01 * 0.002**3 / 12)
    assert Section.tube(0.004, 0.0).second_moment_m4 == pytest.approx(
        Section.circle(0.004).second_moment_m4
    )
    assert Section.circle(0.002).second_moment_m4 == pytest.approx(math.pi * 0.002**4 / 64)
    with pytest.raises(StructureError):
        Section.tube(0.002, 0.003)


def test_unsupported_beams_and_bad_inputs_are_rejected() -> None:
    with pytest.raises(StructureError, match="mechanism"):
        solve_beam(0.03, ROD, AL, supports={0.0: "pinned"}, point_loads_n={0.03: 1.0})
    with pytest.raises(StructureError):
        solve_beam(0.03, ROD, AL, supports={0.05: "fixed"})
    with pytest.raises(StructureError):
        Material("bad", 0.0, 1.0, "estimated")


def test_plot_arrays_match_beam_stress_and_zero_load_is_json_safe() -> None:
    import json

    loaded = solve_beam(0.03, ROD, AL, supports={0.0: "fixed"}, point_loads_n={0.03: 1.0})
    mapped = loaded.to_mapping()
    assert len(mapped["stress_mpa"]) == len(loaded.x_m)
    assert max(mapped["stress_mpa"]) == pytest.approx(loaded.max_stress_pa / 1e6)
    assert max(abs(m) for m in mapped["moment_nmm"]) == pytest.approx(30.0)
    unloaded = solve_beam(0.03, ROD, AL, supports={0.0: "fixed"})
    assert unloaded.to_mapping()["safety_factor"] is None
    assert all(stress == 0 for stress in unloaded.to_mapping()["stress_mpa"])
    json.dumps(unloaded.to_mapping(), allow_nan=False)
