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
