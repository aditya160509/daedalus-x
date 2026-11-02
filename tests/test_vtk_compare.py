"""Strict Cp comparison tests with synthetic geometry and fields; no CFD run is used."""

import json

import numpy as np
import pytest
import pyvista as pv

from daedalus.viz import compare

PRESSURE = (
    "dimensions [0 2 -2 0 0 0 0]; boundaryField { outlet { type fixedValue; value uniform 0; } }"
)


def case(root, name, speed=2.0):
    path = root / name
    (path / "0").mkdir(parents=True)
    (path / "1").mkdir()
    (path / "constant/triSurface").mkdir(parents=True)
    (path / "0/p").write_text(PRESSURE)
    (path / "1/p").write_text(PRESSURE)
    (path / "daedalus_result.json").write_text(
        json.dumps({"succeeded": True, "acceptance": "rejected"})
    )
    (path / "constant/triSurface/body.stl").write_bytes(b"identical synthetic source")
    (path / "daedalus_manifest.json").write_text(
        json.dumps(
            {
                "template": "daedalus-halfcar-v4",
                "car": {"groups": ["body"]},
                "reference": {"U_m_s": speed},
            }
        )
    )
    return path


def patch(pressure):
    mesh = pv.PolyData(
        np.array([[0.0, 0.1, 0.0], [1.0, 0.1, 0.0], [0.0, 0.1, 1.0]]), faces=np.array([3, 0, 1, 2])
    )
    mesh.point_data["p"] = np.array([pressure] * 3)
    return mesh


def test_source_hash_frame_and_reference_checks(tmp_path):
    a, b = case(tmp_path, "a"), case(tmp_path, "b")
    assert (
        compare.compare_sources(a, b)[0]["geometry_sha256"]
        == compare.compare_sources(a, b)[1]["geometry_sha256"]
    )
    (b / "constant/triSurface/body.stl").write_bytes(b"different geometry")
    with pytest.raises(ValueError, match="geometry hashes differ"):
        compare.compare_sources(a, b)
    (b / "constant/triSurface/body.stl").write_bytes(b"identical synthetic source")
    (b / "0/p").write_text(PRESSURE.replace("uniform 0", "uniform 1"))
    with pytest.raises(ValueError, match="pressure units or outlet"):
        compare.compare_sources(a, b)
    (b / "0/p").write_text(PRESSURE)
    manifest = json.loads((b / "daedalus_manifest.json").read_text())
    manifest["template"] = "unknown"
    (b / "daedalus_manifest.json").write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="coordinate frame"):
        compare.compare_sources(a, b)


def test_normalized_delta_and_mismatched_or_invalid_fields(tmp_path, monkeypatch):
    a, b = case(tmp_path, "a", speed=2), case(tmp_path, "b", speed=4)
    monkeypatch.setattr(
        compare,
        "_reader",
        lambda path, groups, time_value: {"boundary": {"body": patch(2 if path == a else 12)}},
    )
    surface, meta = compare.build_comparison(a, b)
    # Cp(base)=2/(0.5*2²)=1; Cp(other)=12/(0.5*4²)=1.5.
    assert np.allclose(surface.point_data["DeltaCp"], 0.5)
    assert meta["max_abs_delta_cp"] == pytest.approx(0.5)
    assert "Cp(other) - Cp(base)" in meta["definition"]
    first = patch(1)
    first.point_data["Cp"] = np.ones(first.n_points)
    other = first.copy()
    other.points[0, 0] += 0.001
    with pytest.raises(ValueError, match="not identical"):
        compare.delta_surface(first, other)
    other = first.copy()
    other.point_data["Cp"][0] = np.nan
    with pytest.raises(ValueError, match="finite"):
        compare.delta_surface(first, other)


def test_compare_endpoints_export_and_reject_unsafe_id(tmp_path, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from daedalus.api import engineering

    root = tmp_path / "data"
    (root / "runs").mkdir(parents=True)
    a, _ = case(root / "runs", "a", 2), case(root / "runs", "b", 4)
    monkeypatch.setenv("DAEDALUS_DATA", str(root))
    monkeypatch.setattr(
        compare,
        "_reader",
        lambda path, groups, time_value: {"boundary": {"body": patch(2 if path == a else 12)}},
    )
    app = FastAPI()
    app.include_router(engineering.router)
    client = TestClient(app)
    metadata = client.get("/v1/cfd/compare/cp/metadata", params={"base": "a", "other": "b"})
    assert metadata.status_code == 200
    assert metadata.json()["other"]["run_id"] == "b"
    surface = client.get("/v1/cfd/compare/cp/surface.vtp", params={"base": "a", "other": "b"})
    assert surface.status_code == 200
    assert float(surface.headers["X-Delta-Cp-Max"]) == pytest.approx(0.5)
    assert b"DeltaCp" in surface.content
    assert (
        client.get("/v1/cfd/compare/cp/metadata", params={"base": "..", "other": "b"}).status_code
        == 400
    )
