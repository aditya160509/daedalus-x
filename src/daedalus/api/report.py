"""One-click engineering report (T13): ORACLE and FORGE state compiled to PDF with Typst."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import typst
from fastapi import APIRouter
from fastapi.responses import Response

from daedalus.api import forge as forge_api
from daedalus.api import oracle as oracle_api

router = APIRouter(prefix="/v1/report", tags=["report"])
TEMPLATE = Path(__file__).resolve().parents[1] / "report" / "report.typ"


@router.get("/pdf")
def report_pdf(design: str = "orbit_baseline") -> Response:
    data = {"oracle": oracle_api.state(), "forge": forge_api.checks(design)}
    body = json.dumps(data, sort_keys=True, default=str)
    data["hash"] = "sha256:" + hashlib.sha256(body.encode()).hexdigest()[:12]
    data["generated"] = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    pdf = typst.compile(str(TEMPLATE), sys_inputs={"data": json.dumps(data, default=str)})
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="daedalus-x-report.pdf"'},
    )
