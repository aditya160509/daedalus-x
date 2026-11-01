"""CFD case generation and evaluation tests (no solver needed)."""

import json
from pathlib import Path
from typing import Any

import numpy as np
import pytest
import trimesh
from foamlib import FoamFile

from daedalus.cfd import (
    CaseConfig,
    RunResult,
    cd_batch_statistics,
    evaluate,
    read_dat,
    write_case,
)


@pytest.fixture
def design(tmp_path: Path) -> Path:
    d = tmp_path / "design"
    (d / "cfd").mkdir(parents=True)
    for name in ("body", "front_wing"):
        trimesh.creation.box(extents=(0.2, 0.06, 0.04)).export(d / "cfd" / f"{name}.stl")
    (d / "geometry.json").write_text(
        json.dumps({"length_m": 0.2, "width_m": 0.06, "height_m": 0.04, "frontal_area_m2": 0.0024})
    )
    return d


def test_case_dicts_parse_and_carry_parameters(tmp_path: Path, design: Path) -> None:
    case = tmp_path / "case"
    m = write_case(case, design, CaseConfig(speed_m_s=18.0, n_procs=4))
    for rel in ("system/controlDict", "system/blockMeshDict", "system/fvSolution", "0/U"):
        FoamFile(case / rel).as_dict()  # parses as valid OpenFOAM syntax
    cd: Any = FoamFile(case / "system/controlDict").as_dict()
    fc = cd["functions"]["forceCoeffs"]
    assert fc["magUInf"] == pytest.approx(18.0)
    assert fc["Aref"] == pytest.approx(0.0012)  # half model
    assert "forces_front_wing" in cd["functions"]
    assert FoamFile(case / "system/decomposeParDict")["numberOfSubdomains"] == 4
    assert (case / "constant/triSurface/front_wing.stl").exists()
    meta: Any = m
    assert meta["template"] == "daedalus-halfcar-v3"
    assert any("symmetryPlane" in a for a in meta["assumptions"])


def test_case_is_never_overwritten(tmp_path: Path, design: Path) -> None:
    write_case(tmp_path / "c", design, CaseConfig())
    with pytest.raises(FileExistsError):
        write_case(tmp_path / "c", design, CaseConfig())


def test_config_validation() -> None:
    with pytest.raises(ValueError):
        CaseConfig(speed_m_s=0)
    with pytest.raises(ValueError):
        CaseConfig(n_procs=0)


def _fake_outputs(case: Path, cd_values: list[float], group_drag: dict[str, float]) -> None:
    pp = case / "postProcessing"
    (pp / "forceCoeffs/0").mkdir(parents=True)
    rows = "\n".join(f"{i + 1} {v} 0.05 0" for i, v in enumerate(cd_values))
    (pp / "forceCoeffs/0/coefficient.dat").write_text(f"# Time Cd Cl Cs\n{rows}\n")
    for g, fx in group_drag.items():
        (pp / f"forces_{g}/0").mkdir(parents=True)
        (pp / f"forces_{g}/0/force.dat").write_text(
            "# Time total_x total_y total_z pressure_x pressure_y pressure_z "
            "viscous_x viscous_y viscous_z\n"
            f"1 ({fx} 0 0) ({fx * 0.9} 0 0) ({fx * 0.1} 0 0)\n"
        )
    (case / "log.checkMesh").write_text("    cells:            1000\nMesh OK.\n")
    (case / "log.simpleFoam").write_text("SIMPLE solution converged in 900 iterations\n")


def test_evaluate_accepts_stable_consistent_run(tmp_path: Path, design: Path) -> None:
    case = tmp_path / "case"
    write_case(case, design, CaseConfig(speed_m_s=20.0))
    q_aref_half = 0.5 * 1.204 * 20.0**2 * 0.0012
    cd = 0.5
    half_drag = cd * q_aref_half
    _fake_outputs(case, [cd] * 300, {"body": half_drag * 0.7, "front_wing": half_drag * 0.3})
    res = RunResult(case_dir=str(case), succeeded=True)
    evaluate(case, res)
    assert res.acceptance == "pending_review", res.reasons
    assert res.cells == 1000 and res.mesh_ok and res.converged_by_residuals
    assert res.forces_n["body"]["drag_x"] == pytest.approx(2 * half_drag * 0.7)
    assert res.force_sum_check["relative_difference"] < 1e-9


def test_evaluate_rejects_unstable_cd_and_bad_force_sum(tmp_path: Path, design: Path) -> None:
    case = tmp_path / "case"
    write_case(case, design, CaseConfig())
    _fake_outputs(case, [0.5, 0.6] * 150, {"body": 0.001})
    res = RunResult(case_dir=str(case), succeeded=True)
    evaluate(case, res)
    assert res.acceptance == "rejected"
    assert any("Cd not stable" in r for r in res.reasons)
    assert any("component force sum" in r for r in res.reasons)


def test_read_dat_handles_vector_columns(tmp_path: Path) -> None:
    p = tmp_path / "f.dat"
    p.write_text("# Time a\n1 (1 2 3)\n2 (4 5 6)\n")
    _, d = read_dat(p)
    assert d.shape == (2, 4)


def test_read_dat_tolerates_text_columns(tmp_path: Path) -> None:
    p = tmp_path / "solverInfo.dat"
    p.write_text("# Time U_solver Ux_initial U_converged\n1 smoothSolver 0.01 false\n")
    names, d = read_dat(p)
    assert names == ["Time", "U_solver", "Ux_initial", "U_converged"]
    assert d[0, 2] == pytest.approx(0.01)


def test_early_stop_function_object_and_presets(tmp_path: Path, design: Path) -> None:
    write_case(tmp_path / "a", design, CaseConfig.preset("quick", n_procs=2))
    cd: Any = FoamFile(tmp_path / "a/system/controlDict").as_dict()
    cond = cd["functions"]["earlyStop"]["conditions"]["cdSteady"]
    assert cond["functionObject"] == "forceCoeffs" and cond["window"] == 150
    assert cd["endTime"] == 1200

    write_case(tmp_path / "b", design, CaseConfig(early_stop_tolerance=None))
    cd_b: Any = FoamFile(tmp_path / "b/system/controlDict").as_dict()
    assert "earlyStop" not in cd_b["functions"]

    with pytest.raises(ValueError):
        CaseConfig.preset("ultra")
    q, f = CaseConfig.preset("quick"), CaseConfig.preset("final")
    assert q.base_cell_m > f.base_cell_m and q.surface_level < f.surface_level


def _wheel_design(design: Path, *, legacy: bool = False) -> None:
    g = json.loads((design / "geometry.json").read_text())
    if legacy:
        (design / "cfd/wheels.stl").write_bytes((design / "cfd/body.stl").read_bytes())
    else:
        g["schema_version"] = 2
        g["axles"] = {
            name: {"axis": [0, 1, 0], "origin": [x, 0, 0.015], "radius_m": 0.015}
            for name, x in (("wheels_front", 0.04), ("wheels_rear", 0.16))
        }
        for name in g["axles"]:
            (design / f"cfd/{name}.stl").write_bytes((design / "cfd/body.stl").read_bytes())
    (design / "geometry.json").write_text(json.dumps(g))


def test_rotating_wheels_contact_sign_and_parent_forces(tmp_path: Path, design: Path) -> None:
    _wheel_design(design)
    case = tmp_path / "rotating"
    manifest = write_case(case, design, CaseConfig(speed_m_s=20))
    u: Any = FoamFile(case / "0/U").as_dict()["boundaryField"]
    for name in ("wheels_front", "wheels_rear"):
        bc = u[name]
        assert bc["type"] == "rotatingWallVelocity"
        origin = np.asarray(bc["origin"])
        omega = float(bc["omega"]) * np.asarray(bc["axis"])
        contact = origin - [0, 0, 0.015]
        assert np.cross(omega, contact - origin) == pytest.approx([20, 0, 0], rel=1e-5)
    control: Any = FoamFile(case / "system/controlDict").as_dict()
    assert set(control["functions"]["forces_wheels"]["patches"]) == {"wheels_front", "wheels_rear"}
    assert manifest["warnings"] == []
    assert "ω = U/r" in str(manifest["assumptions"])
    conditions = control["functions"]["earlyStop"]["conditions"]
    assert conditions["minimumIterations"]["duration"] == 1000
    assert conditions["minimumIterations"]["groupID"] == conditions["cdSteady"]["groupID"]
    solution: Any = FoamFile(case / "system/fvSolution").as_dict()
    assert "residualControl" not in solution["SIMPLE"]


def test_legacy_wheels_fall_back_with_warning_and_steady_override(
    tmp_path: Path, design: Path
) -> None:
    _wheel_design(design, legacy=True)
    case = tmp_path / "legacy"
    manifest = write_case(case, design, CaseConfig(acceptance_mode="steady"))
    assert "no axle metadata" in str(manifest["warnings"])
    assert "rotatingWallVelocity" not in (case / "0/U").read_text()
    assert '"wheels"' not in (case / "0/U").read_text()  # grouped wall regex retains noSlip
    control: Any = FoamFile(case / "system/controlDict").as_dict()
    assert "minimumIterations" not in control["functions"]["earlyStop"]["conditions"]
    write_case(tmp_path / "legacy_auto", design, CaseConfig())
    assert (
        json.loads((tmp_path / "legacy_auto/daedalus_manifest.json").read_text())["config"][
            "acceptance_mode"
        ]
        == "averaged"
    )


def test_mesh_quality_and_snap_controls_are_explicit(tmp_path: Path, design: Path) -> None:
    case = tmp_path / "mesh"
    write_case(case, design, CaseConfig())
    quality: Any = FoamFile(case / "system/meshQualityDict").as_dict()
    expected = dict(
        maxNonOrtho=65,
        maxBoundarySkewness=20,
        maxInternalSkewness=4,
        maxConcave=80,
        minVol=1e-13,
        minTetQuality=1e-15,
        minTwist=0.02,
        minDeterminant=0.001,
        minFaceWeight=0.05,
        minVolRatio=0.01,
        nSmoothScale=4,
        errorReduction=0.75,
    )
    for key, value in expected.items():
        assert quality[key] == pytest.approx(value)
    assert "#includeEtc" not in (case / "system/meshQualityDict").read_text()
    snap: Any = FoamFile(case / "system/snappyHexMeshDict").as_dict()["snapControls"]
    for key, value in dict(
        nSmoothPatch=5, tolerance=2, nSolveIter=50, nRelaxIter=8, nFeatureSnapIter=15
    ).items():
        assert snap[key] == value
    assert snap["implicitFeatureSnap"] is False and snap["explicitFeatureSnap"] is True


def test_batch_means_ar1_known_mean_and_correction() -> None:
    rng = np.random.default_rng(17)
    values = np.zeros(10000)
    for i in range(1, len(values)):
        values[i] = 0.8 * values[i - 1] + rng.normal(0, 0.002)
    mean, ci = cd_batch_statistics(0.6 + values[-500:])
    assert mean == pytest.approx(0.6, abs=0.002)
    assert ci[0] < 0.6 < ci[1]
    assert (ci[1] - ci[0]) / 2 / mean < 0.01
    # Positive batch correlation must inflate rather than shrink the independent estimate.
    from scipy.stats import t

    batches = (0.6 + values[-500:]).reshape(10, 50).mean(axis=1)
    independent = t.ppf(0.975, 9) * batches.std(ddof=1) / np.sqrt(10)
    assert (ci[1] - ci[0]) / 2 >= independent - 1e-12
    assert cd_batch_statistics(np.full(500, 0.6))[1] == pytest.approx([0.6, 0.6])
    with pytest.raises(ValueError):
        cd_batch_statistics(np.ones(499))
    with pytest.raises(ValueError):
        cd_batch_statistics(np.full(500, np.nan))


def _averaged_outputs(case: Path, cd_values: list[float]) -> None:
    q = 0.5 * 1.204 * 20**2 * 0.0012
    _fake_outputs(case, cd_values, {})
    wing = case / "postProcessing/forces_front_wing/0/force.dat"
    wing.parent.mkdir(parents=True)
    wing.write_text(
        "\n".join(f"{i + 1} (0 0 0) (0 0 0) (0 0 0)" for i in range(len(cd_values))) + "\n"
    )
    f = case / "postProcessing/forces_body/0/force.dat"
    f.parent.mkdir(parents=True)
    f.write_text(
        "\n".join(
            f"{i + 1} ({cd * q} 0 0) ({cd * q * 0.9} 0 0) ({cd * q * 0.1} 0 0)"
            for i, cd in enumerate(cd_values)
        )
        + "\n"
    )


def test_averaged_window_forces_and_ci_vs_strict_gate(tmp_path: Path, design: Path) -> None:
    case = tmp_path / "average"
    write_case(case, design, CaseConfig(acceptance_mode="averaged"))
    vals = [0.8] * 500 + [0.49, 0.51] * 250
    _averaged_outputs(case, vals)
    res = RunResult(case_dir=str(case), succeeded=True)
    evaluate(case, res)
    assert res.acceptance == "pending_review", res.reasons
    assert res.acceptance_mode == "averaged" and res.cd == pytest.approx(0.5)
    assert res.cd_mean == pytest.approx(0.5) and res.cd_ci95 is not None
    assert res.cd_window_spread == pytest.approx(0.04)
    assert res.force_sum_check["relative_difference"] < 1e-9
    manifest = json.loads((case / "daedalus_manifest.json").read_text())
    manifest["config"]["acceptance_mode"] = "steady"
    (case / "daedalus_manifest.json").write_text(json.dumps(manifest))
    strict = RunResult(case_dir=str(case), succeeded=True)
    evaluate(case, strict)
    assert strict.acceptance == "rejected"


@pytest.mark.parametrize("kind", ["short", "drift", "mesh", "nonfinite", "misaligned"])
def test_averaged_gate_fails_closed(tmp_path: Path, design: Path, kind: str) -> None:
    case = tmp_path / kind
    write_case(case, design, CaseConfig(acceptance_mode="averaged"))
    vals = [0.5] * 1000
    if kind == "short":
        vals = vals[:499]
    elif kind == "drift":
        vals = np.linspace(0.3, 0.7, 1000).tolist()
    elif kind == "nonfinite":
        vals[-1] = float("nan")
    _averaged_outputs(case, vals)
    if kind == "mesh":
        (case / "log.checkMesh").write_text("*** 9 highly skewed faces\nMesh OK.\n")
    if kind == "misaligned":
        f = case / "postProcessing/forces_body/0/force.dat"
        f.write_text("\n".join(f.read_text().splitlines()[:-1]))
    res = RunResult(case_dir=str(case), succeeded=True)
    evaluate(case, res)
    assert res.acceptance == "rejected", res
