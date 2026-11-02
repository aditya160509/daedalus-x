"""Evidence coverage (T12): gaps are derived from stored records, never stored themselves."""

from __future__ import annotations

from pathlib import Path

import pytest

from daedalus import contracts as c
from daedalus import coverage
from daedalus.store import EvidenceStore, sha256_of


@pytest.fixture
def store(tmp_path: Path) -> EvidenceStore:
    return EvidenceStore(tmp_path / "ev")


def _design(store: EvidenceStore) -> c.Design:
    project = store.add(c.Project(team="Veloira", competition_class="India NF"))
    return store.add(
        c.Design(
            project_id=project.project_id,
            geometry_hash=sha256_of(b"geometry"),
            cad_source="step",
            parameters=(),
            provenance=c.Provenance.ESTIMATED,
        )
    )


def _model(store: EvidenceStore) -> c.Model:
    return store.add(
        c.Model(
            kind="titan",
            training_data_hash=sha256_of(b"runs"),
            config={"method": "bayesian"},
            domain="20 m",
        )
    )


def _kinds(actions: list[coverage.MissingAction]) -> dict[str, set[str]]:
    grouped: dict[str, set[str]] = {}
    for action in actions:
        grouped.setdefault(action.kind, set()).add(action.entity_id)
    return grouped


def test_a_bare_design_reports_every_unrecorded_step(store: EvidenceStore) -> None:
    design = _design(store)
    actions = coverage.missing_actions(store)
    kinds = _kinds(actions)
    assert kinds["solver_run"] == {design.design_id}
    assert kinds["physical_build"] == {design.design_id}
    assert kinds["inspection"] == {design.design_id}
    assert kinds["prediction"] == {design.design_id}
    assert all(a.entity_kind == "Design" for a in actions)


def test_gaps_disappear_when_the_action_is_recorded(store: EvidenceStore) -> None:
    design = _design(store)
    experiment = store.add(
        c.Experiment(
            project_id=design.project_id,
            hypothesis="drag",
            input_design_id=design.design_id,
            fidelity="F2",
            autonomy=c.AutonomyLabel.HUMAN_EXECUTED,
            budget_core_hours=4,
        )
    )
    run = store.add(
        c.SolverRun(
            experiment_id=experiment.experiment_id,
            design_id=design.design_id,
            solver="simpleFoam",
            solver_version="2412",
            mesh_id=design.design_id,  # the store checks every *_id reference exists
            conditions=(),
            job_state=c.JobState.SUCCEEDED,
            acceptance=c.ScientificAcceptance.PENDING_REVIEW,
        )
    )
    build = store.add(
        c.PhysicalBuild(design_id=design.design_id, build_batch="B1", manufacturing_route="CNC")
    )
    store.add(
        c.RaceRun(
            build_id=build.build_id,
            timing_definition="car-only",
            measured_time=c.Quantity(value=1.2, unit="s"),
            conditions="indoor",
            split="validation",
            provenance=c.Provenance.MEASURED,
        )
    )
    kinds = _kinds(coverage.missing_actions(store))
    assert "solver_run" not in kinds
    assert "physical_build" not in kinds
    assert "race_run" not in kinds
    # A successful run with no extracted observation is still a gap, linked to the run.
    assert kinds["observation"] == {run.run_id}


def test_calibration_and_prediction_gaps_point_at_the_real_ids(store: EvidenceStore) -> None:
    design = _design(store)
    model = _model(store)
    inputs = store.put_artifact(
        b"{}",
        kind="calibration_inputs",
        source_entity_id=model.model_id,
        provenance=c.Provenance.ESTIMATED,
    )
    results = store.put_artifact(
        b"{}",
        kind="calibration_results",
        source_entity_id=model.model_id,
        provenance=c.Provenance.ESTIMATED,
    )
    study = store.add(
        c.CalibrationStudy(
            method="bayesian",
            model_id=model.model_id,
            inputs_artifact_id=inputs.artifact_id,
            results_artifact_id=results.artifact_id,
            n_runs=4,
            n_held_out=0,
        )
    )
    prediction = store.add(
        c.Prediction(
            model_id=model.model_id,
            design_id=design.design_id,
            predicted=c.Quantity(value=1.1, unit="s"),
            interval_low=c.Quantity(value=1.05, unit="s"),
            interval_high=c.Quantity(value=1.15, unit="s"),
            interval_level=0.9,
            in_domain=True,
            sealed_at=c.utcnow(),
        )
    )
    actions = coverage.missing_actions(store)
    assert any(
        a.kind == "held_out_runs"
        and a.entity_id == study.study_id
        and a.related_ids == (model.model_id,)
        for a in actions
    )
    # The prediction has no measured race run and no third-party timestamp yet.
    by_prediction = [a for a in actions if a.entity_id == prediction.prediction_id]
    assert {a.kind for a in by_prediction} == {"race_run", "timestamp"}
    assert (
        prediction.design_id in next(a for a in by_prediction if a.kind == "race_run").related_ids
    )
    # The calibrated model itself no longer lacks a prediction.
    assert not any(a.kind == "prediction" and a.entity_id == model.model_id for a in actions)


def test_failed_runs_are_not_treated_as_evidence(store: EvidenceStore) -> None:
    design = _design(store)
    experiment = store.add(
        c.Experiment(
            project_id=design.project_id,
            hypothesis="drag",
            input_design_id=design.design_id,
            fidelity="F2",
            autonomy=c.AutonomyLabel.HUMAN_EXECUTED,
            budget_core_hours=4,
        )
    )
    run = store.add(
        c.SolverRun(
            experiment_id=experiment.experiment_id,
            design_id=design.design_id,
            solver="simpleFoam",
            solver_version="2412",
            mesh_id=design.design_id,  # the store checks every *_id reference exists
            conditions=(),
            job_state=c.JobState.FAILED,
            acceptance=c.ScientificAcceptance.NOT_ASSESSED,
        )
    )
    assert not any(a.entity_id == run.run_id for a in coverage.missing_actions(store))


def test_coverage_api_matches_the_module(
    store: EvidenceStore, monkeypatch: pytest.MonkeyPatch
) -> None:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from daedalus.api import engineering, evidence

    _design(store)
    monkeypatch.setattr(engineering, "data_root", lambda: store.root)
    app = FastAPI()
    app.include_router(evidence.router)
    client = TestClient(app)

    payload = client.get("/v1/evidence/coverage").json()
    assert len(payload["items"]) == len(coverage.missing_actions(store))
    assert payload["counts"]["solver_run"] == 1
    graph = client.get("/v1/evidence/lineage").json()
    design_node = next(n for n in graph["nodes"] if n["kind"] == "Design")
    assert {gap["kind"] for gap in design_node["gaps"]} >= {"solver_run", "inspection"}
