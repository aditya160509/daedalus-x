"""ATLAS evidence endpoints (T12): newest-first timeline and artifact hash verification."""

from __future__ import annotations

import json

from fastapi import APIRouter, Query

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
