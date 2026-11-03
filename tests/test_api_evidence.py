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


def test_single_artifact_verification_detects_changes_and_missing_file(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    store = EvidenceStore(tmp_path)
    project = next(store.records(c.Project))
    art = store.put_artifact(
        b"source evidence",
        kind="test_source",
        source_entity_id=project.project_id,
        provenance=c.Provenance.SYNTHETIC,
    )
    store.close()
    endpoint = f"/v1/evidence/artifacts/{art.artifact_id}/verify"
    # The verification path must not call read_bytes, even when invoked by the timeline.
    monkeypatch.setattr(Path, "read_bytes", lambda _self: pytest.fail("verification must stream"))
    body = client.get(endpoint).json()
    assert body["status"] == "match" and body["size_bytes"] == 15
    assert body["expected_sha256"] == body["actual_sha256"] == art.content_sha256
    assert "content" not in body
    path = tmp_path / "artifacts" / art.content_sha256[7:9] / art.content_sha256[7:]
    path.chmod(0o644)
    path.write_text("tampered")
    assert client.get(endpoint).json()["status"] == "mismatch"
    assert client.get("/v1/evidence/verify").json()["broken"] == [art.artifact_id]
    path.unlink()
    missing = client.get(endpoint).json()
    assert missing["status"] == "missing" and missing["actual_sha256"] is None
    assert client.get("/v1/evidence/artifacts/not_here/verify").status_code == 404
    assert client.get(f"/v1/evidence/artifacts/{project.project_id}/verify").status_code == 404
