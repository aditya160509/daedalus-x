"""3D-viewer VTK export endpoint against the solved reference run (skipped when absent)."""

import os
import xml.etree.ElementTree as ET
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from daedalus.api import app

RUN = "orbit_baseline_20ms"
_HERE = Path(__file__).resolve()
# Worktrees keep run data in the main checkout, so look there too.
_CANDIDATES = [
    Path(os.environ.get("DAEDALUS_REF_DATA", _HERE.parents[1] / "data")) / "runs" / RUN,
    *(p / "data/runs" / RUN for p in _HERE.parents if (p / "data/runs" / RUN).exists()),
]
SOURCE = next((p for p in _CANDIDATES if (p / "daedalus_manifest.json").exists()), None)


@pytest.fixture(scope="module")
def client(tmp_path_factory: pytest.TempPathFactory) -> Iterator[TestClient]:
    if SOURCE is None:
        pytest.skip("reference run not available")
    root = tmp_path_factory.mktemp("data")
    run = root / "runs" / RUN
    run.mkdir(parents=True)
    for entry in SOURCE.iterdir():  # symlink the case so the cache lands in tmp, not real data
        if entry.name not in {"viz", "case.foam"}:
            (run / entry.name).symlink_to(entry)
    mp = pytest.MonkeyPatch()
    mp.setenv("DAEDALUS_DATA", str(root))
    yield TestClient(app)
    mp.undo()


@pytest.mark.parametrize(
    ("name", "kind", "array"),
    [
        ("surface.vtp", "PolyData", "Cp"),
        ("streamlines.vtp", "PolyData", "U_Uinf"),
        ("volume.vti", "ImageData", "Ux_Uinf"),
    ],
)
def test_vtk_layer(client: TestClient, name: str, kind: str, array: str) -> None:
    r = client.get(f"/v1/cfd/runs/{RUN}/vtk/{name}")
    assert r.status_code == 200, r.text
    tree = ET.fromstring(r.content)  # noqa: S314 - our own server output
    assert tree.get("type") == kind
    assert tree.get("compressor") == "vtkZLibDataCompressor"
    assert array in {a.get("Name") for a in tree.iter("DataArray")}
    assert len(r.content) < 20 * 1024 * 1024
    if kind == "ImageData":
        image = tree.find("ImageData")
        assert image is not None
        extent = [int(v) for v in image.get("WholeExtent", "").split()]
        assert max(extent[1::2]) == 63
    cached = Path(os.environ["DAEDALUS_DATA"]) / "runs" / RUN / "viz/vtk" / name
    assert cached.exists()
    assert client.get(f"/v1/cfd/runs/{RUN}/vtk/{name}").content == r.content


def test_vtk_layer_rejects_unknown(client: TestClient) -> None:
    assert client.get(f"/v1/cfd/runs/{RUN}/vtk/surface.vti").status_code == 404
    assert client.get(f"/v1/cfd/runs/{RUN}/vtk/mesh.vtp").status_code == 404
