"""Evidence store: append-only SQLite records + content-addressed artifacts (spec §9.2, §9.3).

Records are never updated or deleted. Every `*_id` reference must point at an existing record,
so a missing dependency blocks the insert instead of producing an orphan.
"""

from __future__ import annotations

import hashlib
import os
import sqlite3
from collections.abc import Iterator
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from daedalus import contracts as c

T = TypeVar("T", bound=c.Record)

# Primary-key field of each entity.
ID_FIELD: dict[type[c.Record], str] = {
    c.Project: "project_id",
    c.Rulebook: "rulebook_id",
    c.Rule: "rule_id",
    c.Design: "design_id",
    c.Component: "component_id",
    c.Experiment: "experiment_id",
    c.SolverRun: "run_id",
    c.Observation: "observation_id",
    c.PhysicalBuild: "build_id",
    c.Inspection: "inspection_id",
    c.RaceRun: "race_run_id",
    c.Model: "model_id",
    c.Prediction: "prediction_id",
    c.TimestampVerification: "verification_id",
    c.CalibrationStudy: "study_id",
    c.ProjectForecast: "forecast_id",
    c.ValidationProtocol: "protocol_id",
    c.Decision: "decision_id",
    c.AIUseLog: "event_id",
    c.Artifact: "artifact_id",
}
_KINDS = {cls.__name__: cls for cls in ID_FIELD}

# Fields ending in _id/_ids that are not references to stored records.
_NOT_REFERENCES = {"output_ref"}


class StoreError(Exception):
    pass


class DuplicateRecordError(StoreError):
    pass


class MissingReferenceError(StoreError):
    pass


class IntegrityError(StoreError):
    pass


def sha256_of(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


class EvidenceStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.artifact_dir = root / "artifacts"
        self.artifact_dir.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(root / "evidence.sqlite3")
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.executescript(
            """
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS records_kind ON records(kind);
            CREATE TRIGGER IF NOT EXISTS records_no_update BEFORE UPDATE ON records
                BEGIN SELECT RAISE(ABORT, 'records are immutable'); END;
            CREATE TRIGGER IF NOT EXISTS records_no_delete BEFORE DELETE ON records
                BEGIN SELECT RAISE(ABORT, 'records are immutable'); END;
            """
        )

    def close(self) -> None:
        self._db.close()

    # --- records -------------------------------------------------------------------------

    def add(self, record: T) -> T:
        cls = type(record)
        if cls not in ID_FIELD:
            raise StoreError(f"unsupported record type {cls.__name__}")
        rid = getattr(record, ID_FIELD[cls])
        missing = [ref for ref in self._references(record) if not self.exists(ref)]
        if missing:
            raise MissingReferenceError(f"{cls.__name__} {rid} references missing {missing}")
        try:
            with self._db:
                self._db.execute(
                    "INSERT INTO records (id, kind, body, created_at) VALUES (?, ?, ?, ?)",
                    (rid, cls.__name__, record.model_dump_json(), record.created_at.isoformat()),
                )
        except sqlite3.IntegrityError as e:
            raise DuplicateRecordError(f"record {rid} already exists") from e
        return record

    def exists(self, record_id: str) -> bool:
        row = self._db.execute("SELECT 1 FROM records WHERE id = ?", (record_id,)).fetchone()
        return row is not None

    def get(self, record_id: str, kind: type[T]) -> T:
        row = self._db.execute(
            "SELECT kind, body FROM records WHERE id = ?", (record_id,)
        ).fetchone()
        if row is None:
            raise KeyError(record_id)
        if row[0] != kind.__name__:
            raise StoreError(f"{record_id} is a {row[0]}, not {kind.__name__}")
        return kind.model_validate_json(row[1])

    def records(self, kind: type[T]) -> Iterator[T]:
        rows = self._db.execute(
            "SELECT body FROM records WHERE kind = ? ORDER BY created_at, id", (kind.__name__,)
        )
        for (body,) in rows:
            yield kind.model_validate_json(body)

    def timeline(
        self, limit: int = 200, kind: str | None = None, q: str | None = None
    ) -> list[tuple[str, str, str, str]]:
        """(id, kind, created_at, body JSON), newest first; `q` matches id or body text."""
        sql = "SELECT id, kind, created_at, body FROM records WHERE 1=1"
        args: list[object] = []
        if kind:
            sql += " AND kind = ?"
            args.append(kind)
        if q:
            sql += " AND (id LIKE ? OR body LIKE ?)"
            args += [f"%{q}%", f"%{q}%"]
        sql += " ORDER BY created_at DESC, id DESC LIMIT ?"
        args.append(limit)
        return [tuple(r) for r in self._db.execute(sql, args)]  # type: ignore[misc]

    def _references(self, record: BaseModel) -> list[str]:
        own = ID_FIELD[type(record)]  # type: ignore[index]
        refs: list[str] = []
        for name, value in record:
            if name == own or name in _NOT_REFERENCES or value is None:
                continue
            if name.endswith("_id") and isinstance(value, str):
                refs.append(value)
            elif name.endswith("_ids") and isinstance(value, tuple):
                refs.extend(v for v in value if isinstance(v, str))
        return refs

    # --- artifacts -----------------------------------------------------------------------

    def put_artifact(
        self,
        data: bytes,
        *,
        kind: str,
        source_entity_id: str,
        provenance: c.Provenance,
        units: tuple[str, ...] = (),
        coordinate_frame: str | None = None,
        warnings: tuple[str, ...] = (),
    ) -> c.Artifact:
        digest = sha256_of(data)
        path = self._artifact_path(digest)
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".tmp")
            tmp.write_bytes(data)
            tmp.replace(path)
            path.chmod(0o444)
        art = c.Artifact(
            kind=kind,
            schema_version=1,
            source_entity_id=source_entity_id,
            content_sha256=digest,
            units=units,
            coordinate_frame=coordinate_frame,
            provenance=provenance,
            warnings=warnings,
        )
        return self.add(art)

    def read_artifact(self, artifact_id: str) -> bytes:
        art = self.get(artifact_id, c.Artifact)
        data = self._artifact_path(art.content_sha256).read_bytes()
        if sha256_of(data) != art.content_sha256:
            raise IntegrityError(f"artifact {artifact_id} content does not match its hash")
        return data

    def _artifact_digest(self, art: c.Artifact) -> tuple[str, int]:
        # Stream large CFD/CAD files instead of holding them in memory just to check a hash.
        with self._artifact_path(art.content_sha256).open("rb") as file:
            digest = hashlib.file_digest(file, "sha256").hexdigest()
            return "sha256:" + digest, os.fstat(file.fileno()).st_size

    def verify_artifact(self, artifact_id: str) -> dict[str, object]:
        art = self.get(artifact_id, c.Artifact)
        try:
            actual, size = self._artifact_digest(art)
        except FileNotFoundError:
            actual, size = None, None
        return {
            "artifact_id": art.artifact_id,
            "kind": art.kind,
            "source_entity_id": art.source_entity_id,
            "provenance": art.provenance.value,
            "created_at": art.created_at.isoformat(),
            "expected_sha256": art.content_sha256,
            "actual_sha256": actual,
            "size_bytes": size,
            "status": "missing"
            if actual is None
            else "match"
            if actual == art.content_sha256
            else "mismatch",
        }

    def verify_all(self) -> list[str]:
        """Return IDs of artifacts whose files are missing or corrupt, using bounded memory."""
        bad: list[str] = []
        for art in self.records(c.Artifact):
            try:
                digest, _ = self._artifact_digest(art)
            except FileNotFoundError:
                bad.append(art.artifact_id)
            else:
                if digest != art.content_sha256:
                    bad.append(art.artifact_id)
        return bad

    def _artifact_path(self, digest: str) -> Path:
        hexd = digest.removeprefix("sha256:")
        return self.artifact_dir / hexd[:2] / hexd


def kind_by_name(name: str) -> type[c.Record]:
    return _KINDS[name]
