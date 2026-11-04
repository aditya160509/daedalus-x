"""One-click engineering report (T13): ORACLE and FORGE state compiled to PDF with Typst."""

from __future__ import annotations

import hashlib
import json
import math
import shutil
import tempfile
from pathlib import Path
from typing import Literal

import typst
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from daedalus.api import engineering as eng_api
from daedalus.api import forge as forge_api
from daedalus.api import oracle as oracle_api
from daedalus.source_identity import source_identity

router = APIRouter(prefix="/v1/report", tags=["report"])
TEMPLATE = Path(__file__).resolve().parents[1] / "report" / "report.typ"


def _best_run(design: str) -> Path | None:
    """Lowest-Cd accepted run explicitly bound to this design; older unbound runs omitted."""
    best: tuple[float, Path] | None = None
    for res in (eng_api.data_root() / "runs").glob("*/daedalus_result.json"):
        try:
            r = json.loads(res.read_text())
            manifest = json.loads((res.parent / "daedalus_manifest.json").read_text())
        except (OSError, ValueError):
            continue
        if not isinstance(r, dict) or not isinstance(manifest, dict):
            continue
        cd = r.get("cd")
        ok = (
            r.get("succeeded") is True
            and r.get("acceptance") == "accepted"
            and manifest.get("design_id") == design
            and isinstance(cd, int | float)
            and not isinstance(cd, bool)
            and math.isfinite(cd)
            and cd > 0
        )
        if ok and (best is None or r["cd"] < best[0]):
            best = (float(r["cd"]), res.parent)
    return best and best[1]


def _hero(run: Path | None) -> Path | None:
    if run is None:
        return None
    png = run / "render" / "iso.png"
    if png.exists():
        return png
    try:
        from daedalus.viz.render import cached_render

        with eng_api._RENDER_LOCK:
            return cached_render(run, "iso")
    except Exception:  # renderer unavailable: report still ships without the image
        return None


@router.get("/pdf")
def report_pdf(design: str = "orbit_baseline") -> Response:
    forge_data = forge_api.checks(design)
    data: dict[str, object] = {"oracle": oracle_api.state(), "forge": forge_data}
    body = json.dumps(data, sort_keys=True, default=str)
    data["hash"] = "sha256:" + hashlib.sha256(body.encode()).hexdigest()[:12]
    rulebook_path = forge_api.RULEBOOKS[forge_api.DEFAULT_RULEBOOK]
    identity = source_identity(
        rulebook_path=rulebook_path,
        geometry_path=eng_api.data_root() / "designs" / design / "geometry.json",
        rulebook_revision=str(forge_data.get("revision", "")),
    )
    data["identity"] = identity
    data["generated"] = identity["generated"]
    run = _best_run(design)
    hero = _hero(run)
    data["hero_run"] = run.name if hero and run else None
    with tempfile.TemporaryDirectory() as tmp:
        main = Path(tmp) / "report.typ"
        shutil.copy(TEMPLATE, main)
        if hero:
            shutil.copy(hero, Path(tmp) / "hero.png")
        pdf = typst.compile(str(main), root=tmp, sys_inputs={"data": json.dumps(data, default=str)})
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="daedalus-x-report.pdf"'},
    )


@router.get("/dossier", response_model=None)
def verification_dossier(
    fmt: Literal["json", "md"] = Query("json", alias="format"),
) -> Response | dict[str, object]:
    """V&V dossier (T34): requirements, failures, limitations and open validation."""
    from daedalus import dossier as dossier_module

    doc = dossier_module.build(eng_api.data_root())
    if fmt == "md":
        return Response(
            content=dossier_module.to_markdown(doc),
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="daedalus-x-vv-dossier.md"'},
        )
    return doc


@router.get("/judge-pack")
def judge_pack_bundle(
    design: str = Query("orbit_baseline", min_length=1, max_length=120),
    team: str = Query("Veloira", min_length=1, max_length=100),
    rulebook: str = Query("india-nf-2025-26", min_length=1, max_length=60),
) -> Response:
    """One ZIP of the existing exports plus an honest list of what is missing."""
    from daedalus import judge_pack as pack

    for label, value in (("design", design), ("team", team)):
        if "/" in value or "\\" in value or ".." in value:
            raise HTTPException(422, f"{label} may not contain path separators")
    try:
        result = pack.build_pack(eng_api.data_root(), design=design, team=team, rulebook=rulebook)
    except OSError as exc:
        raise HTTPException(503, f"judge pack could not be built: {exc}") from exc
    return Response(
        content=result.data,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="daedalus-x-judge-pack.zip"',
            "X-Daedalus-Missing": str(len(result.missing)),
        },
    )
