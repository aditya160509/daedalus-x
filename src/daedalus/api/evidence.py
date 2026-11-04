"""ATLAS evidence endpoints (T12): newest-first timeline and artifact hash verification."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query
from fastapi.responses import PlainTextResponse

from daedalus import coverage
from daedalus.api.engineering import data_root
from daedalus.store import EvidenceStore, StoreError

router = APIRouter(prefix="/v1/evidence", tags=["evidence"])


@router.get("/records")
def records(
    kind: str | None = None, q: str | None = None, limit: int = Query(200, ge=1, le=1000)
) -> list[dict[str, object]]:
    store = EvidenceStore(data_root())
    try:
        broken = set(store.verify_all())
        return [
            {
                "id": rid,
                "kind": k,
                "created_at": t,
                "body": json.loads(body),
                "verified": rid not in broken,
            }
            for rid, k, t, body in store.timeline(limit, kind, q)
        ]
    finally:
        store.close()


@router.get("/verify")
def verify() -> dict[str, object]:
    store = EvidenceStore(data_root())
    try:
        broken = store.verify_all()
        return {"ok": not broken, "broken": broken}
    finally:
        store.close()


@router.get("/coverage")
def coverage_report() -> dict[str, object]:
    """Next actions the store has no record of, tied to the waiting records."""
    store = EvidenceStore(data_root())
    try:
        actions = coverage.missing_actions(store)
        return {
            "items": [action.to_mapping() for action in actions],
            "counts": coverage.counts(actions),
        }
    finally:
        store.close()


@router.get("/lineage")
def lineage(limit: int = Query(500, ge=1, le=2000)) -> dict[str, object]:
    """Read-only graph of actual stored references, parent → dependent record.

    Never synthesize placeholder nodes for references outside the returned window.
    """
    store = EvidenceStore(data_root())
    try:
        timeline = store.timeline(limit + 1)
        broken = set(store.verify_all())
        gaps = coverage.coverage_by_entity(store)
        nodes = [
            {
                "id": rid,
                "kind": kind,
                "created_at": stamp,
                "body": json.loads(body),
                "verified": rid not in broken,
                "gaps": [gap.to_mapping() for gap in gaps.get(rid, [])],
            }
            for rid, kind, stamp, body in timeline[:limit]
        ]
        visible = {str(node["id"]) for node in nodes}
        edges: list[dict[str, str]] = []
        outside: set[str] = set()
        missing: set[str] = set()
        for node in nodes:
            for field, value in node["body"].items():
                references: list[str] = []
                if field.endswith("_id") and isinstance(value, str):
                    references = [value]
                elif field.endswith("_ids") and isinstance(value, list):
                    references = [v for v in value if isinstance(v, str)]
                for parent in references:
                    if parent == node["id"]:
                        continue
                    if parent in visible:
                        edges.append(
                            {
                                "id": f"{parent}:{node['id']}:{field}",
                                "source": parent,
                                "target": str(node["id"]),
                                "field": field,
                            }
                        )
                    elif store.exists(parent):
                        outside.add(parent)
                    else:
                        missing.add(parent)
        return {
            "nodes": nodes,
            "edges": list({edge["id"]: edge for edge in edges}.values()),
            "truncated": len(timeline) > limit,
            "outside_window": len(outside),
            "missing_references": sorted(missing),
        }
    finally:
        store.close()


@router.get("/artifacts/{artifact_id}/verify")
def verify_artifact(
    artifact_id: Annotated[str, Path(pattern=r"^[a-z0-9_]{3,64}$")],
) -> dict[str, object]:
    """Verify one stored artifact without returning its contents or claiming scientific validity."""
    store = EvidenceStore(data_root())
    try:
        return store.verify_artifact(artifact_id)
    except (KeyError, StoreError) as exc:
        raise HTTPException(404, "Artifact record not found") from exc
    except OSError as exc:
        raise HTTPException(503, "Artifact storage is currently unreadable") from exc
    finally:
        store.close()


@router.get("/ai-log")
def ai_log() -> dict[str, object]:
    """AI Assistance and Verification Log rows from the repository history."""
    from daedalus import ailog

    rows = ailog.entries(data_root().parent)
    return {"rule": "STEM Racing C2.18.3", "count": len(rows), "rows": rows}


@router.get("/ai-log.csv", response_class=PlainTextResponse)
def ai_log_csv() -> PlainTextResponse:
    from daedalus import ailog

    return PlainTextResponse(
        ailog.to_csv(ailog.entries(data_root().parent)),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="ai-assistance-log.csv"'},
    )
