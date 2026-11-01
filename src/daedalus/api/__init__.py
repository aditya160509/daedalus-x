"""FastAPI application (spec §10.1, §11.1)."""

from __future__ import annotations

from fastapi import FastAPI

from daedalus.api import data, engineering, forge, jobs, oracle, race


def create_app() -> FastAPI:
    app = FastAPI(title="Daedalus X API", version="0.1.0")
    app.include_router(race.router)
    app.include_router(engineering.router)
    app.include_router(jobs.router)
    app.include_router(data.router)
    app.include_router(oracle.router)
    app.include_router(forge.router)

    @app.get("/v1/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
