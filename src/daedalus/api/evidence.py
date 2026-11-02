"""ATLAS evidence endpoints (T12): newest-first timeline and artifact hash verification."""

from __future__ import annotations

import json

from fastapi import APIRouter, Query

from daedalus import coverage
from daedalus.api.engineering import data_root
from daedalus.store import EvidenceStore

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
                references = []
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
