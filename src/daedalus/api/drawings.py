"""Source-backed A4 drawing pack export."""

from __future__ import annotations

from threading import Lock

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field

from daedalus import drawings
from daedalus.api.cad import _source_step
from daedalus.api.forge import RULEBOOK, _design_dir

_EXPORT_LOCK = Lock()

router = APIRouter(prefix="/v1/drawings", tags=["drawings"])


class DrawingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    design: str = Field(min_length=1, max_length=120)
    team: str = Field(min_length=1, max_length=100)
    number: str = Field(min_length=1, max_length=30)
    finish: str = Field(default="", max_length=4000)
    decal: str = Field(default="", max_length=4000)
    annotations: dict[str, str] = Field(default_factory=dict, max_length=13)


@router.post("/pdf")
def export(request: DrawingRequest) -> Response:
    directory = _design_dir(request.design)
    source = _source_step(directory)
    if source is None:
        raise HTTPException(409, "Original STEP source unavailable; import it in Design Studio")
    if any(
        key not in {str(n) for n in range(1, 14)} or len(value) > 4000
        for key, value in request.annotations.items()
    ):
        raise HTTPException(422, "Annotations must use drawing numbers 1-13, up to 4000 characters")
    if not _EXPORT_LOCK.acquire(blocking=False):
        raise HTTPException(409, "A drawing pack is being generated; retry after it finishes")
    try:
        pdf = drawings.generate_pack(
            directory,
            source,
            RULEBOOK,
            team=request.team,
            number=request.number,
            finish=request.finish,
            decal=request.decal,
            annotations=request.annotations,
        )
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    finally:
        _EXPORT_LOCK.release()
    name = drawings.filename(request.number, request.team)
    return Response(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{name}"',
            "X-Daedalus-Review": "required",
        },
    )
