"""Preregistered synthetic optimisation studies on the existing durable job queue."""

from __future__ import annotations

import json
from importlib.metadata import version
from pathlib import Path
from typing import Any

from daedalus import contracts as c
from daedalus import jobs, oracle
from daedalus.oracle_benchmark import BenchmarkSpec
from daedalus.store import EvidenceStore, sha256_of


def implementation() -> dict[str, str]:
    from daedalus import oracle_benchmark

    return {
        "objective_sha256": sha256_of(Path(oracle.__file__).read_bytes()),
        "benchmark_sha256": sha256_of(Path(oracle_benchmark.__file__).read_bytes()),
        **{name: version(name) for name in ("optuna", "cmaes", "numpy", "scipy")},
    }


def read_protocol(root: Path, protocol_id: str) -> dict[str, Any]:
    store = EvidenceStore(root)
    try:
        artifact = store.get(protocol_id, c.Artifact)
        if artifact.kind != "oracle_benchmark_protocol":
            raise ValueError("Expected an ORACLE benchmark protocol artifact")
        protocol: dict[str, Any] = json.loads(store.read_artifact(protocol_id))
        BenchmarkSpec.model_validate(protocol["spec"])
        return protocol
    finally:
        store.close()


def register(root: Path, spec: BenchmarkSpec, project_id: str) -> dict[str, object]:
    store = EvidenceStore(root)
    try:
        if not store.exists(project_id):
            store.add(
                c.Project(project_id=project_id, team="Veloira", competition_class="Professional")
            )
        protocol = {
            "schema_version": 1,
            "spec": spec.model_dump(),
            "provenance": "synthetic",
            "objective": "oracle.synthetic_cda, full 4-D unit cube; no CFD evaluations",
            "methods": ["gp_ei", "tpe", "cmaes", "sobol", "lhs", "random"],
            "budget_rule": "Every startup evaluation counts toward each method's total budget",
            "interval": "95% Student-t confidence interval of the across-seed mean",
            "reference": "Numerical multistart reference; not a certified global optimum",
            "implementation": implementation(),
        }
        artifact = store.put_artifact(
            json.dumps(protocol, sort_keys=True).encode(),
            kind="oracle_benchmark_protocol",
            source_entity_id=project_id,
            provenance=c.Provenance.SYNTHETIC,
        )
    finally:
        store.close()
    job = jobs.JobQueue(root).submit("oracle_benchmark", {"protocol_id": artifact.artifact_id})
    return {"job": job.public(), "protocol_id": artifact.artifact_id}


def execute(root: Path, job: c.LocalJob) -> None:
    from daedalus.oracle_benchmark import run

    protocol_id = json.loads(job.params_json)["protocol_id"]
    protocol = read_protocol(root, protocol_id)
    if protocol["implementation"] != implementation():
        raise ValueError(
            "Benchmark code/dependency versions changed after preregistration; register a new study"
        )
    result = run(
        BenchmarkSpec.model_validate(protocol["spec"]),
        on_progress=lambda event: print(json.dumps(event), flush=True),
    )
    payload = {**result, "job_id": job.id, "protocol_id": protocol_id}
    store = EvidenceStore(root)
    try:
        artifact = store.put_artifact(
            json.dumps(payload, sort_keys=True, allow_nan=False).encode(),
            kind="oracle_benchmark_result",
            source_entity_id=protocol_id,
            provenance=c.Provenance.SYNTHETIC,
            units=("m^2",),
            warnings=("Synthetic benchmark only; not accepted CFD or physical validation",),
        )
    finally:
        store.close()
    if not job.result_path:
        raise ValueError("Benchmark job has no result path")
    path = Path(job.result_path)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps({"result_artifact_id": artifact.artifact_id}))
    temporary.replace(path)


def detail(root: Path, job: c.LocalJob) -> dict[str, object]:
    if job.kind != "oracle_benchmark":
        raise ValueError("Not an ORACLE benchmark job")
    protocol_id = json.loads(job.params_json)["protocol_id"]
    result = None
    result_artifact_id = None
    if job.state == c.JobState.SUCCEEDED and job.result_path:
        envelope = json.loads(Path(job.result_path).read_text())
        result_artifact_id = envelope["result_artifact_id"]
        store = EvidenceStore(root)
        try:
            artifact = store.get(result_artifact_id, c.Artifact)
            if (
                artifact.kind != "oracle_benchmark_result"
                or artifact.source_entity_id != protocol_id
            ):
                raise ValueError("Result is not bound to this protocol")
            result = json.loads(store.read_artifact(result_artifact_id))
            if result["job_id"] != job.id or result["protocol_id"] != protocol_id:
                raise ValueError("Result job/protocol binding does not match")
        finally:
            store.close()
    return {
        "job": job.public(),
        "protocol_id": protocol_id,
        "protocol": read_protocol(root, protocol_id),
        "result_artifact_id": result_artifact_id,
        "result": result,
    }
