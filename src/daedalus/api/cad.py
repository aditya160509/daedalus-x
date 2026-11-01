"""CAD bridge: hand a design's STEP to the in-browser CAD and take a saved model back.

Saving imports the STEP like `daedalus geometry import`, runs FORGE, and records the file
as evidence, so a CAD edit lands in Inspect, Rules and Wind Tunnel like any other design.
"""

from __future__ import annotations

import json
import re
import shutil
import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import Annotated

import build123d as bd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse

from daedalus import contracts as c
from daedalus import forge, geometry
from daedalus.api.engineering import _safe_dir, data_root
from daedalus.api.forge import RULEBOOK
from daedalus.store import EvidenceStore, sha256_of

PROJECT_ID = "proj_veloira"


def _record_design(store: EvidenceStore, design_id: str, data: bytes) -> None:
    """A CAD save is a Design record (and the team project, the first time)."""
    if not store.exists(PROJECT_ID):
        store.add(
            c.Project(project_id=PROJECT_ID, team="Veloira", competition_class="Professional")
        )
    store.add(
        c.Design(
            design_id=design_id,
            project_id=PROJECT_ID,
            geometry_hash=sha256_of(data),
            cad_source="step",
            parameters=(),
            provenance=c.Provenance.ESTIMATED,
        )
    )


router = APIRouter(prefix="/v1/designs", tags=["cad"])

MAX_STEP_BYTES = 64 * 1024 * 1024
_SLUG = re.compile(r"[^a-z0-9_]+")


def _source_step(design_dir: Path) -> Path | None:
    own = design_dir / "source.step"
    if own.is_file():
        return own
    name = json.loads((design_dir / "geometry.json").read_text())["source_file"]
    return next((p for p in (data_root() / "reference").rglob(name) if p.is_file()), None)


@router.get("/{design_id}/source.step")
def source_step(design_id: str) -> FileResponse:
    path = _source_step(_safe_dir("designs", design_id))
    if path is None:
        raise HTTPException(404, "no source STEP for this design")
    return FileResponse(path, media_type="model/step", filename=f"{design_id}.step")


def _assemble(parts: list[tuple[str, bytes]], out: Path) -> None:
    """One STEP per CAD part -> one assembly whose products carry the part names."""
    if len(parts) == 1:
        out.write_bytes(parts[0][1])
        return
    children = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, (label, data) in enumerate(parts):
            path = Path(tmp) / f"{i}.step"
            path.write_bytes(data)
            # name the solids themselves: the per-part STEP's own product name is generic
            for solid in bd.import_step(path).solids():
                solid.label = label
                children.append(solid)
    bd.export_step(bd.Compound(children=children, label=out.parent.name), out)


def _slug(name: str) -> str:
    base = _SLUG.sub("_", name.lower()).strip("_")[:60] or "cad_design"
    slug, n = base, 2
    while (data_root() / "designs" / slug).exists():
        slug, n = f"{base}_{n}", n + 1
    return slug


@router.post("/import")
async def import_step(
    files: Annotated[list[UploadFile], File()],
    name: str = Form("CAD design"),
    forward_axis: str = Form("-Y"),
    up_axis: str = Form("+Z"),
) -> dict[str, object]:
    parts = [(Path(f.filename or "part.step").stem, await f.read()) for f in files]
    if sum(len(d) for _, d in parts) > MAX_STEP_BYTES:
        raise HTTPException(413, "STEP files too large")
    if not parts or any(b"ISO-10303-21" not in d[:200] for _, d in parts):
        raise HTTPException(422, "not a STEP file")
    design_id = _slug(name)
    out = data_root() / "designs" / design_id
    out.mkdir(parents=True)
    step = out / "source.step"
    try:
        await run_in_threadpool(_assemble, parts, step)
        data = step.read_bytes()
        report = await run_in_threadpool(
            geometry.import_car, step, out, forward_axis=forward_axis, up_axis=up_axis
        )
    except Exception as exc:  # the importer raises on unusable geometry; say why, keep nothing
        shutil.rmtree(out)
        raise HTTPException(422, f"could not import geometry: {exc}") from exc
    store = EvidenceStore(data_root())
    try:
        _record_design(store, design_id, data)
        art = store.put_artifact(
            data,
            kind="cad_step",
            source_entity_id=design_id,
            provenance=c.Provenance.ESTIMATED,
            units=("mm",),
            warnings=tuple(report.warnings),
        )
    finally:
        store.close()
    checks = forge.check_design(out, RULEBOOK)
    return {
        "design_id": design_id,
        "artifact_id": art.artifact_id,
        "warnings": list(report.warnings),
        "checks": [asdict(ch) for ch in checks],
    }
