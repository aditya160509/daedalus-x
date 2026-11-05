"""Real CAD study pipeline, without a CFD campaign or a physical-compliance assertion."""

import json
import shutil

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


def test_campaign_records_decision_and_scores_only_matching_accepted_surface(tmp_path, monkeypatch):
    from daedalus.api.cad import PROJECT_ID
    from daedalus.geometry import sha256_file

    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    design = tmp_path / "designs" / "oracle_test"
    surface = design / "cfd" / "body.stl"
    surface.parent.mkdir(parents=True)
    surface.write_bytes(b"candidate surface")
    case = tmp_path / "runs" / "accepted_test"
    case_surface = case / "constant" / "triSurface" / surface.name
    case_surface.parent.mkdir(parents=True)
    shutil.copyfile(surface, case_surface)
    (case / "daedalus_manifest.json").write_text(
        json.dumps({"reference": {"Aref_full_m2": 0.002, "U_m_s": 20}})
    )
    result = case / "daedalus_result.json"
    result.write_text(json.dumps({"succeeded": True, "acceptance": "accepted", "cd": 0.2}))
    store = EvidenceStore(tmp_path)
    try:
        store.add(
            c.Project(project_id=PROJECT_ID, team="Veloira", competition_class="Professional")
        )
        store.add(
            c.Design(
                design_id=design.name,
                project_id=PROJECT_ID,
                geometry_hash=sha256_file(surface),
                cad_source="build123d",
                parameters=(),
                provenance=c.Provenance.ESTIMATED,
            )
        )
        store.put_artifact(
            json.dumps(
                {
                    "forecast": {
                        "predicted_cda_m2": 0.00045,
                        "sd_m2": 0.00001,
                        "provenance": "synthetic",
                    },
                    "surface_hashes": {surface.name: sha256_file(surface)},
                }
            ).encode(),
            kind="oracle_candidate",
            source_entity_id=design.name,
            provenance=c.Provenance.ESTIMATED,
        )
    finally:
        store.close()

    app = FastAPI()
    app.include_router(oracle.router)
    with TestClient(app) as client:
        route = "/v1/oracle/acquisition"
        assert (
            client.post(
                route,
                json={
                    "action": "veto",
                    "unit": [0.5] * 4,
                    "reason": "Low tool clearance",
                },
            ).status_code
            == 201
        )
        assert client.get(route).json()[0]["action"] == "veto"
        assert client.get("/v1/oracle/candidate-forecasts").json() == [design.name]
        route = "/v1/oracle/candidate-score"
        params = {"design": design.name, "run": case.name}
        response = client.get(route, params=params)
        assert response.status_code == 200, response.text
        assert response.json()["actual_cda_m2"] == 0.0004
        case_surface.write_bytes(b"different surface")
        assert client.get(route, params=params).status_code == 422
