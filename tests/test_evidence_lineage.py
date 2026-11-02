"""Lineage comes from stored references, including truncation without fake nodes."""

from pathlib import Path

import pytest

from daedalus import contracts as c
from daedalus.api.evidence import lineage
from daedalus.store import EvidenceStore, sha256_of


def test_lineage_preserves_real_parent_links(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    store = EvidenceStore(tmp_path)
    store.add(c.Project(project_id="proj_test", team="Test fixture", competition_class="national"))
    store.add(
        c.Design(
            design_id="des_test",
            project_id="proj_test",
            geometry_hash=sha256_of(b"test"),
            cad_source="step",
            parameters=(),
            provenance=c.Provenance.SYNTHETIC,
        )
    )
    store.put_artifact(
        b"test", kind="fixture", source_entity_id="des_test", provenance=c.Provenance.SYNTHETIC
    )
    store.close()
    graph = lineage(500)
    assert len(graph["nodes"]) == 3
    assert {edge["field"] for edge in graph["edges"]} == {"project_id", "source_entity_id"}
    assert graph["missing_references"] == []
    assert all(node["verified"] for node in graph["nodes"])
    clipped = lineage(1)
    assert len(clipped["nodes"]) == 1
    assert clipped["truncated"] is True
    assert clipped["outside_window"] == 1
    assert clipped["edges"] == []
