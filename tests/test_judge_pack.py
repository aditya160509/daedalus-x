"""Judge pack (T13): the ZIP reuses real exports and names what is missing."""

from __future__ import annotations

import hashlib
import io
import json
import zipfile
from pathlib import Path

import pytest

from daedalus import contracts as c
from daedalus import judge_pack
from daedalus.store import EvidenceStore


@pytest.fixture
def data_root(tmp_path: Path) -> Path:
    design = tmp_path / "designs" / "demo"
    design.mkdir(parents=True)
    (design / "geometry.json").write_text("{}")
    (design / "oracle.json").write_text('{"candidate": "demo"}')
    run = tmp_path / "runs" / "run_1"
    run.mkdir(parents=True)
    (run / "daedalus_manifest.json").write_text('{"solver": "simpleFoam"}')
    (run / "daedalus_result.json").write_text('{"cd": 0.4, "succeeded": true}')
    store = EvidenceStore(tmp_path)
    try:
        store.add(c.Project(team="Veloira", competition_class="India NF"))
    finally:
        store.close()
    return tmp_path


@pytest.fixture(autouse=True)
def fake_exports(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(judge_pack, "_report_bytes", lambda design: b"%PDF-fake-report")
    monkeypatch.setattr(
        judge_pack,
        "_rules",
        lambda design, rulebook: {"revision": "2025.1", "is_reference_only": False, "checks": []},
    )


def _zip(pack: judge_pack.Pack) -> zipfile.ZipFile:
    return zipfile.ZipFile(io.BytesIO(pack.data))


def test_pack_contains_real_exports_and_hashed_manifest(data_root: Path) -> None:
    pack = judge_pack.build_pack(data_root, design="demo", team="Veloira")
    bundle = _zip(pack)
    names = set(bundle.namelist())
    assert {
        "README.txt",
        "MISSING.txt",
        "manifest.json",
        "report.pdf",
        "rules/demo-checks.json",
        "designs/demo-oracle.json",
        "runs/run_1-manifest.json",
        "runs/run_1-result.json",
        "evidence/verification.json",
        "evidence/coverage.json",
        "evidence/dossier.json",
        "evidence/dossier.md",
    } <= names
    manifest = json.loads(bundle.read("manifest.json"))
    listed = {entry["path"] for entry in manifest["files"]}
    assert listed == names - {"manifest.json"}
    assert pack.manifest == manifest
    for entry in manifest["files"]:
        body = bundle.read(entry["path"])
        digest = "sha256:" + hashlib.sha256(body).hexdigest()
        assert entry["sha256"] == digest
        assert entry["bytes"] == len(body)
    assert manifest["evidence"]["ok"] is True
    assert manifest["verification"]["requirements"] == 10
    assert any("requirement(s) are not verified" in item for item in pack.missing)


def test_missing_export_is_named_and_not_replaced(
    data_root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(*_args: object) -> bytes:
        raise RuntimeError("report compiler unavailable")

    monkeypatch.setattr(judge_pack, "_report_bytes", broken)
    pack = judge_pack.build_pack(data_root, design="demo", team="Veloira")
    bundle = _zip(pack)
    assert "report.pdf" not in bundle.namelist()
    missing = bundle.read("MISSING.txt").decode()
    assert "report.pdf" in missing and "report compiler unavailable" in missing
    assert any("report.pdf" in item for item in pack.missing)


def test_reference_rulebook_and_empty_store_are_flagged(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        judge_pack,
        "_rules",
        lambda design, rulebook: {"revision": "ref", "is_reference_only": True, "checks": []},
    )
    pack = judge_pack.build_pack(tmp_path, design="demo", team="Veloira")
    text = pack.missing
    assert any("reference copy" in item for item in text)
    assert any("no solver run manifest" in item for item in text)
    assert any("no imported design" in item for item in text)
    assert any("no records" in item for item in text)


def test_endpoint_returns_a_zip_and_rejects_traversal(
    data_root: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from daedalus.api import engineering, report

    monkeypatch.setattr(engineering, "data_root", lambda: data_root)
    app = FastAPI()
    app.include_router(report.router)
    client = TestClient(app)

    response = client.get("/v1/report/judge-pack?design=demo")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert zipfile.ZipFile(io.BytesIO(response.content)).namelist()
    assert response.headers["X-Daedalus-Missing"].isdigit()
    assert client.get("/v1/report/judge-pack?design=../etc").status_code == 422


def test_removed_drawing_generator_is_not_a_gap(data_root: Path) -> None:
    pack = judge_pack.build_pack(data_root, design="demo", team="Veloira")
    bundle = _zip(pack)
    assert not any(name.startswith("drawings/") for name in bundle.namelist())
    assert "drawings" not in bundle.read("MISSING.txt").decode()
    assert "drawings" not in bundle.read("README.txt").decode()
    assert "drawing_number" not in pack.manifest
