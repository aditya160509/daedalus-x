"""Validated asynchronous job API. Solvers never execute inside the API process."""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from daedalus import jobs
from daedalus.api.race import MonteCarloRequest
from daedalus.contracts import JobState

router = APIRouter(prefix="/v1/jobs", tags=["jobs"])
ItemId = Annotated[str, Field(pattern=r"^[a-z0-9_]{3,64}$")]


class Params(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class CfdParams(Params):
    design: ItemId
    run: ItemId
    speed: float = Field(default=20, gt=0, lt=100)
    fidelity: Literal["quick", "final"] = "quick"
    procs: int = Field(default=8, ge=1, le=256)
    base_cell_m: float | None = Field(default=None, gt=0, le=0.5)
    domain_cell_m: float | None = Field(default=None, gt=0, le=0.5)
    acceptance_mode: Literal["steady", "averaged"] | None = None


class VizParams(Params):
    run: ItemId


class GeometryParams(Params):
    design: ItemId
    step: str = Field(min_length=1, max_length=500)
    forward: Literal["+X", "-X", "+Y", "-Y", "+Z", "-Z"]
    up: Literal["+X", "-X", "+Y", "-Y", "+Z", "-Z"]


class CfdRequest(Params):
    kind: Literal["cfd_run"]
    params: CfdParams


class VizRequest(Params):
    kind: Literal["cfd_viz"]
    params: VizParams


class GeometryRequest(Params):
    kind: Literal["geometry_import"]
    params: GeometryParams


class OracleBenchmarkParams(Params):
    protocol_id: str = Field(pattern=r"^[a-z0-9_]{3,64}$")


class OracleBenchmarkJob(Params):
    kind: Literal["oracle_benchmark"]
    params: OracleBenchmarkParams


class MonteCarloBatch(Params):
    kind: Literal["montecarlo_batch"]
    params: MonteCarloRequest


JobRequest = Annotated[
    CfdRequest | VizRequest | GeometryRequest | MonteCarloBatch | OracleBenchmarkJob,
    Field(discriminator="kind"),
]


def queue() -> jobs.JobQueue:
    return jobs.JobQueue(jobs.data_root())


@router.post("", status_code=202)
def submit(req: JobRequest) -> dict[str, object]:
    try:
        return queue().submit(req.kind, req.params.model_dump(mode="json")).public()
    except FileExistsError as exc:
        raise HTTPException(409, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("")
def list_jobs(state: JobState | None = None) -> list[dict[str, object]]:
    return [job.public() for job in queue().list(state)]


@router.get("/{job_id}")
def get_job(job_id: str) -> dict[str, object]:
    try:
        return queue().get(job_id).public()
    except KeyError as exc:
        raise HTTPException(404, "job not found") from exc


@router.post("/{job_id}/cancel")
def cancel_job(job_id: str) -> dict[str, object]:
    try:
        return queue().cancel(job_id).public()
    except KeyError as exc:
        raise HTTPException(404, "job not found") from exc


@router.get("/{job_id}/log")
def job_log(job_id: str, offset: Annotated[int, Query(ge=0)] = 0) -> dict[str, object]:
    try:
        return queue().log(job_id, offset)
    except KeyError as exc:
        raise HTTPException(404, "job not found") from exc
    except ValueError as exc:
        raise HTTPException(416, str(exc)) from exc
