"""T34 V&V dossier: every status comes from stored records, never from a wish."""

from __future__ import annotations

from pathlib import Path

from daedalus import contracts as c
from daedalus import dossier
from daedalus.store import EvidenceStore, sha256_of


def _statuses(doc: dict[str, object]) -> dict[str, str]:
    checks = doc["checks"]
    assert isinstance(checks, list)
    return {str(check["requirement_id"]): str(check["status"]) for check in checks}


def test_empty_store_claims_nothing(tmp_path: Path) -> None:
    doc = dossier.build(tmp_path / "data")
    assert set(_statuses(doc).values()) == {"no_evidence"}
    assert doc["summary"]["verified"] == 0
    markdown = dossier.to_markdown(doc)
    assert "no_evidence" in markdown
    assert "0 verified" in markdown
    assert "No measured race run is stored" in markdown


def _project(store: EvidenceStore) -> c.Project:
    return store.add(c.Project(team="Veloira", competition_class="India NF"))


def test_a_complete_chain_is_verified(tmp_path: Path) -> None:
    store = EvidenceStore(tmp_path)
    project = _project(store)
    rulebook = store.add(
        c.Rulebook(
            project_id=project.project_id,
            origin="India Nationals official",
            competition_class="India NF",
            revision="2025-26",
            source_hash=sha256_of(b"rules"),
            is_reference_only=False,
        )
    )
    rule = store.add(
        c.Rule(
            rule_id="R1",
            rulebook_id=rulebook.rulebook_id,
            text_location="p. 12",
            measurement_method="caliper",
            referent="body width",
            computable=True,
        )
    )
    design = store.add(
        c.Design(
            project_id=project.project_id,
            geometry_hash=sha256_of(b"geometry"),
            cad_source="step",
            parameters=(),
            provenance=c.Provenance.SIMULATED,
        )
    )
    experiment = store.add(
        c.Experiment(
            project_id=project.project_id,
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
            mesh_id=design.design_id,
            conditions=(c.Quantity(value=20, unit="m/s"),),
            job_state=c.JobState.SUCCEEDED,
            acceptance=c.ScientificAcceptance.ACCEPTED,
        )
    )
    store.add(
        c.Observation(
            subject_id=run.run_id,
            quantity="drag_force",
            value=c.Quantity(value=0.37, unit="N"),
            provenance=c.Provenance.SIMULATED,
            source="simpleFoam",
        )
    )
    build = store.add(
        c.PhysicalBuild(design_id=design.design_id, build_batch="B1", manufacturing_route="CNC")
    )
    store.add(
        c.RaceRun(
            build_id=build.build_id,
            timing_definition="car-only",
            measured_time=c.Quantity(value=1.10, unit="s"),
            conditions="indoor",
            split="validation",
            provenance=c.Provenance.MEASURED,
        )
    )
    model = store.add(
        c.Model(
            kind="titan",
            training_data_hash=sha256_of(b"runs"),
            config={"method": "bayesian"},
            domain="20 m",
        )
    )
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
    store.add(
        c.CalibrationStudy(
            method="bayesian",
            model_id=model.model_id,
            inputs_artifact_id=inputs.artifact_id,
            results_artifact_id=results.artifact_id,
            n_runs=4,
            n_held_out=2,
        )
    )
    prediction = store.add(
        c.Prediction(
            model_id=model.model_id,
            design_id=design.design_id,
            predicted=c.Quantity(value=1.09, unit="s"),
            interval_low=c.Quantity(value=1.05, unit="s"),
            interval_high=c.Quantity(value=1.15, unit="s"),
            interval_level=0.9,
            in_domain=True,
            sealed_at=c.utcnow(),
            manifest_hash=sha256_of(b"sealed"),
        )
    )
    token = store.put_artifact(
        b"token",
        kind="rfc3161_timestamp",
        source_entity_id=prediction.prediction_id,
        provenance=c.Provenance.PREDICTED,
    )
    ca = store.put_artifact(
        b"ca",
        kind="trusted_ca_bundle",
        source_entity_id=prediction.prediction_id,
        provenance=c.Provenance.ESTIMATED,
    )
    store.add(
        c.TimestampVerification(
            prediction_id=prediction.prediction_id,
            token_artifact_id=token.artifact_id,
            ca_artifact_id=ca.artifact_id,
            verified=True,
            detail="Verified OK",
            command="openssl ts -verify",
        )
    )
    store.add(
        c.Inspection(
            build_id=build.build_id,
            design_id=design.design_id,
            rule_id=rule.rule_id,
            instrument="caliper",
            raw_readings=(c.Quantity(value=1.0, unit="mm"),),
            operator="team",
            verdict=c.ComplianceState.PASS_MEASURED,
        )
    )
    store.close()

    doc = dossier.build(tmp_path)
    assert set(_statuses(doc).values()) == {"verified"}
    assert doc["summary"]["verified"] == 10
    assert doc["failures"] == []
    assert doc["outstanding"] == []
    assert "| no_evidence |" not in dossier.to_markdown(doc)


def test_failed_checks_are_reported_not_hidden(tmp_path: Path) -> None:
    store = EvidenceStore(tmp_path)
    project = _project(store)
    design = store.add(
        c.Design(
            project_id=project.project_id,
            geometry_hash=sha256_of(b"geometry"),
            cad_source="step",
            parameters=(),
            provenance=c.Provenance.SIMULATED,
        )
    )
    experiment = store.add(
        c.Experiment(
            project_id=project.project_id,
            hypothesis="drag",
            input_design_id=design.design_id,
            fidelity="F2",
            autonomy=c.AutonomyLabel.HUMAN_EXECUTED,
            budget_core_hours=4,
        )
    )
    store.add(
        c.SolverRun(
            experiment_id=experiment.experiment_id,
            design_id=design.design_id,
            solver="simpleFoam",
            solver_version="2412",
            mesh_id=design.design_id,
            conditions=(),
            job_state=c.JobState.SUCCEEDED,
            acceptance=c.ScientificAcceptance.REJECTED,
        )
    )
    model = store.add(
        c.Model(
            kind="titan",
            training_data_hash=sha256_of(b"runs"),
            config={},
            domain="20 m",
        )
    )
    prediction = store.add(
        c.Prediction(
            model_id=model.model_id,
            design_id=design.design_id,
            predicted=c.Quantity(value=1.09, unit="s"),
            interval_low=c.Quantity(value=1.05, unit="s"),
            interval_high=c.Quantity(value=1.15, unit="s"),
            interval_level=0.9,
            in_domain=True,
            sealed_at=c.utcnow(),
            manifest_hash=sha256_of(b"sealed"),
        )
    )
    token = store.put_artifact(
        b"token",
        kind="rfc3161_timestamp",
        source_entity_id=prediction.prediction_id,
        provenance=c.Provenance.PREDICTED,
    )
    ca = store.put_artifact(
        b"ca",
        kind="trusted_ca_bundle",
        source_entity_id=prediction.prediction_id,
        provenance=c.Provenance.ESTIMATED,
    )
    store.add(
        c.TimestampVerification(
            prediction_id=prediction.prediction_id,
            token_artifact_id=token.artifact_id,
            ca_artifact_id=ca.artifact_id,
            verified=False,
            detail="certificate expired",
            command="openssl ts -verify",
        )
    )
    store.close()

    doc = dossier.build(tmp_path)
    assert _statuses(doc)["V&V-03"] == "failed"
    assert _statuses(doc)["V&V-08"] == "partial"
    kinds = {item["kind"] for item in doc["failures"]}
    assert {"solver_run", "timestamp_verification"} <= kinds
    markdown = dossier.to_markdown(doc)
    assert "Run was rejected" in markdown
    assert "certificate expired" in markdown
    # The rejected run is never counted as an accepted result.
    assert "verified" not in {status for key, status in _statuses(doc).items() if key == "V&V-03"}
