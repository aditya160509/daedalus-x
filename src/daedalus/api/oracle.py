"""ORACLE endpoints (T10): campaign state, aero map, next-best run, benchmark."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from daedalus import montecarlo, oracle
from daedalus.api.engineering import data_root
from daedalus.contracts import Provenance
from daedalus.dynamics import ThrustCurve
from daedalus.oracle_benchmark import BenchmarkSpec

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


def _benchmark() -> dict[str, list[float]] | None:
    """Compatibility summary from completed evidence; never run a benchmark on page load."""
    from daedalus import benchmark_campaign, jobs
    from daedalus.contracts import JobState
    from daedalus.store import IntegrityError

    for job in jobs.JobQueue(data_root()).list(JobState.SUCCEEDED):
        if job.kind != "oracle_benchmark":
            continue
        try:
            result = benchmark_campaign.detail(data_root(), job)["result"]
            if isinstance(result, dict):
                methods = {m["id"]: m["mean_cda_m2"] for m in result["methods"]}
                return {"gp": methods["gp_ei"], "lhs": methods["lhs"]}
        except (ValueError, OSError, KeyError, IntegrityError):
            continue
    return None


@router.get("/state")
def state() -> dict[str, object]:
    obs = oracle.Campaign(data_root()).load()
    x = np.array([o.params for o in obs])
    y = np.array([o.cda_m2 for o in obs])
    u, ei, gp = oracle.next_best(x, y, candidate_filter=oracle.study_feasible)
    best_i = int(np.argmin(y))
    mean, sd = gp.predict(u[None, :])

    g = np.linspace(0, 1, MAP_N)
    grid = np.tile(x[best_i], (MAP_N * MAP_N, 1))
    grid[:, 0], grid[:, 1] = np.repeat(g, MAP_N), np.tile(g, MAP_N)
    map_mean, map_sd = gp.predict(grid)

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
            "shortest_length_scale_variable": names[int(np.argmin(gp.log_ls))],
            "cda_m2": float(mean[0]),
            "cda_sd_m2": float(sd[0]),
            "race_time_s": float(times[1]),
        },
        "aero_map": {
            "x": names[0],
            "y": names[1],
            "axis": g.tolist(),
            "cda_m2": map_mean.reshape(MAP_N, MAP_N).tolist(),
            "cda_sd_m2": map_sd.reshape(MAP_N, MAP_N).tolist(),
        },
        "benchmark": _benchmark(),
        "provenance": "synthetic"
        if all(o.provenance == Provenance.SYNTHETIC for o in obs)
        else "mixed",
    }


class ObservationIn(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    unit: list[Annotated[float, Field(ge=0, le=1)]] = Field(
        min_length=oracle.DIM, max_length=oracle.DIM
    )
    cda_m2: float = Field(gt=0, lt=0.1)
    provenance: Provenance = Provenance.SIMULATED


@router.get("/pareto")
def pareto_front() -> dict[str, object]:
    obs = oracle.Campaign(data_root()).load()
    gp = oracle.GP(np.array([o.params for o in obs]), np.array([o.cda_m2 for o in obs]))
    front = oracle.pareto(gp)
    names = [v.name for v in oracle.VARIABLES]
    p50, p90 = robust_times(front["cda_m2"], front["cda_sd_m2"])
    best = int(np.nanargmin(p90))
    return {
        "objectives": ["cda_m2", "cda_sd_m2"],
        "points": [
            {
                "params": dict(zip(names, oracle.to_physical(u).tolist(), strict=True)),
                "cda_m2": float(m),
                "cda_sd_m2": float(s),
                "race_p50_s": float(a),
                "race_p90_s": float(b),
            }
            for u, m, s, a, b in zip(
                front["unit"], front["cda_m2"], front["cda_sd_m2"], p50, p90, strict=True
            )
        ],
        "robust_index": best,
        "race_spread": ROBUST_SPREAD,
        "provenance": "predicted",
    }


# Declared 1-sigma race-day spreads (assumed until calibrated): cartridge, rolling, mass.
ROBUST_SPREAD = {"thrust_scale": 0.03, "crr": 0.002, "mass_kg": 0.0005}
ROBUST_N = 400


def robust_times(cda: np.ndarray, cda_sd: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Median and 90th-percentile race time per design under GP and race-day uncertainty."""
    rng = np.random.default_rng(7)
    n, k = len(cda), ROBUST_N
    c = np.clip(np.repeat(cda, k) + rng.standard_normal(n * k) * np.repeat(cda_sd, k), 1e-5, None)
    times = montecarlo.race_times(
        THRUST,
        1 + rng.standard_normal(n * k) * ROBUST_SPREAD["thrust_scale"],
        MASS_KG + rng.standard_normal(n * k) * ROBUST_SPREAD["mass_kg"],
        c,
        np.clip(CRR + rng.standard_normal(n * k) * ROBUST_SPREAD["crr"], 0.0, None),
        RHO,
        TRACK_M,
    ).reshape(n, k)
    return np.nanpercentile(times, 50, axis=1), np.nanpercentile(times, 90, axis=1)


@router.post("/observations")
def add_observation(body: ObservationIn) -> dict[str, int]:
    obs = oracle.Campaign(data_root()).add(
        oracle.Observation(tuple(body.unit), body.cda_m2, body.provenance.value)
    )
    return {"count": len(obs)}


@lru_cache(maxsize=8)
def _sensitivity(body: str, method: Literal["sobol", "morris"]) -> dict[str, object]:
    import json

    from daedalus import sensitivity

    observations = json.loads(body)
    gp = oracle.GP(
        np.array([o["params"] for o in observations]), np.array([o["cda_m2"] for o in observations])
    )
    result = sensitivity.analyze(
        lambda x: gp.predict(x)[0], [v.name for v in oracle.VARIABLES], method=method
    )
    result["gp"] = gp.diagnostics()
    result["observations"] = len(observations)
    result["provenance"] = (
        "synthetic" if all(o["provenance"] == "synthetic" for o in observations) else "mixed"
    )
    return result


@router.get("/sensitivity")
def sensitivity_analysis(method: Literal["sobol", "morris"] = "sobol") -> dict[str, object]:
    import json
    from dataclasses import asdict

    from fastapi import HTTPException

    body = json.dumps([asdict(o) for o in oracle.Campaign(data_root()).load()], sort_keys=True)
    try:
        return _sensitivity(body, method)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


class BuildNextIn(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    baseline: str = Field(pattern=r"^[a-z0-9_]{3,64}$")
    unit: list[Annotated[float, Field(ge=0, le=1)]] = Field(
        min_length=oracle.DIM, max_length=oracle.DIM
    )


@router.post("/build-next", status_code=201)
def build_next(body: BuildNextIn) -> dict[str, object]:
    """Build the selected recommendation as an estimated study, never a certified car."""
    from fastapi import HTTPException

    from daedalus import design_loop, geometry
    from daedalus.api.cad import PROJECT_ID
    from daedalus.api.engineering import _safe_dir
    from daedalus.api.forge import RULEBOOK

    baseline = _safe_dir("designs", body.baseline)
    try:
        return design_loop.build(
            data_root(), baseline, tuple(body.unit), RULEBOOK, project_id=PROJECT_ID
        )
    except design_loop.BuildBusyError as exc:
        raise HTTPException(409, str(exc)) from exc
    except (ValueError, OSError, geometry.GeometryError) as exc:
        raise HTTPException(422, f"Study build failed: {exc}") from exc


@router.post("/benchmarks", status_code=202)
def submit_benchmark(body: BenchmarkSpec) -> dict[str, object]:
    from daedalus import benchmark_campaign
    from daedalus.api.cad import PROJECT_ID

    return benchmark_campaign.register(data_root(), body, PROJECT_ID)


@router.get("/benchmarks")
def list_benchmarks() -> list[dict[str, object]]:
    from daedalus import jobs

    return [
        job.public() for job in jobs.JobQueue(data_root()).list() if job.kind == "oracle_benchmark"
    ]


@router.get("/benchmarks/{job_id}")
def get_benchmark(job_id: str) -> dict[str, object]:
    from fastapi import HTTPException

    from daedalus import benchmark_campaign, jobs
    from daedalus.store import IntegrityError

    try:
        return benchmark_campaign.detail(data_root(), jobs.JobQueue(data_root()).get(job_id))
    except KeyError as exc:
        raise HTTPException(404, "Benchmark or evidence not found") from exc
    except (ValueError, OSError, IntegrityError) as exc:
        raise HTTPException(409, str(exc)) from exc


@lru_cache(maxsize=4)
def _diagnostics(snapshot: str) -> dict[str, object]:
    import json

    from daedalus.oracle_diagnostics import leave_one_out

    return leave_one_out(
        [
            oracle.Observation(tuple(row["params"]), row["cda_m2"], row["provenance"])
            for row in json.loads(snapshot)
        ]
    )


@router.get("/diagnostics")
def diagnostics() -> dict[str, object]:
    import json
    from dataclasses import asdict

    from fastapi import HTTPException

    snapshot = json.dumps(
        [asdict(row) for row in oracle.Campaign(data_root()).load()], sort_keys=True
    )
    try:
        return _diagnostics(snapshot)
    except (ValueError, np.linalg.LinAlgError) as exc:
        raise HTTPException(409, str(exc)) from exc
