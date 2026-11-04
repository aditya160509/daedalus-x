"""T13 report: the Typst template compiles to a PDF from live ORACLE and FORGE state."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from daedalus.api import app

DESIGN = Path(__file__).resolve().parents[1] / "data" / "designs" / "orbit_baseline"


def test_report_pdf(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    if not (DESIGN / "geometry.json").exists():
        pytest.skip("reference design not present")
    (tmp_path / "designs" / "orbit_baseline").mkdir(parents=True)
    shutil.copy(DESIGN / "geometry.json", tmp_path / "designs" / "orbit_baseline")
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    monkeypatch.setattr("daedalus.api.oracle._benchmark", lambda: {"gp": [1e-4], "lhs": [2e-4]})
    with TestClient(app) as c:
        r = c.get("/v1/report/pdf")
    assert r.status_code == 200, r.text
    assert r.content.startswith(b"%PDF")


@pytest.mark.parametrize(
    "benchmark", [None, {"gp": [], "lhs": []}, {"gp": [0.0024], "lhs": [0.0025]}]
)
def test_report_handles_absent_empty_and_complete_benchmarks(tmp_path, monkeypatch, benchmark):
    from daedalus.api import report

    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    monkeypatch.setattr(
        report.oracle_api,
        "state",
        lambda: {
            "best": {"cda_m2": 0.0025, "race_time_s": 1.5},
            "observations": [{}] * 8,
            "provenance": "synthetic",
            "variables": [],
            "next": {"params": {}, "cda_m2": 0.0024, "cda_sd_m2": 0.0001},
            "benchmark": benchmark,
        },
    )
    monkeypatch.setattr(
        report.forge_api,
        "checks",
        lambda design: {"revision": "synthetic fixture", "checks": [], "is_reference_only": True},
    )
    response = report.report_pdf("fixture")
    assert bytes(response.body).startswith(b"%PDF")


def test_report_cover_requires_accepted_run_bound_to_selected_design(tmp_path, monkeypatch):
    import json

    from daedalus.api import report

    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    for name, design, acceptance, cd in [
        ("wrong_design", "other", "accepted", 0.1),
        ("unreviewed", "selected", "pending_review", 0.2),
        ("accepted", "selected", "accepted", 0.3),
    ]:
        folder = tmp_path / "runs" / name
        folder.mkdir(parents=True)
        (folder / "daedalus_result.json").write_text(
            json.dumps({"succeeded": True, "acceptance": acceptance, "cd": cd})
        )
        (folder / "daedalus_manifest.json").write_text(json.dumps({"design_id": design}))
    assert report._best_run("selected").name == "accepted"
    assert report._best_run("unknown") is None
