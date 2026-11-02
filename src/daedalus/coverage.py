"""Evidence coverage (T12): which next actions the store has no record of yet.

The lineage graph shows what *is* stored. This module reads the same append-only records and
lists the steps that have no evidence behind them, each tied to the exact design, run,
calibration or prediction ID that is waiting. Nothing is invented and nothing is stored: a gap
disappears as soon as the missing record exists, so a stale todo list cannot outlive the data.

Coverage is deliberately factual ("no solver run references this design"), not a judgement that
the design is wrong. A CAD-only concept car legitimately stops before a physical build.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Literal

from daedalus import contracts as c
from daedalus.store import ID_FIELD, EvidenceStore

GapKind = Literal[
    "solver_run",
    "observation",
    "physical_build",
    "race_run",
    "prediction",
    "held_out_runs",
    "timestamp",
    "inspection",
]


@dataclass(frozen=True)
class MissingAction:
    """One next action with the record that is waiting for it."""

    kind: GapKind
    entity_id: str
    entity_kind: str
    action: str
    detail: str
    related_ids: tuple[str, ...] = ()

    @property
    def gap_id(self) -> str:
        return f"gap:{self.entity_id}:{self.kind}"

    def to_mapping(self) -> dict[str, object]:
        return {
            "gap_id": self.gap_id,
            "kind": self.kind,
            "entity_id": self.entity_id,
            "entity_kind": self.entity_kind,
            "action": self.action,
            "detail": self.detail,
            "related_ids": list(self.related_ids),
        }


def _record_id(record: c.Record) -> str:
    return str(getattr(record, ID_FIELD[type(record)]))


def _by(records: Sequence[c.Record], name: str) -> dict[str, list[str]]:
    index: dict[str, list[str]] = defaultdict(list)
    for record in records:
        value = getattr(record, name, None)
        if isinstance(value, str):
            index[value].append(_record_id(record))
    return index


@dataclass(frozen=True)
class _Index:
    """One pass over the store: the records and the lookups every rule needs."""

    designs: list[c.Design]
    runs: list[c.SolverRun]
    builds: list[c.PhysicalBuild]
    models: list[c.Model]
    predictions: list[c.Prediction]
    studies: list[c.CalibrationStudy]
    runs_by_design: dict[str, list[str]] = field(default_factory=dict)
    builds_by_design: dict[str, list[str]] = field(default_factory=dict)
    race_by_build: dict[str, list[str]] = field(default_factory=dict)
    observations_by_subject: dict[str, list[str]] = field(default_factory=dict)
    predictions_by_model: dict[str, list[str]] = field(default_factory=dict)
    predictions_by_design: dict[str, list[str]] = field(default_factory=dict)
    inspections_by_design: dict[str, list[str]] = field(default_factory=dict)
    timed_predictions: frozenset[str] = frozenset()
    verified_predictions: frozenset[str] = frozenset()


def _load(store: EvidenceStore) -> _Index:
    designs = list(store.records(c.Design))
    runs = list(store.records(c.SolverRun))
    builds = list(store.records(c.PhysicalBuild))
    race_runs = list(store.records(c.RaceRun))
    observations = list(store.records(c.Observation))
    models = list(store.records(c.Model))
    predictions = list(store.records(c.Prediction))
    studies = list(store.records(c.CalibrationStudy))
    return _Index(
        designs=designs,
        runs=runs,
        builds=builds,
        models=models,
        predictions=predictions,
        studies=studies,
        runs_by_design=_by(runs, "design_id"),
        builds_by_design=_by(builds, "design_id"),
        race_by_build=_by(race_runs, "build_id"),
        observations_by_subject=_by(observations, "subject_id"),
        predictions_by_model=_by(predictions, "model_id"),
        predictions_by_design=_by(predictions, "design_id"),
        inspections_by_design=_by(list(store.records(c.Inspection)), "design_id"),
        timed_predictions=frozenset(
            artifact.source_entity_id
            for artifact in store.records(c.Artifact)
            if artifact.kind == "rfc3161_timestamp"
        ),
        verified_predictions=frozenset(
            record.prediction_id
            for record in store.records(c.TimestampVerification)
            if record.verified
        ),
    )


def _gap(kind: GapKind, entity: c.Record, action: str, detail: str, *related: str) -> MissingAction:
    return MissingAction(
        kind=kind,
        entity_id=_record_id(entity),
        entity_kind=type(entity).__name__,
        action=action,
        detail=detail,
        related_ids=tuple(related),
    )


def _design_gaps(design: c.Design, index: _Index) -> list[MissingAction]:
    gaps: list[MissingAction] = []
    if not index.runs_by_design.get(design.design_id):
        gaps.append(
            _gap(
                "solver_run",
                design,
                "Run or attach a solver case",
                "No solver run references this design, so it has no simulated result.",
            )
        )
    if not index.builds_by_design.get(design.design_id):
        gaps.append(
            _gap(
                "physical_build",
                design,
                "Record a physical build, or declare the design CAD-only",
                "No physical build references this design.",
            )
        )
    if not index.inspections_by_design.get(design.design_id):
        gaps.append(
            _gap(
                "inspection",
                design,
                "Record a rules inspection",
                "No inspection records a rule check against this design.",
            )
        )
    if not index.predictions_by_design.get(design.design_id):
        gaps.append(
            _gap(
                "prediction",
                design,
                "Seal a prediction for this design",
                "No prediction references this design.",
            )
        )
    return gaps


def _run_gaps(run: c.SolverRun, index: _Index) -> list[MissingAction]:
    if run.job_state != c.JobState.SUCCEEDED:
        return []  # a failed or unfinished run is not evidence of anything yet
    if index.observations_by_subject.get(run.run_id):
        return []
    return [
        _gap(
            "observation",
            run,
            "Extract observations from the run",
            "The run succeeded but no observation references it.",
            run.design_id,
        )
    ]


def _prediction_gaps(prediction: c.Prediction, index: _Index) -> list[MissingAction]:
    gaps: list[MissingAction] = []
    design_builds = index.builds_by_design.get(prediction.design_id, [])
    measured = [run for build in design_builds for run in index.race_by_build.get(build, [])]
    if not measured:
        gaps.append(
            _gap(
                "race_run",
                prediction,
                "Record a measured run to score this prediction",
                "No race run exists for a build of this design, so the prediction is unscored.",
                prediction.design_id,
                *design_builds,
            )
        )
    if prediction.prediction_id not in index.verified_predictions:
        if prediction.prediction_id in index.timed_predictions:
            gaps.append(
                _gap(
                    "timestamp",
                    prediction,
                    "Verify the stored timestamp response",
                    "A response is stored but no passing verification is recorded.",
                )
            )
        elif prediction.sealed_at is not None:
            gaps.append(
                _gap(
                    "timestamp",
                    prediction,
                    "Request and verify a third-party timestamp",
                    "The seal time is only our own clock; no RFC 3161 response is stored.",
                )
            )
    return gaps


def missing_actions(store: EvidenceStore) -> list[MissingAction]:
    """Every gap the stored records imply, ordered by the record they belong to."""
    index = _load(store)
    actions: list[MissingAction] = []
    for design in index.designs:
        actions.extend(_design_gaps(design, index))
    for run in index.runs:
        actions.extend(_run_gaps(run, index))
    for build in index.builds:
        if not index.race_by_build.get(build.build_id):
            actions.append(
                _gap(
                    "race_run",
                    build,
                    "Record measured race runs",
                    "No race run references this build.",
                    build.design_id,
                )
            )
    for model in index.models:
        if model.kind == "titan" and not index.predictions_by_model.get(model.model_id):
            actions.append(
                _gap(
                    "prediction",
                    model,
                    "Seal a prediction from this calibration",
                    "No prediction references this calibrated model.",
                )
            )
    for study in index.studies:
        if study.n_held_out == 0:
            actions.append(
                _gap(
                    "held_out_runs",
                    study,
                    "Add independent held-out runs",
                    "The study has no held-out runs, so no out-of-sample error was measured.",
                    study.model_id,
                )
            )
    for prediction in index.predictions:
        actions.extend(_prediction_gaps(prediction, index))
    return actions


def coverage_by_entity(store: EvidenceStore) -> dict[str, list[MissingAction]]:
    grouped: dict[str, list[MissingAction]] = defaultdict(list)
    for action in missing_actions(store):
        grouped[action.entity_id].append(action)
    return dict(grouped)


def counts(actions: list[MissingAction]) -> dict[str, int]:
    tally: dict[str, int] = defaultdict(int)
    for action in actions:
        tally[action.kind] += 1
    return dict(sorted(tally.items()))
