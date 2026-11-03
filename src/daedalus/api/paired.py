"""Paired comparison with exact source and result evidence; no simulation launched."""

import json

from fastapi import APIRouter, HTTPException

from daedalus import contracts as c
from daedalus.api.cad import PROJECT_ID
from daedalus.api.engineering import data_root
from daedalus.paired import PairedRequest, analyze
from daedalus.store import EvidenceStore

router = APIRouter(prefix="/v1/analysis", tags=["analysis"])


@router.post("/paired")
def paired_comparison(request: PairedRequest) -> dict[str, object]:
    try:
        result = analyze(request)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    store = EvidenceStore(data_root())
    try:
        if not store.exists(PROJECT_ID):
            store.add(
                c.Project(project_id=PROJECT_ID, team="Veloira", competition_class="Professional")
            )
        source = store.put_artifact(
            request.model_dump_json().encode(),
            kind="paired_timing_source",
            source_entity_id=PROJECT_ID,
            provenance=c.Provenance.ESTIMATED,
            warnings=(
                "User-entered timing source; physical measurement not independently verified",
            ),
        )
        artifact = store.put_artifact(
            json.dumps(result, allow_nan=False).encode(),
            kind="paired_timing_analysis",
            source_entity_id=source.artifact_id,
            provenance=c.Provenance.ESTIMATED,
            units=("ms",),
        )
        return {
            **result,
            "source_artifact_id": source.artifact_id,
            "result_artifact_id": artifact.artifact_id,
        }
    finally:
        store.close()
