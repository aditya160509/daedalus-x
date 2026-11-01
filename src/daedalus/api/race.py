"""Race simulation endpoint: runs TITAN and returns aligned telemetry channels (spec §5.3, §7.7)."""

from __future__ import annotations

from typing import Literal

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, model_validator

from daedalus import montecarlo
from daedalus.contracts import Provenance
from daedalus.dynamics import CarParams, ModelLevel, ThrustCurve, simulate

router = APIRouter(prefix="/v1/race", tags=["race"])

MAX_CHANNEL_SAMPLES = 2000


class ThrustInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    t_s: list[float] = Field(min_length=2, max_length=20_000)
    force_n: list[float] = Field(min_length=2, max_length=20_000)
    provenance: Provenance
    source: str = Field(min_length=1, description="file name, instrument or assumption")

    @model_validator(mode="after")
    def same_length(self) -> ThrustInput:
        if len(self.t_s) != len(self.force_n):
            raise ValueError("t_s and force_n must have the same length")
        if any(b <= a for a, b in zip(self.t_s, self.t_s[1:], strict=False)):
            raise ValueError("t_s must be strictly increasing")
        if any(f < 0 for f in self.force_n):
            raise ValueError("force_n must be non-negative")
        return self


class RaceSimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: Literal["M1", "M2"] = "M2"
    mass_kg: float = Field(gt=0, le=1)
    track_length_m: float = Field(gt=0, le=100)
    thrust: ThrustInput
    cda_m2: float = Field(ge=0, le=0.05)
    crr: float = Field(ge=0, le=1)
    rho_kg_m3: float = Field(default=1.204, gt=0.5, lt=1.5)
    input_provenance: Provenance = Field(
        description="weakest provenance among mass, CdA and friction inputs"
    )


class Channel(BaseModel):
    name: str
    unit: str
    values: list[float]


class RaceSimulationResponse(BaseModel):
    model: str
    provenance: Literal["predicted"] = "predicted"
    input_provenance: list[Provenance]
    finished: bool
    time_s: float | None
    stop_reason: str
    peak_speed_m_s: float
    time_axis: Channel
    channels: list[Channel]


def _downsample(n: int) -> np.ndarray:
    if n <= MAX_CHANNEL_SAMPLES:
        return np.arange(n)
    return np.unique(np.linspace(0, n - 1, MAX_CHANNEL_SAMPLES).round().astype(int))


@router.post("/simulate", response_model=RaceSimulationResponse)
def simulate_race(req: RaceSimulationRequest) -> RaceSimulationResponse:
    thrust = ThrustCurve(np.asarray(req.thrust.t_s, float), np.asarray(req.thrust.force_n, float))
    car = CarParams(
        mass_kg=req.mass_kg,
        track_length_m=req.track_length_m,
        thrust=thrust,
        cda_m2=req.cda_m2,
        crr=req.crr,
        rho_kg_m3=req.rho_kg_m3,
    )
    res = simulate(car, ModelLevel(req.model))
    idx = _downsample(res.t.size)
    terms = res.force_terms
    net = terms["thrust_n"] - terms["drag_n"] - terms["rolling_n"]
    accel = np.where((res.v <= 0) & (net < 0), 0.0, net / req.mass_kg)

    def ch(name: str, unit: str, arr: np.ndarray) -> Channel:
        return Channel(name=name, unit=unit, values=[float(v) for v in arr[idx]])

    return RaceSimulationResponse(
        model=req.model,
        input_provenance=sorted({req.thrust.provenance, req.input_provenance}),
        finished=res.finished,
        time_s=res.time_s,
        stop_reason=res.stop_reason,
        peak_speed_m_s=res.peak_speed_m_s,
        time_axis=ch("time", "s", res.t),
        channels=[
            ch("position", "m", res.x),
            ch("velocity", "m/s", res.v),
            ch("acceleration", "m/s^2", accel),
            ch("thrust", "N", terms["thrust_n"]),
            ch("drag", "N", terms["drag_n"]),
            ch("rolling_resistance", "N", terms["rolling_n"]),
        ],
    )


class UncertaintyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mass: float = Field(default=0.005, ge=0, lt=0.5)
    cda: float = Field(default=0.05, ge=0, lt=0.5)
    crr: float = Field(default=0.2, ge=0, lt=0.5)
    thrust: float = Field(default=0.05, ge=0, lt=0.5)


class MonteCarloRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    race: RaceSimulationRequest
    uncertainty: UncertaintyInput = UncertaintyInput()
    n: int = Field(default=1000, ge=10, le=5000)
    seed: int = Field(default=0, ge=0)
    trajectory_band: bool = Field(
        default=False, description="return p5/p50/p95 of v(t) on a common 200-point grid"
    )


class Histogram(BaseModel):
    edges_s: list[float]
    counts: list[int]


class TrajectoryBand(BaseModel):
    time_s: list[float]
    p5: list[float]
    p50: list[float]
    p95: list[float]


class MonteCarloResponse(BaseModel):
    provenance: Literal["predicted"] = "predicted"
    n: int
    seed: int
    finish_fraction: float
    mean_s: float | None
    std_s: float | None
    percentiles_s: dict[str, float]
    sensitivity: dict[str, float]
    histogram: Histogram
    trajectory_band: TrajectoryBand | None = None


@router.post("/montecarlo")
def race_montecarlo(req: MonteCarloRequest) -> MonteCarloResponse:
    r = req.race
    car = CarParams(
        mass_kg=r.mass_kg,
        track_length_m=r.track_length_m,
        thrust=ThrustCurve(np.asarray(r.thrust.t_s, float), np.asarray(r.thrust.force_n, float)),
        cda_m2=r.cda_m2,
        crr=r.crr,
        rho_kg_m3=r.rho_kg_m3,
    )
    res = montecarlo.run(
        car,
        montecarlo.Uncertainty(**req.uncertainty.model_dump()),
        n=req.n,
        seed=req.seed,
        model=ModelLevel(r.model),
        trajectory_band=req.trajectory_band,
    )
    counts, edges = (
        np.histogram(res.times_s, bins=40) if res.times_s.size else (np.zeros(0), np.zeros(0))
    )
    band = (
        TrajectoryBand(
            time_s=res.band.time_s.tolist(),
            p5=res.band.p5.tolist(),
            p50=res.band.p50.tolist(),
            p95=res.band.p95.tolist(),
        )
        if res.band is not None
        else None
    )
    return MonteCarloResponse(
        n=res.n,
        seed=res.seed,
        finish_fraction=res.finish_fraction,
        mean_s=res.mean_s,
        std_s=res.std_s,
        percentiles_s=res.percentiles_s,
        sensitivity=res.sensitivity,
        histogram=Histogram(edges_s=edges.tolist(), counts=[int(c) for c in counts]),
        trajectory_band=band,
    )
