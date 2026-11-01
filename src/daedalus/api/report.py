"""One-click engineering report (T13): ORACLE and FORGE state compiled to PDF with Typst."""

from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
from datetime import UTC, datetime
from pathlib import Path

import typst
from fastapi import APIRouter
from fastapi.responses import Response

from daedalus.api import engineering as eng_api
from daedalus.api import forge as forge_api
from daedalus.api import oracle as oracle_api

router = APIRouter(prefix="/v1/report", tags=["report"])
TEMPLATE = Path(__file__).resolve().parents[1] / "report" / "report.typ"


def _best_run() -> Path | None:
    """Lowest-Cd succeeded run, the one whose hero render goes on the cover."""
    best: tuple[float, Path] | None = None
    for res in (eng_api.data_root() / "runs").glob("*/daedalus_result.json"):
        try:
            r = json.loads(res.read_text())
        except (OSError, ValueError):
            continue
        ok = r.get("succeeded") and isinstance(r.get("cd"), int | float)
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
    data = {"oracle": oracle_api.state(), "forge": forge_api.checks(design)}
    body = json.dumps(data, sort_keys=True, default=str)
    data["hash"] = "sha256:" + hashlib.sha256(body.encode()).hexdigest()[:12]
    data["generated"] = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    run = _best_run()
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
