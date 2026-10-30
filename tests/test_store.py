"""Evidence store tests (spec §9.2, §9.2a, §9.3)."""

import sqlite3
from pathlib import Path

import pytest

from daedalus import contracts as c
from daedalus.store import (
    DuplicateRecordError,
    EvidenceStore,
    IntegrityError,
    MissingReferenceError,
    sha256_of,
)


@pytest.fixture
def store(tmp_path: Path) -> EvidenceStore:
    return EvidenceStore(tmp_path)


def project(store: EvidenceStore) -> c.Project:
    return store.add(c.Project(team="Veloira", competition_class="reference"))


def design(store: EvidenceStore, p: c.Project, parent: str | None = None) -> c.Design:
    return store.add(
        c.Design(
            project_id=p.project_id,
            parent_design_id=parent,
            geometry_hash=sha256_of(b"geom" + (parent or "").encode()),
            cad_source="build123d",
            parameters=(c.Parameter(name="front_wing_angle", value=4.0, unit="degree"),),
            provenance=c.Provenance.SYNTHETIC,
        )
    )


def test_roundtrip(store: EvidenceStore) -> None:
    p = project(store)
    d = design(store, p)
    assert store.get(d.design_id, c.Design) == d
    assert [x.design_id for x in store.records(c.Design)] == [d.design_id]


def test_duplicate_id_rejected_so_relabelling_is_impossible(store: EvidenceStore) -> None:
    p = project(store)
    obs = store.add(
        c.Observation(
            subject_id=p.project_id,
            quantity="drag_force",
            value=c.Quantity(value=0.1, unit="N"),
            provenance=c.Provenance.SYNTHETIC,
            source="fixture",
        )
    )
    relabelled = obs.model_copy(update={"provenance": c.Provenance.MEASURED})
    with pytest.raises(DuplicateRecordError):
        store.add(relabelled)
    assert store.get(obs.observation_id, c.Observation).provenance is c.Provenance.SYNTHETIC


def test_missing_reference_rejected(store: EvidenceStore) -> None:
    p = project(store)
    with pytest.raises(MissingReferenceError):
        design(store, p, parent="des_doesnotexist")


def test_tuple_references_checked(store: EvidenceStore) -> None:
    p = project(store)
    d = design(store, p)
    with pytest.raises(MissingReferenceError):
        store.add(
            c.Decision(
                candidate_ids=(d.design_id, "des_missing"),
                accepted_id=d.design_id,
                rationale="x",
                supporting_ids=(),
                reviewer="r",
            )
        )


def test_database_refuses_update_and_delete(store: EvidenceStore, tmp_path: Path) -> None:
    p = project(store)
    db = sqlite3.connect(tmp_path / "evidence.sqlite3")
    with pytest.raises(sqlite3.DatabaseError, match="immutable"):
        db.execute("UPDATE records SET body = '{}' WHERE id = ?", (p.project_id,))
    with pytest.raises(sqlite3.DatabaseError, match="immutable"):
        db.execute("DELETE FROM records WHERE id = ?", (p.project_id,))


def test_get_wrong_kind(store: EvidenceStore) -> None:
    p = project(store)
    with pytest.raises(Exception, match="is a Project"):
        store.get(p.project_id, c.Design)


def test_artifact_roundtrip_and_dedup(store: EvidenceStore) -> None:
    p = project(store)
    a1 = store.put_artifact(
        b"x,y\n1,2\n", kind="csv", source_entity_id=p.project_id, provenance=c.Provenance.SYNTHETIC
    )
    a2 = store.put_artifact(
        b"x,y\n1,2\n", kind="csv", source_entity_id=p.project_id, provenance=c.Provenance.SYNTHETIC
    )
    assert a1.content_sha256 == a2.content_sha256
    assert store.read_artifact(a1.artifact_id) == b"x,y\n1,2\n"
    assert store.verify_all() == []


def test_corrupt_artifact_detected(store: EvidenceStore, tmp_path: Path) -> None:
    p = project(store)
    art = store.put_artifact(
        b"data", kind="bin", source_entity_id=p.project_id, provenance=c.Provenance.SYNTHETIC
    )
    path = tmp_path / "artifacts" / art.content_sha256[7:9] / art.content_sha256[7:]
    path.chmod(0o644)
    path.write_bytes(b"tampered")
    with pytest.raises(IntegrityError):
        store.read_artifact(art.artifact_id)
    assert store.verify_all() == [art.artifact_id]


def test_reopen_persists(tmp_path: Path) -> None:
    s1 = EvidenceStore(tmp_path)
    p = project(s1)
    s1.close()
    s2 = EvidenceStore(tmp_path)
    assert s2.get(p.project_id, c.Project) == p
