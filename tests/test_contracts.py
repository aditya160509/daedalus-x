"""Contract tests (spec §9, §9.3)."""

import pytest
from pydantic import ValidationError

from daedalus.contracts import (
    Design,
    JobState,
    Observation,
    Parameter,
    Provenance,
    Quantity,
    ScientificAcceptance,
    SolverRun,
)

HASH = "sha256:" + "a" * 64


def make_obs(**kw: object) -> Observation:
    base: dict[str, object] = dict(
        subject_id="run_1",
        quantity="drag_force",
        value=Quantity(value=0.12, unit="N"),
        provenance=Provenance.SYNTHETIC,
        source="fixture",
    )
    base.update(kw)
    return Observation.model_validate(base)


def test_records_are_immutable() -> None:
    obs = make_obs()
    with pytest.raises(ValidationError):
        obs.provenance = Provenance.MEASURED  # type: ignore[misc]


def test_synthetic_cannot_be_relabelled_by_copy_validation() -> None:
    obs = make_obs()
    # A new record is the only way to change provenance; the original stays synthetic.
    relabelled = obs.model_copy(update={"provenance": Provenance.MEASURED})
    assert obs.provenance is Provenance.SYNTHETIC
    assert relabelled.observation_id == obs.observation_id  # caught by store (P1-01)


def test_unknown_fields_rejected() -> None:
    with pytest.raises(ValidationError):
        make_obs(status="measured_and_accepted")


def test_hash_format_enforced() -> None:
    with pytest.raises(ValidationError):
        Design(
            project_id="p",
            geometry_hash="md5:abc",
            cad_source="step",
            parameters=(),
            provenance=Provenance.SYNTHETIC,
        )


def test_parameter_name_and_units() -> None:
    p = Parameter(name="front_wing_angle", value=4.0, unit="degree", lower=0, upper=10)
    assert p.unit == "degree"
    with pytest.raises(ValidationError):
        Parameter(name="Front Wing", value=1.0, unit="degree")


def test_status_dimensions_are_independent() -> None:
    run = SolverRun(
        experiment_id="e",
        design_id="d",
        solver="openfoam",
        solver_version="v2412",
        mesh_id="m",
        conditions=(Quantity(value=20, unit="m/s"),),
        job_state=JobState.SUCCEEDED,
        acceptance=ScientificAcceptance.REJECTED,
    )
    assert run.job_state is JobState.SUCCEEDED
    assert run.acceptance is ScientificAcceptance.REJECTED


def test_negative_uncertainty_rejected() -> None:
    with pytest.raises(ValidationError):
        Quantity(value=1.0, unit="N", uncertainty=-0.1)
