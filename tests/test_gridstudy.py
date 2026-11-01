"""Independent convergence references and actual queued study contracts, no CFD solves."""

import json
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from daedalus.api import create_app
from daedalus.cfd import CarGeometry, CaseConfig, Domain
from daedalus.gridstudy import convergence, report, speed_sensitivity, submit
from daedalus.jobs import JobQueue


def test_nasa_worked_reference_three_significant_figures() -> None:
    # NASA/NPARC published pressure-recovery example, fine -> coarse.
    result = convergence((0.97050, 0.96854, 0.96178), (1, 2, 4))
    assert result.status == "monotonic"
    assert result.order == pytest.approx(1.786170, rel=5e-6)
    assert result.extrapolated_cd == pytest.approx(0.97130, rel=5e-6)
    assert result.gci_fine_pct == pytest.approx(0.103083, rel=5e-6)
    assert result.asymptotic_ratio == pytest.approx(1.002019, rel=5e-6)


def test_unequal_refinement_reproduces_analytic_second_order() -> None:
    h = (0.01, 0.015, 0.025)
    values = tuple(0.6 + 2 * x**2 for x in h)
    result = convergence((values[0], values[1], values[2]), h)
    assert result.order == pytest.approx(2)
    assert result.extrapolated_cd == pytest.approx(0.6)


@pytest.mark.parametrize(
    ("values", "status"),
    [
        ((0.6, 0.7, 0.65), "oscillatory"),
        ((0.6, 0.8, 0.9), "divergent"),
        ((0.6, 0.6, 0.6), "indeterminate"),
    ],
)
def test_does_not_invent_gci(values: tuple[float, float, float], status: str) -> None:
    result = convergence(values, (1, 1.5, 2.25))
    assert result.status == status
    assert result.order is None and result.gci_fine_pct is None


def test_speed_regression_and_ci_limits() -> None:
    re = [10000.0, 20000.0, 30000.0]
    y = [0.6 + 0.1 * np.log(x / 10000) for x in re]
    fitted = speed_sensitivity(re, y, [(v - 0.001, v + 0.001) for v in y])
    assert fitted["slope"] == pytest.approx(0.1)
    assert fitted["re_insensitive_within_ci"] is False
    constant = speed_sensitivity(re, [0.6] * 3, [(0.599, 0.601)] * 3)
    assert constant["re_insensitive_within_ci"] is True
    with pytest.raises(ValueError):
        speed_sensitivity([0, 1, 2], [1, 2, 3], [(1, 1)] * 3)


def design(root: Path) -> None:
    folder = root / "designs/car_one"
    (folder / "cfd").mkdir(parents=True)
    (folder / "cfd/body.stl").write_text("surface path only; no solver in this test")
    (folder / "geometry.json").write_text(
        json.dumps(
            {
                "length_m": 0.2,
                "width_m": 0.07,
                "height_m": 0.05,
                "frontal_area_m2": 0.0025,
            }
        )
    )


def test_plan_queues_five_runs_and_domain_is_fixed(tmp_path: Path) -> None:
    design(tmp_path)
    queue = JobQueue(tmp_path)
    plan = submit(queue, "car_one", "study_one", fidelity="quick")
    assert len(queue.list()) == 5
    jobs = [json.loads(j.params_json) for j in queue.list()]
    medium = next(j for j in jobs if j["run"].endswith("grid_medium"))
    assert medium["speed"] == 20 and medium["base_cell_m"] == pytest.approx(0.045)
    car = CarGeometry.from_design_dir(tmp_path / "designs/car_one")
    domains = [
        Domain.around(
            car, CaseConfig(base_cell_m=j["base_cell_m"], domain_cell_m=j["domain_cell_m"])
        )
        for j in jobs
    ]
    assert all(d == domains[0] for d in domains)
    assert plan["state"] == "queued"
    with pytest.raises(FileExistsError):
        submit(queue, "car_one", "study_one")
    summary = report(tmp_path, "study_one")
    assert summary["gci"] is None and summary["speed_check"] is None


def test_report_and_api_refuse_rejected_inference(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    design(tmp_path)
    submit(JobQueue(tmp_path), "car_one", "study_one")
    folder = tmp_path / "runs/study_one_grid_fine"
    folder.mkdir(parents=True)
    (folder / "daedalus_result.json").write_text(
        json.dumps(
            {
                "cells": 1000,
                "cd_mean": 0.6,
                "cd_ci95": [0.599, 0.601],
                "succeeded": True,
                "mesh_ok": False,
                "acceptance": "rejected",
            }
        )
    )
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    client = TestClient(create_app())
    result = client.get("/v1/studies/study_one")
    assert result.status_code == 200
    assert result.json()["gci"] is None
    assert client.get("/v1/studies").json()[0]["study_id"] == "study_one"
    assert client.get("/v1/studies/..%2Fbad").status_code in (400, 404)
    assert client.get("/v1/studies/missing").status_code == 404
