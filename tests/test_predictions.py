"""Sealed prediction tests."""

import sqlite3
from pathlib import Path

import pytest

from daedalus import contracts as c
from daedalus import predictions
from daedalus.store import EvidenceStore, IntegrityError, sha256_of


@pytest.fixture
def store(tmp_path: Path) -> EvidenceStore:
    return EvidenceStore(tmp_path / "ev")


def _setup(store: EvidenceStore) -> tuple[str, str]:
    p = store.add(c.Project(team="t", competition_class="reference"))
    d = store.add(
        c.Design(
            project_id=p.project_id,
            geometry_hash=sha256_of(b"g"),
            cad_source="step",
            parameters=(),
            provenance=c.Provenance.SYNTHETIC,
        )
    )
    m = store.add(
        c.Model(
            kind="titan",
            training_data_hash=sha256_of(b"none"),
            config={"level": "M2"},
            domain="20 m track",
        )
    )
    return m.model_id, d.design_id


def _seal(store: EvidenceStore) -> c.Prediction:
    mid, did = _setup(store)

    def s(v: float) -> c.Quantity:
        return c.Quantity(value=v, unit="s")

    return predictions.seal(
        store,
        model_id=mid,
        design_id=did,
        predicted=s(1.10),
        interval_low=s(1.05),
        interval_high=s(1.16),
        interval_level=0.9,
        in_domain=True,
        manifest={"cda_m2": 0.0015, "mass_kg": 0.05, "code": "abc123"},
    )


def test_seal_verify_and_score(store: EvidenceStore) -> None:
    pred = _seal(store)
    assert pred.sealed_at is not None and pred.manifest_hash is not None
    assert predictions.verify(store, pred.prediction_id)["code"] == "abc123"
    sc = predictions.score(store, pred.prediction_id, c.Quantity(value=1.12, unit="s"))
    assert sc.inside_interval and sc.error == pytest.approx(0.02)
    out = predictions.score(store, pred.prediction_id, c.Quantity(value=1.30, unit="s"))
    assert not out.inside_interval


def test_tampered_manifest_file_breaks_seal(store: EvidenceStore) -> None:
    pred = _seal(store)
    assert pred.manifest_hash is not None
    hexd = pred.manifest_hash.removeprefix("sha256:")
    path = store.artifact_dir / hexd[:2] / hexd
    path.chmod(0o644)
    path.write_bytes(path.read_bytes().replace(b"1.1", b"1.2"))
    with pytest.raises(IntegrityError):
        predictions.verify(store, pred.prediction_id)


def test_record_cannot_be_edited_after_sealing(store: EvidenceStore) -> None:
    pred = _seal(store)
    with pytest.raises(sqlite3.DatabaseError, match="immutable"):
        store._db.execute("UPDATE records SET body = '{}' WHERE id = ?", (pred.prediction_id,))


def test_input_validation(store: EvidenceStore) -> None:
    mid, did = _setup(store)
    with pytest.raises(ValueError, match="inside its interval"):
        predictions.seal(
            store,
            model_id=mid,
            design_id=did,
            predicted=c.Quantity(value=2.0, unit="s"),
            interval_low=c.Quantity(value=1.0, unit="s"),
            interval_high=c.Quantity(value=1.5, unit="s"),
            interval_level=0.9,
            in_domain=True,
            manifest={},
        )
    with pytest.raises(ValueError, match=r"allowed|NaN|Out of range"):
        predictions.canonical({"x": float("nan")})
