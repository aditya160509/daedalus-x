"""ORACLE endpoints (T10): campaign state, aero map, next-best run, benchmark."""

from __future__ import annotations

from functools import lru_cache

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from daedalus import montecarlo, oracle
from daedalus.api.engineering import data_root
from daedalus.contracts import Provenance
from daedalus.dynamics import ThrustCurve

router = APIRouter(prefix="/v1/oracle", tags=["oracle"])

# Nominal 8 g CO₂ cartridge curve (assumed) used only to turn CdA into a race time.
THRUST = ThrustCurve(np.array([0.0, 0.02, 0.05, 0.3, 0.5]), np.array([0.0, 20.0, 8.0, 3.0, 0.0]))
MASS_KG, CRR, RHO, TRACK_M = 0.050, 0.012, 1.204, 20.0
MAP_N = 25


def race_time(cda: np.ndarray) -> np.ndarray:
    n = len(cda)
    return montecarlo.race_times(
        THRUST, np.ones(n), np.full(n, MASS_KG), cda, np.full(n, CRR), RHO, TRACK_M
    )


@lru_cache(maxsize=1)
def _benchmark() -> dict[str, list[float]]:
    return oracle.benchmark()


@router.get("/state")
def state() -> dict[str, object]:
    obs = oracle.Campaign(data_root()).load()
    x = np.array([o.params for o in obs])
    y = np.array([o.cda_m2 for o in obs])
    u, ei, gp = oracle.next_best(x, y)
    best_i = int(np.argmin(y))
    mean, sd = gp.predict(u[None, :])

    g = np.linspace(0, 1, MAP_N)
    grid = np.tile(x[best_i], (MAP_N * MAP_N, 1))
    grid[:, 0], grid[:, 1] = np.repeat(g, MAP_N), np.tile(g, MAP_N)
    map_mean, _ = gp.predict(grid)

    times = race_time(np.array([y[best_i], mean[0]]))
    names = [v.name for v in oracle.VARIABLES]
    return {
        "variables": [vars(v) for v in oracle.VARIABLES],
        "observations": [
            {
                "params": dict(
                    zip(names, oracle.to_physical(np.array(o.params)).tolist(), strict=True)
                ),
                "unit": list(o.params),
                "cda_m2": o.cda_m2,
                "provenance": o.provenance,
            }
            for o in obs
        ],
        "best": {"index": best_i, "cda_m2": float(y[best_i]), "race_time_s": float(times[0])},
        "next": {
            "params": dict(zip(names, oracle.to_physical(u).tolist(), strict=True)),
            "unit": u.tolist(),
            "expected_improvement_m2": ei,
            "cda_m2": float(mean[0]),
            "cda_sd_m2": float(sd[0]),
            "race_time_s": float(times[1]),
        },
        "aero_map": {
            "x": names[0],
            "y": names[1],
            "axis": g.tolist(),
            "cda_m2": map_mean.reshape(MAP_N, MAP_N).tolist(),
        },
        "benchmark": _benchmark(),
        "provenance": "synthetic"
        if all(o.provenance == Provenance.SYNTHETIC for o in obs)
        else "mixed",
    }


class ObservationIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    unit: list[float] = Field(min_length=oracle.DIM, max_length=oracle.DIM)
    cda_m2: float = Field(gt=0, lt=0.1)
    provenance: Provenance = Provenance.SIMULATED


@router.post("/observations")
def add_observation(body: ObservationIn) -> dict[str, int]:
    obs = oracle.Campaign(data_root()).add(
        oracle.Observation(
            tuple(min(max(v, 0.0), 1.0) for v in body.unit), body.cda_m2, body.provenance.value
        )
    )
    return {"count": len(obs)}
