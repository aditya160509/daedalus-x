"""Real CAD study pipeline, without a CFD campaign or a physical-compliance assertion."""

import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

from daedalus import contracts as c
from daedalus.api import oracle
from daedalus.store import EvidenceStore


def test_build_selected_study_and_record_parameters(tmp_path, monkeypatch):
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    baseline = tmp_path / "designs" / "baseline"
    baseline.mkdir(parents=True)
    (baseline / "geometry.json").write_text(
        json.dumps({"length_m": 0.21463, "width_m": 0.07434, "height_m": 0.04657})
    )
    app = FastAPI()
    app.include_router(oracle.router)
    with TestClient(app) as client:
        rejected = client.post(
            "/v1/oracle/build-next", json={"baseline": "baseline", "unit": [0.5, 0.5, 0.5, 0]}
        )
        assert rejected.status_code == 422
        response = client.post(
            "/v1/oracle/build-next", json={"baseline": "baseline", "unit": [0.5] * 4}
        )
    assert response.status_code == 201, response.text
    result = response.json()
    directory = tmp_path / "designs" / result["design_id"]
    assert (directory / "source.step").is_file() and (directory / "display.glb").is_file()
    assert len(result["checks"]) == 80
    assert result["provenance"] == "estimated" and result["manual_rules"] > 0
    assert result["failed_rules"] == sum(c["state"] == "fail_cad" for c in result["checks"])
    store = EvidenceStore(tmp_path)
    try:
        design = store.get(result["design_id"], c.Design)
        assert design.cad_source == "build123d" and len(design.parameters) == 4
        assert design.provenance == c.Provenance.ESTIMATED
        assert {a.kind for a in store.records(c.Artifact)} == {"cad_step", "oracle_candidate"}
    finally:
        store.close()
    assert not list((tmp_path / "oracle").glob("build-*"))
