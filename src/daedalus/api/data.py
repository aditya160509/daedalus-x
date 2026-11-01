"""Measured-data import, TITAN calibration and sealed-prediction endpoints (spec §5.2a, §5.4).

The backing evidence store is append-only: an import adds records, it never updates or
deletes. Uploads are capped at 10 MB with an extension whitelist. Calibration writes a new
`titan` Model record and never overwrites an earlier one; predictions seal the full
Monte Carlo request as the manifest, so a prediction cannot be quietly adjusted later.
"""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Annotated, Any, Literal

import numpy as np
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from daedalus import contracts as c
from daedalus import montecarlo, predictions
from daedalus.api.engineering import data_root
from daedalus.calibration import (
    CalibrationInputError,
    MeasuredRun,
    fit,
)
from daedalus.dynamics import ModelLevel, ThrustCurve
from daedalus.importers import (
    ImportRejectedError,
    parse_mass_readings,
    parse_race_timing,
    parse_thrust_curve,
    to_mass_observations,
    to_race_runs,
)
from daedalus.store import (
    EvidenceStore,
    IntegrityError,
    MissingReferenceError,
)

router = APIRouter(prefix="/v1", tags=["data", "calibration"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = (".csv", ".xlsx")


def _store() -> EvidenceStore:
    return EvidenceStore(data_root())


class TimingRowOut(BaseModel):
    run_no: int
    lane: str
    time_s: float
    reaction_s: float | None
    mass_kg: float | None
    notes: str


class MassReadingOut(BaseModel):
    part: str
    value_kg: float
    resolution_kg: float
    instrument: str


class ImportResponse(BaseModel):
    kind: Literal["race_timing", "thrust_curve", "mass_readings"]
    filename: str
    committed: bool
    warnings: list[str] = []
    outlier_indices: list[int] = []
    units: dict[str, str] = {}
    rows: list[TimingRowOut] = []
    readings: list[MassReadingOut] = []
    thrust: dict[str, list[float]] | None = None
    record_ids: list[str] = []
    artifact_id: str | None = None


def _read_upload(file: UploadFile) -> tuple[bytes, str]:
    name = Path(file.filename or "").name
    if not name.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(
            415, f"unsupported file type {name!r}; allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"file exceeds the {MAX_UPLOAD_BYTES // (1 << 20)} MB limit")
    if not data:
        raise HTTPException(422, "file is empty")
    return data, name


def _require(store: EvidenceStore, record_id: str, kind: type[c.Record], label: str) -> c.Record:
    try:
        return store.get(record_id, kind)
    except KeyError as exc:
        raise HTTPException(404, f"{label} {record_id!r} not found") from exc


@router.post("/data/import")
def import_data(
    file: Annotated[UploadFile, File()],
    kind: Annotated[
        Literal["race_timing", "thrust_curve", "mass_readings"], Query(description="import type")
    ],
    commit: Annotated[bool, Query()] = False,
    build_id: Annotated[str | None, Query(description="PhysicalBuild the rows belong to")] = None,
    subject_id: Annotated[
        str | None, Query(description="record the observations attach to")
    ] = None,
    split: Annotated[Literal["calibration", "validation", "exploratory"], Query()] = "calibration",
) -> ImportResponse:
    """Parse an upload; with `commit=true` append the records and the raw file artifact."""
    data, name = _read_upload(file)
    measure: c.Provenance = c.Provenance.MEASURED
    try:
        if kind == "race_timing":
            timings = parse_race_timing(data, name)
            out = ImportResponse(
                kind=kind,
                filename=name,
                committed=False,
                warnings=list(timings.warnings),
                outlier_indices=list(timings.outlier_indices),
                units=timings.units,
                rows=[
                    TimingRowOut(
                        run_no=r.run_no,
                        lane=r.lane,
                        time_s=r.time_s,
                        reaction_s=r.reaction_s,
                        mass_kg=r.mass_kg,
                        notes=r.notes,
                    )
                    for r in timings.rows
                ],
            )
            if not commit:
                return out
            if build_id is None:
                raise HTTPException(422, "race_timing imports need the build_id of a PhysicalBuild")
            store = _store()
            try:
                _require(store, build_id, c.PhysicalBuild, "build")
                runs = to_race_runs(timings, build_id=build_id, split=split)
                ids = [store.add(r).race_run_id for r in runs]
                art = store.put_artifact(
                    data,
                    kind="race_timing_file",
                    source_entity_id=build_id,
                    provenance=measure,
                    units=("s",),
                    warnings=timings.warnings,
                )
                return out.model_copy(
                    update={"committed": True, "record_ids": ids, "artifact_id": art.artifact_id}
                )
            finally:
                store.close()
        if kind == "mass_readings":
            readings = parse_mass_readings(data, name)
            out = ImportResponse(
                kind=kind,
                filename=name,
                committed=False,
                warnings=list(readings.warnings),
                units=readings.units,
                readings=[
                    MassReadingOut(
                        part=r.part,
                        value_kg=r.value_kg,
                        resolution_kg=r.resolution_kg,
                        instrument=r.instrument,
                    )
                    for r in readings.readings
                ],
            )
            if not commit:
                return out
            if subject_id is None:
                raise HTTPException(422, "mass_readings imports need the subject_id to attach to")
            store = _store()
            try:
                if not store.exists(subject_id):
                    raise HTTPException(404, f"subject {subject_id!r} not found")
                obs = to_mass_observations(readings, subject_id=subject_id)
                ids = [store.add(o).observation_id for o in obs]
                art = store.put_artifact(
                    data,
                    kind="mass_readings_file",
                    source_entity_id=subject_id,
                    provenance=measure,
                    units=("kg",),
                    warnings=readings.warnings,
                )
                return out.model_copy(
                    update={"committed": True, "record_ids": ids, "artifact_id": art.artifact_id}
                )
            finally:
                store.close()
        # kind == "thrust_curve"
        curve = parse_thrust_curve(data, name)
        out = ImportResponse(
            kind=kind,
            filename=name,
            committed=False,
            warnings=list(curve.warnings),
            units={"time": "s", "force": "N"},
            thrust={"t_s": list(curve.t_s), "force_n": list(curve.force_n)},
        )
        if not commit:
            return out
        if build_id is None:
            raise HTTPException(422, "thrust_curve imports need the build_id of a PhysicalBuild")
        store = _store()
        try:
            _require(store, build_id, c.PhysicalBuild, "build")
            art = store.put_artifact(
                data,
                kind="thrust_curve_file",
                source_entity_id=build_id,
                provenance=measure,
                units=("s", "N"),
                warnings=curve.warnings,
            )
            return out.model_copy(update={"committed": True, "artifact_id": art.artifact_id})
        finally:
            store.close()
    except ImportRejectedError as exc:
        raise HTTPException(422, str(exc)) from exc


class CalibrationFitResponse(BaseModel):
    model_id: str
    cda_m2: dict[str, float | str]
    crr: dict[str, float | str]
    thrust_scale: dict[str, float | str]
    residual_rms_s: float
    loo_errors_s: list[float]
    loo_rmse_s: float
    n_runs: int
    bootstrap_samples: int
    bootstrap_failed: int
    bootstrap_level: float


class CalibrateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    points: list[MeasuredRun] = Field(min_length=3, max_length=1000)
    thrust_t_s: list[float] = Field(min_length=2, max_length=20_000)
    thrust_force_n: list[float] = Field(min_length=2, max_length=20_000)
    rho_kg_m3: float = Field(default=1.204, gt=0.5, lt=1.5)
    fit_thrust_scale: bool = True
    bootstrap_samples: int = Field(default=1000, ge=100, le=5000)
    seed: int = Field(default=0, ge=0)


@router.post("/calibrations")
def create_calibration(req: CalibrateRequest) -> CalibrationFitResponse:
    """Fit CdA/Crr[/thrust scale] from measured runs; append a new pinned `titan` Model."""
    if len(req.thrust_t_s) != len(req.thrust_force_n):
        raise HTTPException(422, "thrust_t_s and thrust_force_n must have the same length")
    times = [p.time_s for p in req.points]
    if any(t <= 0 for t in times):
        raise HTTPException(422, "every measured time_s must be positive")
    theta_t_s = np.asarray(req.thrust_t_s, float)
    theta_f_n = np.asarray(req.thrust_force_n, float)
    thrust = ThrustCurve(theta_t_s, theta_f_n)
    try:
        cal = fit(
            req.points,
            thrust,
            rho_kg_m3=req.rho_kg_m3,
            fit_thrust_scale=req.fit_thrust_scale,
            bootstrap_samples=req.bootstrap_samples,
            seed=req.seed,
        )
    except CalibrationInputError as exc:
        raise HTTPException(422, str(exc)) from exc
    store = _store()
    try:
        try:
            model = store.add(cal.to_model())
        except MissingReferenceError as exc:
            raise HTTPException(422, str(exc)) from exc
        return CalibrationFitResponse(
            model_id=model.model_id,
            cda_m2=asdict(cal.cda_m2),
            crr=asdict(cal.crr),
            thrust_scale=asdict(cal.thrust_scale),
            residual_rms_s=cal.residual_rms_s,
            loo_errors_s=list(cal.loo_errors_s),
            loo_rmse_s=cal.loo_rmse_s,
            n_runs=cal.n_runs,
            bootstrap_samples=cal.bootstrap_samples,
            bootstrap_failed=cal.bootstrap_failed,
            bootstrap_level=cal.bootstrap_level,
        )
    finally:
        store.close()


@router.get("/calibrations")
def list_calibrations() -> list[dict[str, Any]]:
    store = _store()
    try:
        return [m.model_dump(mode="json") for m in store.records(c.Model) if m.kind == "titan"]
    finally:
        store.close()


@router.get("/calibrations/{model_id}")
def get_calibration(model_id: str) -> dict[str, Any]:
    store = _store()
    try:
        try:
            model = store.get(model_id, c.Model)
        except KeyError as exc:
            raise HTTPException(404, f"model {model_id!r} not found") from exc
        if model.kind != "titan":
            raise HTTPException(404, f"{model_id!r} is not a titan calibration")
        return model.model_dump(mode="json")
    finally:
        store.close()


class SealRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_id: str
    design_id: str
    mass_kg: float = Field(gt=0, le=1)
    track_length_m: float = Field(gt=0, le=100)
    thrust_t_s: list[float] = Field(min_length=2, max_length=20_000)
    thrust_force_n: list[float] = Field(min_length=2, max_length=20_000)
    cda_m2: float = Field(ge=0, le=0.05)
    crr: float = Field(ge=0, le=1)
    rho_kg_m3: float = Field(default=1.204, gt=0.5, lt=1.5)
    model_level: Literal["M1", "M2"] = "M2"
    uncertainty: montecarlo.Uncertainty = montecarlo.Uncertainty()
    n: int = Field(default=2000, ge=10, le=5000)
    seed: int = Field(default=0, ge=0)


class SealResponse(BaseModel):
    prediction_id: str
    predicted_s: float
    interval_low_s: float
    interval_high_s: float
    interval_level: float
    finish_fraction: float
    sealed_at: str


@router.post("/predictions/seal")
def seal_prediction(req: SealRequest) -> SealResponse:
    """Seal the next-race p50 with a p_low-p_high MC interval; manifest = the exact request."""
    if len(req.thrust_t_s) != len(req.thrust_force_n):
        raise HTTPException(422, "thrust_t_s and thrust_force_n must have the same length")
    store = _store()
    try:
        try:
            store.get(req.model_id, c.Model)
        except KeyError as exc:
            raise HTTPException(404, f"model {req.model_id!r} not found") from exc
        if not store.exists(req.design_id):
            raise HTTPException(404, f"design {req.design_id!r} not found")
        car = _car_params(req)
        res = montecarlo.run(
            car,
            req.uncertainty,
            n=req.n,
            seed=req.seed,
            model=ModelLevel(req.model_level),
        )
        if not res.percentiles_s:
            raise HTTPException(422, "no Monte Carlo sample finished; nothing to seal")
        pred = predictions.seal(
            store,
            model_id=req.model_id,
            design_id=req.design_id,
            predicted=c.Quantity(value=res.percentiles_s["p50"], unit="s"),
            interval_low=c.Quantity(value=res.percentiles_s["p5"], unit="s"),
            interval_high=c.Quantity(value=res.percentiles_s["p95"], unit="s"),
            interval_level=0.90,
            in_domain=True,
            manifest={
                "request": req.model_dump(mode="json"),
                "finish_fraction": res.finish_fraction,
                "code_version": "daedalus 0.1.0",
            },
        )
        if pred.sealed_at is None:
            raise HTTPException(500, "prediction was stored without a seal time")
        return SealResponse(
            prediction_id=pred.prediction_id,
            predicted_s=pred.predicted.value,
            interval_low_s=pred.interval_low.value,
            interval_high_s=pred.interval_high.value,
            interval_level=pred.interval_level,
            finish_fraction=res.finish_fraction,
            sealed_at=pred.sealed_at.isoformat(),
        )
    finally:
        store.close()


def _car_params(req: SealRequest) -> montecarlo.CarParams:
    return montecarlo.CarParams(
        mass_kg=req.mass_kg,
        track_length_m=req.track_length_m,
        thrust=ThrustCurve(
            np.asarray(req.thrust_t_s, float), np.asarray(req.thrust_force_n, float)
        ),
        cda_m2=req.cda_m2,
        crr=req.crr,
        rho_kg_m3=req.rho_kg_m3,
    )


@router.get("/predictions")
def list_predictions() -> list[dict[str, Any]]:
    store = _store()
    try:
        return [p.model_dump(mode="json") for p in store.records(c.Prediction)]
    finally:
        store.close()


class ScoreRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    measured_value: float = Field(gt=0)
    unit: str = "s"


class ScoreResponse(BaseModel):
    prediction_id: str
    measured: float
    predicted: float
    unit: str
    error: float
    relative_error: float
    inside_interval: bool


@router.post("/predictions/{prediction_id}/score")
def score_prediction(prediction_id: str, req: ScoreRequest) -> ScoreResponse:
    store = _store()
    try:
        try:
            s = predictions.score(
                store, prediction_id, c.Quantity(value=req.measured_value, unit=req.unit)
            )
        except KeyError as exc:
            raise HTTPException(404, f"prediction {prediction_id!r} not found") from exc
        except (ValueError, IntegrityError) as exc:
            raise HTTPException(422, str(exc)) from exc
        return ScoreResponse(
            prediction_id=s.prediction_id,
            measured=s.measured,
            predicted=s.predicted,
            unit=s.unit,
            error=s.error,
            relative_error=s.relative_error,
            inside_interval=s.inside_interval,
        )
    finally:
        store.close()
