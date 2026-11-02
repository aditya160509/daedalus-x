"""Analysis endpoints: energy audit (T19), test planner (T23), beam FEM (T21), racing points
(T15) and third-party timestamps (T16). Thin wrappers; the engineering lives in the modules."""

from __future__ import annotations

from typing import Literal

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from daedalus import energy, outcome, structure, testplan
from daedalus.dynamics import CarParams, ThrustCurve

router = APIRouter(prefix="/v1/analysis", tags=["analysis"])
MAX_SAMPLES = 20_000


class Thrust(BaseModel):
    model_config = ConfigDict(extra="forbid")

    t_s: list[float] = Field(min_length=2, max_length=MAX_SAMPLES)
    force_n: list[float] = Field(min_length=2, max_length=MAX_SAMPLES)

    def curve(self) -> ThrustCurve:
        try:
            return ThrustCurve(np.array(self.t_s, dtype=float), np.array(self.force_n, dtype=float))
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc


class EnergyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mass_kg: float = Field(gt=0, le=1)
    track_length_m: float = Field(gt=0, le=100)
    thrust: Thrust
    cda_m2: float = Field(ge=0, le=0.05)
    crr: float = Field(ge=0, le=1)
    rho_kg_m3: float = Field(default=1.204, gt=0.5, lt=1.5)


@router.post("/energy")
def energy_audit(req: EnergyRequest) -> dict[str, object]:
    car = CarParams(
        req.mass_kg,
        req.track_length_m,
        thrust=req.thrust.curve(),
        cda_m2=req.cda_m2,
        crr=req.crr,
        rho_kg_m3=req.rho_kg_m3,
    )
    try:
        return energy.audit_car(car).to_mapping()
    except energy.EnergyAuditError as exc:
        raise HTTPException(422, str(exc)) from exc


class ConditionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    track_m: float = Field(gt=0, le=100)
    mass_kg: float = Field(gt=0, le=1)


class TestPlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    thrust: Thrust
    cda_m2: float = Field(gt=0, le=0.05)
    crr: float = Field(gt=0, le=1)
    thrust_scale: float = Field(default=1.0, gt=0, le=5)
    rho_kg_m3: float = Field(default=1.204, gt=0.5, lt=1.5)
    candidates: list[ConditionIn] = Field(min_length=1, max_length=50)
    done: list[ConditionIn] = Field(default_factory=list, max_length=500)
    sigma_s: float = Field(default=0.005, gt=0, le=1)
    prior_relative_sd: float = Field(default=0.2, gt=0, le=5)
    budget: int = Field(default=3, ge=1, le=20)


@router.post("/test-plan")
def test_plan(req: TestPlanRequest) -> dict[str, object]:
    def cond(c: ConditionIn) -> testplan.Condition:
        return testplan.Condition(c.track_m, c.mass_kg)

    try:
        plan = testplan.plan_tests(
            req.thrust.curve(),
            testplan.Nominal(req.cda_m2, req.crr, req.thrust_scale, req.rho_kg_m3),
            [cond(c) for c in req.candidates],
            done=[cond(c) for c in req.done],
            sigma_s=req.sigma_s,
            prior_relative_sd=req.prior_relative_sd,
            budget=req.budget,
        )
    except testplan.PlanError as exc:
        raise HTTPException(422, str(exc)) from exc
    return plan.to_mapping()


class SectionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["rectangle", "circle", "tube"]
    width_m: float | None = Field(default=None, gt=0, le=1)
    depth_m: float | None = Field(default=None, gt=0, le=1)
    outer_m: float | None = Field(default=None, gt=0, le=1)
    inner_m: float | None = Field(default=None, ge=0, le=1)

    def build(self) -> structure.Section:
        if self.kind == "rectangle" and self.width_m and self.depth_m:
            return structure.Section.rectangle(self.width_m, self.depth_m)
        if self.kind == "circle" and self.outer_m:
            return structure.Section.circle(self.outer_m)
        if self.kind == "tube" and self.outer_m and self.inner_m is not None:
            return structure.Section.tube(self.outer_m, self.inner_m)
        raise HTTPException(422, f"missing dimensions for a {self.kind} section")


class BeamRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    length_m: float = Field(gt=0, le=1)
    section: SectionIn
    material: str = Field(description=f"one of {sorted(structure.MATERIALS)}")
    supports: dict[float, Literal["fixed", "pinned"]] = Field(min_length=1)
    point_loads_n: dict[float, float] = Field(default_factory=dict)
    distributed_n_per_m: float = 0.0


@router.get("/beam/materials")
def beam_materials() -> dict[str, object]:
    return {
        "materials": {
            key: {
                "name": m.name,
                "youngs_modulus_gpa": m.youngs_modulus_pa / 1e9,
                "strength_mpa": m.strength_pa / 1e6,
                "source": m.source,
                "note": m.note,
            }
            for key, m in structure.MATERIALS.items()
        },
        "rule_load_tests_kg": structure.RULE_LOAD_TESTS,
    }


@router.post("/beam")
def beam(req: BeamRequest) -> dict[str, object]:
    material = structure.MATERIALS.get(req.material)
    if material is None:
        raise HTTPException(404, f"material {req.material!r} not found")
    try:
        result = structure.solve_beam(
            req.length_m,
            req.section.build(),
            material,
            supports=req.supports,
            point_loads_n=req.point_loads_n,
            distributed_n_per_m=req.distributed_n_per_m,
        )
    except structure.StructureError as exc:
        raise HTTPException(422, str(exc)) from exc
    return {
        **result.to_mapping(),
        "x_mm": (result.x_m * 1000).tolist(),
        "deflection_mm": (result.deflection_m * 1000).tolist(),
    }


class OutcomeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    car_time_s: list[float] = Field(min_length=10, max_length=MAX_SAMPLES)
    reaction_mean_s: float = Field(ge=0, le=2)
    reaction_sd_s: float = Field(ge=0, le=1)
    other_best_total_s: list[float] = Field(min_length=1, max_length=500)
    other_best_car_s: list[float] = Field(min_length=1, max_length=500)
    round_opponents_s: list[list[float]] = Field(min_length=4, max_length=4)
    field_source: outcome.FieldSource
    reaction_races: int = Field(default=2, ge=1, le=10)
    dnf_probability: float = Field(default=0.0, ge=0, le=1)
    performance_compliant: bool = True
    seed: int = 0


@router.post("/racing-points")
def racing_points(req: OutcomeRequest) -> dict[str, object]:
    try:
        total = outcome.total_time_samples(
            req.car_time_s,
            reaction_mean_s=req.reaction_mean_s,
            reaction_sd_s=req.reaction_sd_s,
            seed=req.seed,
        )
        field = outcome.FieldModel(
            np.array(req.other_best_total_s, dtype=float),
            np.array(req.other_best_car_s, dtype=float),
            tuple(np.array(o, dtype=float) for o in req.round_opponents_s),
            req.field_source,
        )
        result = outcome.expected_racing_outcome(
            car_time_s=req.car_time_s,
            total_time_s=total,
            field_model=field,
            reaction_races=req.reaction_races,
            dnf_probability=req.dnf_probability,
            performance_compliant=req.performance_compliant,
            seed=req.seed,
        )
    except outcome.OutcomeInputError as exc:
        raise HTTPException(422, str(exc)) from exc
    return result.to_mapping()


@router.post("/predictions/{prediction_id}/anchor")
def anchor_prediction(prediction_id: str) -> dict[str, object]:
    """Ask a public RFC 3161 timestamp authority to timestamp a sealed prediction's hash."""
    from daedalus import anchor
    from daedalus.api.engineering import data_root
    from daedalus.store import EvidenceStore, IntegrityError

    store = EvidenceStore(data_root())
    try:
        token = anchor.anchor_prediction(store, prediction_id)
    except (anchor.AnchorError, IntegrityError, KeyError) as exc:
        raise HTTPException(422, str(exc)) from exc
    except OSError as exc:  # no network or the authority is down
        raise HTTPException(503, f"timestamp authority unreachable: {exc}") from exc
    digest = anchor.manifest_digest(store, prediction_id).hex()
    return {
        "prediction_id": prediction_id,
        "tsa": token.tsa_url,
        "gen_time": token.gen_time,
        "verify": anchor.verify_command(digest, f"{prediction_id}.tsr"),
    }
