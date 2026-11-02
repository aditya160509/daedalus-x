"""Analysis endpoints: energy audit (T19), test planner (T23), beam FEM (T21), racing points
(T15) and third-party timestamps (T16). Thin wrappers; the engineering lives in the modules."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Literal

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from daedalus import energy, outcome, project, structure, testplan
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


class CoastDownIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    speed_mps: float = Field(gt=0, le=40)
    distance_m: float = Field(gt=0, le=100)
    mass_kg: float = Field(gt=0, le=1)


class TestPlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    thrust: Thrust
    cda_m2: float = Field(gt=0, le=0.05)
    crr: float = Field(gt=0, le=1)
    thrust_scale: float = Field(default=1.0, gt=0, le=5)
    rho_kg_m3: float = Field(default=1.204, gt=0.5, lt=1.5)
    candidates: list[ConditionIn] = Field(min_length=1, max_length=50)
    coast_downs: list[CoastDownIn] = Field(default_factory=list, max_length=20)
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
            [
                *(cond(c) for c in req.candidates),
                *(
                    testplan.CoastDown(c.speed_mps, c.distance_m, c.mass_kg)
                    for c in req.coast_downs
                ),
            ],
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
        digest = anchor.manifest_digest(store, prediction_id).hex()
    except (anchor.AnchorError, IntegrityError, KeyError) as exc:
        raise HTTPException(422, str(exc)) from exc
    except OSError as exc:  # no network or the authority is down
        raise HTTPException(503, f"timestamp authority unreachable: {exc}") from exc
    finally:
        store.close()
    return {
        "prediction_id": prediction_id,
        "tsa": token.tsa_url,
        "gen_time": token.gen_time,
        "verify": anchor.verify_command(digest, f"{prediction_id}.tsr"),
    }


@router.get("/predictions/{prediction_id}/anchor")
def anchor_status(prediction_id: str) -> dict[str, object]:
    from daedalus import anchor, contracts
    from daedalus.api.engineering import data_root
    from daedalus.store import EvidenceStore, IntegrityError

    store = EvidenceStore(data_root())
    try:
        anchor.manifest_digest(store, prediction_id)
        tokens = [
            a
            for a in store.records(contracts.Artifact)
            if a.kind == anchor.TOKEN_KIND and a.source_entity_id == prediction_id
        ]
        history = anchor.verification_history(store, prediction_id)
        latest = history[0] if history else None
        return {
            "token_count": len(tokens),
            "ca_configured": bool(
                os.environ.get("DAEDALUS_TSA_CA_FILE")
                and Path(os.environ["DAEDALUS_TSA_CA_FILE"]).is_file()
            ),
            "verification_count": len(history),
            "latest_verification": _verification_json(latest) if latest else None,
        }
    except (anchor.AnchorError, IntegrityError, KeyError) as exc:
        raise HTTPException(422, str(exc)) from exc
    finally:
        store.close()


def _verification_json(v: object) -> dict[str, object]:
    from daedalus import contracts

    if not isinstance(v, contracts.TimestampVerification):
        raise TypeError("expected a TimestampVerification record")
    return {
        "verification_id": v.verification_id,
        "created_at": v.created_at.isoformat(),
        "prediction_id": v.prediction_id,
        "token_artifact_id": v.token_artifact_id,
        "ca_artifact_id": v.ca_artifact_id,
        "verified": v.verified,
        "detail": v.detail,
        "command": v.command,
        "openssl_version": v.openssl_version,
        "gen_time": v.gen_time,
    }


@router.get("/predictions/{prediction_id}/anchor/history")
def anchor_history(prediction_id: str) -> dict[str, object]:
    """Append-only verification history plus the stored response and trust-bundle IDs."""
    from daedalus import anchor, contracts
    from daedalus.api.engineering import data_root
    from daedalus.store import EvidenceStore, IntegrityError

    store = EvidenceStore(data_root())
    try:
        anchor.manifest_digest(store, prediction_id)
        tokens = [
            a
            for a in store.records(contracts.Artifact)
            if a.kind == anchor.TOKEN_KIND and a.source_entity_id == prediction_id
        ]
        return {
            "prediction_id": prediction_id,
            "tokens": [
                {
                    "artifact_id": a.artifact_id,
                    "created_at": a.created_at.isoformat(),
                    "content_sha256": a.content_sha256,
                }
                for a in tokens
            ],
            "verifications": [
                _verification_json(v) for v in anchor.verification_history(store, prediction_id)
            ],
        }
    except (anchor.AnchorError, IntegrityError, KeyError) as exc:
        raise HTTPException(422, str(exc)) from exc
    finally:
        store.close()


@router.post("/predictions/{prediction_id}/anchor/verify")
def verify_anchor(prediction_id: str) -> dict[str, object]:
    """Verify the latest stored response and persist the verdict as evidence."""
    from daedalus import anchor
    from daedalus.api.engineering import data_root
    from daedalus.store import DuplicateRecordError, EvidenceStore, IntegrityError

    ca = os.environ.get("DAEDALUS_TSA_CA_FILE")
    if not ca or not Path(ca).is_file():
        raise HTTPException(
            503, "Configure DAEDALUS_TSA_CA_FILE with the trusted TSA CA bundle on the server"
        )
    if not shutil.which("openssl"):
        raise HTTPException(503, "OpenSSL is required for timestamp verification")
    store = EvidenceStore(data_root())
    try:
        record = anchor.verify_stored_timestamp(store, prediction_id, Path(ca))
    except (anchor.AnchorError, IntegrityError, KeyError) as exc:
        raise HTTPException(422, str(exc)) from exc
    except (DuplicateRecordError, OSError, subprocess.TimeoutExpired) as exc:
        raise HTTPException(503, f"Timestamp verification unavailable: {exc}") from exc
    finally:
        store.close()
    return _verification_json(record)


class EstimateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    optimistic: float = Field(ge=0, le=1e6)
    likely: float = Field(ge=0, le=1e6)
    pessimistic: float = Field(ge=0, le=1e6)


class TaskIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    days: EstimateIn
    depends_on: list[str] = Field(default_factory=list, max_length=50)
    cost: EstimateIn | None = None
    owner: str = Field(default="", max_length=60)


class PlanIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tasks: list[TaskIn] = Field(default_factory=list, max_length=200)
    deadline_days: float | None = Field(default=None, gt=0, le=1e4)
    budget: float | None = Field(default=None, gt=0)


def _plan_path() -> Path:
    from daedalus.api.engineering import data_root

    return data_root() / "project" / "plan.json"


@router.get("/project/plan")
def get_plan() -> dict[str, object]:
    path = _plan_path()
    if not path.is_file():
        return PlanIn().model_dump()
    return PlanIn.model_validate_json(path.read_text()).model_dump()


@router.put("/project/plan")
def save_plan(plan: PlanIn) -> dict[str, object]:
    path = _plan_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(plan.model_dump_json(indent=2))
    tmp.replace(path)
    return plan.model_dump()


@router.post("/project/forecast")
def forecast_plan(plan: PlanIn) -> dict[str, object]:
    def est(e: EstimateIn) -> project.Estimate:
        return project.Estimate(e.optimistic, e.likely, e.pessimistic)

    try:
        tasks = [
            project.Task(
                t.id,
                t.name,
                est(t.days),
                tuple(t.depends_on),
                est(t.cost) if t.cost else None,
                t.owner,
            )
            for t in plan.tasks
        ]
        result = project.forecast(tasks, deadline_days=plan.deadline_days, budget=plan.budget)
        _, _, timing = project.critical_path(tasks)
    except project.PlanInputError as exc:
        raise HTTPException(422, str(exc)) from exc
    return {
        **result.to_mapping(),
        "slack_days": {k: v.slack for k, v in timing.items()},
        "earliest_start_days": {k: v.earliest_start for k, v in timing.items()},
    }


class BreakdownRequest(EnergyRequest):
    reaction_s: float = Field(default=0.0, ge=0, le=2)


@router.post("/race-breakdown")
def race_breakdown(req: BreakdownRequest) -> dict[str, object]:
    """Race-time budget, tornado and exchange rates (ORDER 4, C19-C21)."""
    from daedalus import raceanalysis

    try:
        car = raceanalysis.Car(
            req.thrust.curve(),
            req.mass_kg,
            req.cda_m2,
            req.crr,
            req.rho_kg_m3,
            req.track_length_m,
        )
        return {
            "budget_ms": raceanalysis.time_budget(car, reaction_s=req.reaction_s),
            "tornado": raceanalysis.tornado(car),
            "exchange_rates": raceanalysis.exchange_rates(car),
        }
    except raceanalysis.RaceAnalysisError as exc:
        raise HTTPException(422, str(exc)) from exc
