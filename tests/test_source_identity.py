"""EASY-13/R2: printable exports carry exact input hashes and a fresh code identity."""

from __future__ import annotations

import hashlib
from pathlib import Path

from daedalus import source_identity as si


def test_file_sha256_is_full_and_streamed(tmp_path: Path) -> None:
    payload = b"revision: 2025.1\n" * 1000
    path = tmp_path / "rules.yaml"
    path.write_bytes(payload)
    assert si.file_sha256(path) == hashlib.sha256(payload).hexdigest()
    assert len(str(si.file_sha256(path))) == 64


def test_missing_file_stays_explicitly_unavailable(tmp_path: Path) -> None:
    missing = tmp_path / "absent.yaml"
    assert si.file_sha256(missing) is None
    assert si.full_hash(None) == "unavailable (file not readable)"
    assert si.full_hash("") == "unavailable (file not readable)"


def test_identity_keeps_rulebook_revision_separate_from_pdf(tmp_path: Path) -> None:
    rulebook = tmp_path / "india.yaml"
    geometry = tmp_path / "geometry.json"
    rulebook.write_text("revision: 2026.2\n", encoding="utf-8")
    geometry.write_text('{"design": "synthetic"}\n', encoding="utf-8")

    identity = si.source_identity(
        rulebook_path=rulebook,
        geometry_path=geometry,
        rulebook_revision="2026.2",
        generated="2026-11-04 00:00 UTC",
    )

    rule = identity["rulebook"]
    shape = identity["geometry"]
    assert isinstance(rule, dict) and isinstance(shape, dict)
    assert identity["generated"] == "2026-11-04 00:00 UTC"
    assert rule["revision"] == "2026.2"
    assert rule["file"] == "india.yaml"
    assert rule["sha256"] == hashlib.sha256(rulebook.read_bytes()).hexdigest()
    assert shape["file"] == "geometry.json"
    assert shape["sha256"] == hashlib.sha256(geometry.read_bytes()).hexdigest()
    # The YAML revision is not evidence that the official PDF was archived.
    assert identity["official_rule_pdf_archived"] is False


def test_missing_inputs_are_reported_not_invented(tmp_path: Path) -> None:
    identity = si.source_identity(
        rulebook_path=tmp_path / "absent.yaml",
        geometry_path=tmp_path / "absent.json",
        rulebook_revision=None,
    )
    rule = identity["rulebook"]
    shape = identity["geometry"]
    assert isinstance(rule, dict) and isinstance(shape, dict)
    assert rule["revision"] is None
    assert si.full_hash(rule["sha256"]) == "unavailable (file not readable)"
    assert si.full_hash(shape["sha256"]) == "unavailable (file not readable)"


def test_code_snapshot_without_git_reports_unavailable(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(si, "REPO_ROOT", tmp_path)
    snapshot = si.code_snapshot()
    assert snapshot["commit"] is None
    assert snapshot["dirty"] is None
    assert snapshot["state"] == "unavailable"
    assert isinstance(snapshot["captured_at"], str)
    assert si.short_commit(snapshot) == "unknown (no .git in this source installation)"


def test_short_commit_marks_dirty_and_clean_trees() -> None:
    clean = {"commit": "a" * 40, "dirty": False, "state": "recorded"}
    dirty = {"commit": "b" * 40, "dirty": True, "state": "recorded"}
    assert si.short_commit(clean) == "aaaaaaaaaaaa (clean tree)"
    assert si.short_commit(dirty) == "bbbbbbbbbbbb (dirty tree)"


def test_code_snapshot_reads_bounded_local_git(monkeypatch) -> None:
    calls: list[tuple[str, ...]] = []

    def fake_git(*args: str) -> str | None:
        calls.append(args)
        return "deadbeef" * 5 if args[0] == "rev-parse" else ""

    monkeypatch.setattr(si, "_git", fake_git)
    monkeypatch.setattr(si, "REPO_ROOT", Path(__file__).resolve().parents[1])
    snapshot = si.code_snapshot()
    assert snapshot["state"] == "recorded"
    assert snapshot["dirty"] is False
    assert calls == [("rev-parse", "HEAD"), ("status", "--porcelain", "--untracked-files=no")]


def test_each_export_captures_a_fresh_snapshot(tmp_path: Path, monkeypatch) -> None:
    state = {"commit": "a" * 40, "status": ""}

    def fake_git(*args: str) -> str | None:
        return state["commit"] if args[0] == "rev-parse" else state["status"]

    monkeypatch.setattr(si, "_git", fake_git)
    monkeypatch.setattr(si, "REPO_ROOT", Path(__file__).resolve().parents[1])
    common = {
        "rulebook_path": tmp_path / "rules.yaml",
        "geometry_path": tmp_path / "geometry.json",
    }
    first = si.source_identity(**common)
    state.update(commit="b" * 40, status=" M changed.py")
    second = si.source_identity(**common)

    first_code = first["code"]
    second_code = second["code"]
    assert isinstance(first_code, dict) and isinstance(second_code, dict)
    assert first_code["commit"] == "a" * 40
    assert second_code["commit"] == "b" * 40
    assert second_code["dirty"] is True
    assert "captured_at" in first_code and "captured_at" in second_code
