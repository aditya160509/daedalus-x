"""ATLAS evidence API (T12): timeline order, filters and hash verification."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from daedalus import contracts as c
from daedalus.api import app
from daedalus.store import EvidenceStore


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    store = EvidenceStore(tmp_path)
    store.add(c.Project(team="Veloira", competition_class="reference"))
    store.add(c.Project(team="Second", competition_class="reference"))
    store.close()
    with TestClient(app) as tc:
        yield tc


def test_timeline_newest_first_and_search(client: TestClient) -> None:
    rows = client.get("/v1/evidence/records").json()
    assert [r["body"]["team"] for r in rows] == ["Second", "Veloira"]
    assert all(r["verified"] for r in rows)
    assert len(client.get("/v1/evidence/records", params={"q": "Veloira"}).json()) == 1
    assert client.get("/v1/evidence/records", params={"kind": "Design"}).json() == []


def test_verify_ok(client: TestClient) -> None:
    assert client.get("/v1/evidence/verify").json() == {"ok": True, "broken": []}
