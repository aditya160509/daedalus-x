"""CFD case generation and evaluation tests (no solver needed)."""

import json
from pathlib import Path
from typing import Any

import pytest
import trimesh
from foamlib import FoamFile

from daedalus.cfd import (
    CaseConfig,
    RunResult,
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
    assert meta["template"] == "daedalus-halfcar-v1"
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
    assert cd["endTime"] == 800

    write_case(tmp_path / "b", design, CaseConfig(early_stop_tolerance=None))
    cd = FoamFile(tmp_path / "b/system/controlDict").as_dict()
    assert "earlyStop" not in cd["functions"]

    with pytest.raises(ValueError):
        CaseConfig.preset("ultra")
    q, f = CaseConfig.preset("quick"), CaseConfig.preset("final")
    assert q.base_cell_m > f.base_cell_m and q.surface_level < f.surface_level
