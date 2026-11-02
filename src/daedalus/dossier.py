"""Verification and validation dossier (T34), built from stored evidence only.

Each requirement is evaluated against append-only records in the evidence store. A requirement
without supporting records is `no_evidence`, never `verified`; a rejected run, a failed
inspection or a failed timestamp check is listed as a failure. The limitations section states
what the stored checks do not cover, and outstanding validation reuses the same coverage gaps
as the lineage view rather than keeping a second todo list.

The dossier is a snapshot of what the store can prove at the generated time. It is not a
certificate that the car, the solver or the race model is correct.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from daedalus import contracts as c
from daedalus import coverage
from daedalus.store import ID_FIELD, EvidenceStore

Status = Literal["verified", "partial", "failed", "no_evidence"]

_STATUS_ORDER: tuple[Status, ...] = ("verified", "partial", "failed", "no_evidence")


@dataclass(frozen=True)
class Check:
    """One requirement and the evidence behind its current status."""

    requirement_id: str
    title: str
    claim: str
    status: Status
    detail: str
    evidence_ids: tuple[str, ...] = ()

    def to_mapping(self) -> dict[str, object]:
        return {
            "requirement_id": self.requirement_id,
            "title": self.title,
            "claim": self.claim,
            "status": self.status,
            "detail": self.detail,
            "evidence_ids": list(self.evidence_ids),
        }


def _ids(records: list[c.Record]) -> tuple[str, ...]:
    return tuple(str(getattr(record, ID_FIELD[type(record)])) for record in records)


def _listed(records: list[c.Record], limit: int = 8) -> str:
    ids = _ids(records[:limit])
    more = "" if len(records) <= limit else f" (+{len(records) - limit} more)"
    return ", ".join(ids) + more


def _load(store: EvidenceStore) -> dict[str, list[Any]]:
    return {
        "rulebooks": list(store.records(c.Rulebook)),
        "designs": list(store.records(c.Design)),
        "runs": list(store.records(c.SolverRun)),
        "builds": list(store.records(c.PhysicalBuild)),
        "races": list(store.records(c.RaceRun)),
        "models": list(store.records(c.Model)),
        "predictions": list(store.records(c.Prediction)),
        "verifications": list(store.records(c.TimestampVerification)),
        "studies": list(store.records(c.CalibrationStudy)),
        "inspections": list(store.records(c.Inspection)),
        "artifacts": list(store.records(c.Artifact)),
    }


def _integrity(store: EvidenceStore, records: dict[str, list[Any]]) -> tuple[Check, list[str]]:
    broken = store.verify_all()
    total = sum(len(items) for items in records.values())
    if total == 0:
        return (
            Check(
                "V&V-01",
                "Evidence integrity",
                "Every stored artifact re-hashes to its recorded digest.",
                "no_evidence",
                "The evidence store has no records, so there is nothing to verify.",
            ),
            broken,
        )
    if broken:
        return (
            Check(
                "V&V-01",
                "Evidence integrity",
                "Every stored artifact re-hashes to its recorded digest.",
                "failed",
                f"{len(broken)} artifact(s) are missing or do not match their recorded hash.",
                tuple(broken),
            ),
            broken,
        )
    return (
        Check(
            "V&V-01",
            "Evidence integrity",
            "Every stored artifact re-hashes to its recorded digest.",
            "verified",
            f"{total} record(s) are present and every stored artifact re-hashes. This proves "
            "file integrity, not physical correctness.",
        ),
        broken,
    )


def _rulebook(records: dict[str, list[Any]]) -> Check:
    books: list[c.Rulebook] = records["rulebooks"]
    official = [book for book in books if not book.is_reference_only]
    if official:
        return Check(
            "V&V-02",
            "Official rule revision",
            "Rule checks reference an official, non-reference rulebook revision.",
            "verified",
            f"Official rulebook recorded: {official[0].origin} revision {official[0].revision}.",
            _ids(official),
        )
    if books:
        return Check(
            "V&V-02",
            "Official rule revision",
            "Rule checks reference an official, non-reference rulebook revision.",
            "partial",
            "Only reference rulebooks are stored; the official India NF revision is not loaded.",
            _ids(books),
        )
    return Check(
        "V&V-02",
        "Official rule revision",
        "Rule checks reference an official, non-reference rulebook revision.",
        "no_evidence",
        "No rulebook record is stored.",
    )


def _accepted_cfd(records: dict[str, list[Any]]) -> Check:
    runs: list[c.SolverRun] = records["runs"]
    accepted = [
        run
        for run in runs
        if run.acceptance == c.ScientificAcceptance.ACCEPTED
        and run.job_state == c.JobState.SUCCEEDED
    ]
    rejected = [run for run in runs if run.acceptance == c.ScientificAcceptance.REJECTED]
    if accepted:
        return Check(
            "V&V-03",
            "Accepted CFD result",
            "At least one completed solver run has been scientifically accepted.",
            "verified",
            f"{len(accepted)} of {len(runs)} stored run(s) are accepted and succeeded.",
            _ids(accepted),
        )
    if rejected:
        return Check(
            "V&V-03",
            "Accepted CFD result",
            "At least one completed solver run has been scientifically accepted.",
            "failed",
            f"No run is accepted; {len(rejected)} run(s) are explicitly rejected.",
            _ids(rejected),
        )
    if runs:
        return Check(
            "V&V-03",
            "Accepted CFD result",
            "At least one completed solver run has been scientifically accepted.",
            "no_evidence",
            f"{len(runs)} run(s) are stored but none has an acceptance verdict.",
            _ids(runs),
        )
    return Check(
        "V&V-03",
        "Accepted CFD result",
        "At least one completed solver run has been scientifically accepted.",
        "no_evidence",
        "No solver run is stored.",
    )


def _run_metadata(records: dict[str, list[Any]]) -> Check:
    runs = [run for run in records["runs"] if run.job_state == c.JobState.SUCCEEDED]
    if not runs:
        return Check(
            "V&V-04",
            "Solver traceability",
            "Every completed run records its solver, version, mesh and test conditions.",
            "no_evidence",
            "No completed solver run is stored.",
        )
    complete = [
        run for run in runs if run.solver and run.solver_version and run.mesh_id and run.conditions
    ]
    if len(complete) == len(runs):
        return Check(
            "V&V-04",
            "Solver traceability",
            "Every completed run records its solver, version, mesh and test conditions.",
            "verified",
            f"All {len(runs)} completed run(s) carry solver, version, mesh and conditions.",
            _ids(complete),
        )
    return Check(
        "V&V-04",
        "Solver traceability",
        "Every completed run records its solver, version, mesh and test conditions.",
        "partial",
        f"{len(runs) - len(complete)} of {len(runs)} completed run(s) are missing one or more "
        "metadata fields.",
        _ids([run for run in runs if run not in complete]),
    )


def _measured_baseline(records: dict[str, list[Any]]) -> Check:
    races: list[c.RaceRun] = records["races"]
    measured = [race for race in races if race.provenance == c.Provenance.MEASURED]
    if measured:
        return Check(
            "V&V-05",
            "Measured race baseline",
            "At least one physical race run is recorded as measured.",
            "verified",
            f"{len(measured)} measured race run(s) are stored.",
            _ids(measured),
        )
    if races:
        return Check(
            "V&V-05",
            "Measured race baseline",
            "At least one physical race run is recorded as measured.",
            "partial",
            f"{len(races)} race run(s) exist but none carries measured provenance.",
            _ids(races),
        )
    return Check(
        "V&V-05",
        "Measured race baseline",
        "At least one physical race run is recorded as measured.",
        "no_evidence",
        "No physical race run is stored.",
    )


def _calibration(records: dict[str, list[Any]]) -> Check:
    studies: list[c.CalibrationStudy] = records["studies"]
    held_out = [study for study in studies if study.n_held_out > 0]
    if held_out:
        return Check(
            "V&V-06",
            "Out-of-sample calibration",
            "A saved calibration study scores held-out runs separately from its fit.",
            "verified",
            f"{len(held_out)} of {len(studies)} calibration study/studies include held-out runs.",
            _ids(held_out),
        )
    if studies:
        return Check(
            "V&V-06",
            "Out-of-sample calibration",
            "A saved calibration study scores held-out runs separately from its fit.",
            "partial",
            f"{len(studies)} calibration study/studies are saved but none has held-out runs.",
            _ids(studies),
        )
    return Check(
        "V&V-06",
        "Out-of-sample calibration",
        "A saved calibration study scores held-out runs separately from its fit.",
        "no_evidence",
        "No calibration study is stored.",
    )


def _sealed_prediction(records: dict[str, list[Any]]) -> Check:
    predictions: list[c.Prediction] = records["predictions"]
    sealed = [
        prediction
        for prediction in predictions
        if prediction.sealed_at is not None and prediction.manifest_hash is not None
    ]
    if sealed and len(sealed) == len(predictions):
        return Check(
            "V&V-07",
            "Sealed prediction",
            "A prediction was hashed before the race and keeps its manifest.",
            "verified",
            f"All {len(predictions)} prediction(s) are sealed with a manifest hash.",
            _ids(sealed),
        )
    if sealed:
        return Check(
            "V&V-07",
            "Sealed prediction",
            "A prediction was hashed before the race and keeps its manifest.",
            "partial",
            f"{len(sealed)} of {len(predictions)} prediction(s) are sealed.",
            _ids(sealed),
        )
    if predictions:
        return Check(
            "V&V-07",
            "Sealed prediction",
            "A prediction was hashed before the race and keeps its manifest.",
            "failed",
            f"{len(predictions)} prediction(s) are stored without a seal.",
            _ids(predictions),
        )
    return Check(
        "V&V-07",
        "Sealed prediction",
        "A prediction was hashed before the race and keeps its manifest.",
        "no_evidence",
        "No prediction is stored.",
    )


def _timestamp(records: dict[str, list[Any]]) -> Check:
    predictions = records["predictions"]
    passing = {item.prediction_id for item in records["verifications"] if item.verified}
    verified = [p for p in predictions if p.prediction_id in passing]
    if verified:
        return Check(
            "V&V-08",
            "Third-party timestamp",
            "A stored RFC 3161 response was verified against a recorded CA bundle.",
            "verified",
            f"{len(verified)} prediction(s) have a passing OpenSSL verification record.",
            tuple(item.verification_id for item in records["verifications"] if item.verified),
        )
    token_holders = {
        artifact.source_entity_id
        for artifact in records["artifacts"]
        if artifact.kind == "rfc3161_timestamp"
    }
    if records["verifications"] or token_holders:
        return Check(
            "V&V-08",
            "Third-party timestamp",
            "A stored RFC 3161 response was verified against a recorded CA bundle.",
            "partial",
            "A timestamp response or check exists, but no passing verification is recorded.",
            tuple(item.verification_id for item in records["verifications"]),
        )
    return Check(
        "V&V-08",
        "Third-party timestamp",
        "A stored RFC 3161 response was verified against a recorded CA bundle.",
        "no_evidence",
        "No timestamp response or verification record is stored.",
    )


def _scored_prediction(records: dict[str, list[Any]]) -> Check:
    """Sealed predictions compared with a measured race run of the same design."""
    builds: dict[str, list[str]] = {}
    for build in records["builds"]:
        builds.setdefault(build.design_id, []).append(build.build_id)
    races_by_build: dict[str, list[c.RaceRun]] = {}
    for race in records["races"]:
        if race.provenance == c.Provenance.MEASURED:
            races_by_build.setdefault(race.build_id, []).append(race)

    scored: list[str] = []
    inside: list[str] = []
    for prediction in records["predictions"]:
        if prediction.sealed_at is None or prediction.manifest_hash is None:
            continue  # an unsealed number is not the sealed claim this requirement tests
        candidates = [
            race
            for build_id in builds.get(prediction.design_id, [])
            for race in races_by_build.get(build_id, [])
            if race.measured_time.unit == prediction.predicted.unit
        ]
        if not candidates:
            continue
        scored.append(prediction.prediction_id)
        if any(
            prediction.interval_low.value
            <= race.measured_time.value
            <= prediction.interval_high.value
            for race in candidates
        ):
            inside.append(prediction.prediction_id)

    if inside:
        return Check(
            "V&V-09",
            "Prediction scored against measurement",
            "A sealed prediction's interval contains the measured race time.",
            "verified",
            f"{len(inside)} of {len(scored)} scored prediction(s) contain the measured time.",
            tuple(inside),
        )
    if scored:
        return Check(
            "V&V-09",
            "Prediction scored against measurement",
            "A sealed prediction's interval contains the measured race time.",
            "failed",
            f"{len(scored)} prediction(s) were scored and all fall outside their intervals.",
            tuple(scored),
        )
    if records["predictions"]:
        detail = (
            "Predictions exist, but no measured race run for the same design is stored."
            if records["races"]
            else "No measured race run is stored, so no prediction has been scored."
        )
        return Check(
            "V&V-09",
            "Prediction scored against measurement",
            "A sealed prediction's interval contains the measured race time.",
            "no_evidence",
            detail,
            _ids(records["predictions"]),
        )
    return Check(
        "V&V-09",
        "Prediction scored against measurement",
        "A sealed prediction's interval contains the measured race time.",
        "no_evidence",
        "No prediction is stored.",
    )


def _inspection(records: dict[str, list[Any]]) -> Check:
    inspections: list[c.Inspection] = records["inspections"]
    measured_pass = [
        item for item in inspections if item.verdict == c.ComplianceState.PASS_MEASURED
    ]
    measured_fail = [
        item for item in inspections if item.verdict == c.ComplianceState.FAIL_MEASURED
    ]
    if measured_fail:
        return Check(
            "V&V-10",
            "Measured rule inspection",
            "At least one rule was checked on the physical car and passed.",
            "failed",
            f"{len(measured_fail)} measured inspection(s) failed a rule.",
            _ids(measured_fail),
        )
    if measured_pass:
        return Check(
            "V&V-10",
            "Measured rule inspection",
            "At least one rule was checked on the physical car and passed.",
            "verified",
            f"{len(measured_pass)} measured inspection(s) passed.",
            _ids(measured_pass),
        )
    if inspections:
        return Check(
            "V&V-10",
            "Measured rule inspection",
            "At least one rule was checked on the physical car and passed.",
            "partial",
            f"{len(inspections)} inspection(s) exist, but none has a measured pass verdict.",
            _ids(inspections),
        )
    return Check(
        "V&V-10",
        "Measured rule inspection",
        "At least one rule was checked on the physical car and passed.",
        "no_evidence",
        "No inspection record is stored; CAD rule checks alone are not a measurement.",
    )


def _failures(records: dict[str, list[Any]], broken: list[str]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for artifact_id in broken:
        failures.append(
            {
                "kind": "artifact",
                "id": artifact_id,
                "detail": "Artifact file is missing or does not match its recorded hash.",
            }
        )
    for run in records["runs"]:
        if run.acceptance == c.ScientificAcceptance.REJECTED:
            failures.append({"kind": "solver_run", "id": run.run_id, "detail": "Run was rejected."})
        elif run.job_state == c.JobState.FAILED:
            failures.append(
                {"kind": "solver_run", "id": run.run_id, "detail": "Solver job failed."}
            )
    for item in records["verifications"]:
        if not item.verified:
            failures.append(
                {
                    "kind": "timestamp_verification",
                    "id": item.verification_id,
                    "detail": item.detail or "Timestamp verification failed.",
                }
            )
    for inspection in records["inspections"]:
        if inspection.verdict == c.ComplianceState.FAIL_MEASURED:
            failures.append(
                {
                    "kind": "inspection",
                    "id": inspection.inspection_id,
                    "detail": f"Measured inspection failed rule {inspection.rule_id}.",
                }
            )
    return failures


def _limitations(records: dict[str, list[Any]]) -> list[str]:
    """Boundaries of the stored checks; static limits plus ones the data makes relevant."""
    limits = [
        "A passing hash check proves that stored files are intact, not that the physics or the "
        "car is correct.",
        "Accepted CFD runs are steady-state RANS results; no unsteady or transient validation is "
        "stored by this dossier.",
        "Rule verdicts are CAD geometry checks unless a measured inspection record exists.",
        "The race model is a lumped-parameter M2 model; only measured race runs test it "
        "out of sample.",
    ]
    if not any(study.n_held_out > 0 for study in records["studies"]) and records["studies"]:
        limits.append(
            "Saved calibration studies have no held-out runs, so their reported fit is not an "
            "out-of-sample error."
        )
    if not records["races"]:
        limits.append(
            "No measured race run is stored; every race time in the app is a prediction, not a "
            "measurement."
        )
    if not any(not book.is_reference_only for book in records["rulebooks"]):
        limits.append(
            "No official rulebook revision is recorded, so rule findings are reference-only."
        )
    if not any(
        run.acceptance == c.ScientificAcceptance.ACCEPTED and run.job_state == c.JobState.SUCCEEDED
        for run in records["runs"]
    ):
        limits.append("No CFD run is accepted, so no simulated drag value is verified here.")
    return limits


def build(root: Path) -> dict[str, Any]:
    """Compile the dossier for a data root. Never raises for missing evidence."""
    store = EvidenceStore(root)
    try:
        records = _load(store)
        integrity, broken = _integrity(store, records)
        checks = [
            integrity,
            _rulebook(records),
            _accepted_cfd(records),
            _run_metadata(records),
            _measured_baseline(records),
            _calibration(records),
            _sealed_prediction(records),
            _timestamp(records),
            _scored_prediction(records),
            _inspection(records),
        ]
        gaps = [action.to_mapping() for action in coverage.missing_actions(store)]
        failures = _failures(records, broken)
        counts = {status: 0 for status in _STATUS_ORDER}
        for check in checks:
            counts[check.status] += 1
        return {
            "generated": datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
            "summary": {
                "requirements": len(checks),
                **counts,
                "failures": len(failures),
                "outstanding": len(gaps),
                "records": sum(len(items) for items in records.values()),
            },
            "checks": [check.to_mapping() for check in checks],
            "failures": failures,
            "limitations": _limitations(records),
            "outstanding": gaps,
            "statement": (
                "This dossier records what the evidence store can prove at the generated time. "
                "It does not certify the car, the solver or the race model, and a requirement "
                "with no records is reported as no_evidence rather than passed."
            ),
        }
    finally:
        store.close()


def to_markdown(dossier: dict[str, Any]) -> str:
    """Human-readable dossier for a judge pack or a printed hand-out."""
    summary = dossier["summary"]
    lines = [
        "# Daedalus X verification and validation dossier",
        "",
        f"Generated {dossier['generated']}.",
        "",
        str(dossier["statement"]),
        "",
        "## Summary",
        "",
        f"- {summary['verified']} verified, {summary['partial']} partial, "
        f"{summary['failed']} failed, {summary['no_evidence']} with no evidence",
        f"- {summary['failures']} recorded failure(s); "
        f"{summary['outstanding']} outstanding validation action(s)",
        f"- {summary['records']} stored record(s) read",
        "",
        "## Requirements",
        "",
        "| ID | Requirement | Status | Evidence | Detail |",
        "|---|---|---|---|---|",
    ]
    for check in dossier["checks"]:
        evidence = ", ".join(check["evidence_ids"]) or "—"
        detail = str(check["detail"]).replace("|", "\\|")
        lines.append(
            f"| {check['requirement_id']} | {check['title']} | {check['status']} | "
            f"{evidence} | {detail} |"
        )
    lines += ["", "## Failures", ""]
    if dossier["failures"]:
        lines += [
            f"- {item['kind']} `{item['id']}`: {item['detail']}" for item in dossier["failures"]
        ]
    else:
        lines.append("- No failed check is recorded in the store.")
    lines += ["", "## Limitations", ""]
    lines += [f"- {item}" for item in dossier["limitations"]]
    lines += ["", "## Outstanding validation", ""]
    if dossier["outstanding"]:
        for item in dossier["outstanding"]:
            lines.append(
                f"- {item['action']} ({item['entity_kind']} `{item['entity_id']}`): "
                f"{item['detail']}"
            )
    else:
        lines.append("- No outstanding action is derived from the stored records.")
    return "\n".join(lines) + "\n"
