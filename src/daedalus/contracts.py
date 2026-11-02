"""Shared data contracts (spec §9, §9.3).

Every record is immutable once created. Provenance, scientific acceptance, job state and
revision relevance are independent fields and are never packed into one status.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def utcnow() -> datetime:
    return datetime.now(UTC)


Sha256 = Annotated[str, Field(pattern=r"^sha256:[0-9a-f]{64}$")]


class Provenance(StrEnum):
    MEASURED = "measured"
    SIMULATED = "simulated"
    PREDICTED = "predicted"
    ESTIMATED = "estimated"
    SYNTHETIC = "synthetic"


class ScientificAcceptance(StrEnum):
    PENDING_REVIEW = "pending_review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    NOT_ASSESSED = "not_assessed"


class JobState(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AutonomyLabel(StrEnum):
    RECOMMENDATION_ONLY = "recommendation_only"
    HUMAN_EXECUTED = "human_executed"
    APPROVED_AUTOMATED_SIMULATION = "approved_automated_simulation"


class ComplianceState(StrEnum):
    PASS_MEASURED = "pass_measured"
    FAIL_MEASURED = "fail_measured"
    PASS_CAD_ONLY = "pass_cad_only"
    AT_RISK = "at_risk"
    MANUAL_REVIEW = "manual_review"
    NOT_TESTED = "not_tested"
    NOT_APPLICABLE = "not_applicable"
    RULE_AMBIGUOUS = "rule_ambiguous"


class Record(BaseModel):
    """Base for all stored entities: frozen, strict, timestamped."""

    model_config = ConfigDict(frozen=True, extra="forbid", str_strip_whitespace=True)

    created_at: datetime = Field(default_factory=utcnow)


class Quantity(BaseModel):
    """A number with an explicit unit (Pint-parsable string; "1" for dimensionless)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    value: float
    unit: str = Field(min_length=1)
    uncertainty: float | None = Field(default=None, ge=0)


class Parameter(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    value: float
    unit: str
    lower: float | None = None
    upper: float | None = None


class Project(Record):
    project_id: str = Field(default_factory=lambda: new_id("proj"))
    team: str
    competition_class: str
    event_date: datetime | None = None


class Rulebook(Record):
    rulebook_id: str = Field(default_factory=lambda: new_id("rb"))
    project_id: str
    origin: str  # e.g. "India Nationals official" or "reference: STEM Racing World Finals"
    competition_class: str
    revision: str
    effective_date: datetime | None = None
    source_hash: Sha256
    is_reference_only: bool


class Rule(Record):
    rule_id: str
    rulebook_id: str
    text_location: str
    measurement_method: str
    referent: str
    unit: str | None = None
    minimum: float | None = None
    maximum: float | None = None
    computable: bool
    reviewer: str | None = None


class Design(Record):
    design_id: str = Field(default_factory=lambda: new_id("des"))
    project_id: str
    parent_design_id: str | None = None
    geometry_hash: Sha256
    cad_source: Literal["native", "step", "build123d", "freecad", "glb_reconstruction"]
    parameters: tuple[Parameter, ...]
    provenance: Provenance


class Component(Record):
    component_id: str = Field(default_factory=lambda: new_id("cmp"))
    design_id: str
    semantic_name: str
    coordinate_frame: str


class Experiment(Record):
    experiment_id: str = Field(default_factory=lambda: new_id("exp"))
    project_id: str
    hypothesis: str
    input_design_id: str
    fidelity: Literal["F0", "F1", "F2", "F3"]
    autonomy: AutonomyLabel
    budget_core_hours: float = Field(ge=0)
    approved_by: str | None = None


class SolverRun(Record):
    run_id: str = Field(default_factory=lambda: new_id("run"))
    experiment_id: str
    design_id: str
    solver: str
    solver_version: str
    mesh_id: str
    conditions: tuple[Quantity, ...]
    job_state: JobState
    acceptance: ScientificAcceptance
    artifact_ids: tuple[str, ...] = ()


class Observation(Record):
    observation_id: str = Field(default_factory=lambda: new_id("obs"))
    subject_id: str  # run, build or design this observation belongs to
    quantity: str  # e.g. "drag_force"
    value: Quantity
    provenance: Provenance
    source: str
    protocol_id: str | None = None


class PhysicalBuild(Record):
    build_id: str = Field(default_factory=lambda: new_id("bld"))
    design_id: str
    build_batch: str
    manufacturing_route: str
    deviations: str = ""


class Inspection(Record):
    inspection_id: str = Field(default_factory=lambda: new_id("ins"))
    build_id: str | None  # None for CAD-only checks
    design_id: str
    rule_id: str
    instrument: str | None
    raw_readings: tuple[Quantity, ...]
    operator: str
    verdict: ComplianceState


class RaceRun(Record):
    race_run_id: str = Field(default_factory=lambda: new_id("race"))
    build_id: str
    timing_definition: str
    measured_time: Quantity
    conditions: str
    split: Literal["calibration", "validation", "exploratory"]
    provenance: Provenance


class Model(Record):
    model_id: str = Field(default_factory=lambda: new_id("mdl"))
    kind: Literal["aero_gp", "titan"]
    training_data_hash: Sha256
    config: dict[str, str | float | int | bool]
    validation_report_id: str | None = None
    domain: str


class Prediction(Record):
    prediction_id: str = Field(default_factory=lambda: new_id("pred"))
    model_id: str
    design_id: str
    predicted: Quantity
    interval_low: Quantity
    interval_high: Quantity
    interval_level: float = Field(gt=0, lt=1)
    in_domain: bool
    sealed_at: datetime | None = None
    manifest_hash: Sha256 | None = None


class TimestampVerification(Record):
    """A recorded OpenSSL check of a stored RFC 3161 response (T16).

    Append-only: a later check adds a record instead of overwriting an earlier verdict, so the
    verification history shows what was checked, against which token and which CA bundle.
    """

    verification_id: str = Field(default_factory=lambda: new_id("tsv"))
    prediction_id: str
    token_artifact_id: str
    ca_artifact_id: str
    verified: bool
    detail: str
    command: str
    openssl_version: str | None = None
    gen_time: str | None = None


class ValidationProtocol(Record):
    protocol_id: str = Field(default_factory=lambda: new_id("prot"))
    hypothesis: str
    objective: str
    split_ids: tuple[str, ...]
    planned_n: int = Field(ge=1)
    minimum_detectable_effect: Quantity | None = None
    success_threshold: str
    frozen_at: datetime


class Decision(Record):
    decision_id: str = Field(default_factory=lambda: new_id("dec"))
    candidate_ids: tuple[str, ...]
    accepted_id: str
    rationale: str
    supporting_ids: tuple[str, ...]
    reviewer: str


class AIUseLog(Record):
    event_id: str = Field(default_factory=lambda: new_id("ai"))
    tool: str
    task: str
    output_ref: str
    human_verification: str
    accepted: bool


class Artifact(Record):
    """Envelope for every stored file (spec §9.3)."""

    artifact_id: str = Field(default_factory=lambda: new_id("art"))
    kind: str
    schema_version: int = Field(ge=1)
    source_entity_id: str
    content_sha256: Sha256
    units: tuple[str, ...] = ()
    coordinate_frame: str | None = None
    provenance: Provenance
    warnings: tuple[str, ...] = ()


class LocalJob(BaseModel):
    """Frozen view of a mutable durable queue row; evidence records remain append-only."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str
    kind: Literal["cfd_run", "cfd_viz", "geometry_import", "montecarlo_batch"]
    params_json: str
    state: JobState
    created_at: str
    started_at: str | None
    finished_at: str | None
    pid: int | None
    log_path: str
    result_path: str | None
    error: str | None

    def public(self) -> dict[str, object]:
        return {
            **self.model_dump(mode="json", exclude={"params_json"}),
            "params": json.loads(self.params_json),
        }


class GridConvergence(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", allow_inf_nan=False)
    status: Literal["monotonic", "oscillatory", "divergent", "indeterminate"]
    reason: str
    ratio: float | None = None
    order: float | None = None
    extrapolated_cd: float | None = None
    gci_fine_pct: float | None = None
    asymptotic_ratio: float | None = None


class AdjointResult(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", allow_inf_nan=False)
    succeeded: bool
    converged: bool
    field: str | None
    residual_ratios: dict[str, float]
    error: str | None
    n_procs: int = Field(ge=1, le=8)
    assumptions: tuple[str, ...]
