"""ORACLE study generation using the canonical build123d -> importer -> FORGE pipeline."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Lock
from uuid import uuid4

import numpy as np

from daedalus import contracts as c
from daedalus import forge, geometry, oracle, parametric
from daedalus.store import EvidenceStore, sha256_of

_BUILD_LOCK = Lock()


class BuildBusyError(ValueError):
    """Another study build is already using the geometry kernel."""


def build(
    root: Path, baseline: Path, unit: tuple[float, ...], rulebook: Path, *, project_id: str
) -> dict[str, object]:
    if not _BUILD_LOCK.acquire(blocking=False):
        raise BuildBusyError("An ORACLE study is already building; retry when it finishes")
    try:
        return _build(root, baseline, unit, rulebook, project_id)
    finally:
        _BUILD_LOCK.release()


def _build(
    root: Path, baseline: Path, unit: tuple[float, ...], rulebook: Path, project_id: str
) -> dict[str, object]:
    dimensions = parametric.Dimensions.from_design(baseline)
    dimensions.validate()
    if len(unit) != oracle.DIM or not parametric.feasible(np.asarray(unit))[0]:
        raise ValueError("Recommendation violates study bounds: rear chord must be 15-25 mm")
    design_id = f"oracle_{uuid4().hex[:16]}"
    parameters = tuple(
        c.Parameter(name=v.name, value=float(value), unit=v.unit or "1", lower=v.low, upper=v.high)
        for v, value in zip(oracle.VARIABLES, oracle.to_physical(np.array(unit)), strict=True)
    )
    (root / "designs").mkdir(parents=True, exist_ok=True)
    (root / "oracle").mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="build-", dir=root / "oracle") as temporary:
        directory = Path(temporary)
        source = directory / "source.step"
        parametric.write_step(unit, dimensions, source)
        report = geometry.import_car(source, directory, forward_axis="-X", up_axis="+Z")
        checks = forge.check_design(directory, rulebook)
        observations = oracle.Campaign(root).load()
        manifest = {
            "generator": parametric.VERSION,
            "baseline": baseline.name,
            "baseline_geometry_sha256": sha256_of((baseline / "geometry.json").read_bytes()),
            "unit": unit,
            "parameters": [p.model_dump() for p in parameters],
            "provenance": "estimated",
            "campaign_observations": [asdict(o) for o in observations],
            "forecast": oracle.forecast(observations, unit),
            "surface_hashes": {
                file.name: sha256_of(file.read_bytes())
                for file in (directory / "cfd").glob("*.stl")
            },
            "warnings": [
                "Parametric study family, not a reconstruction of the manufactured car",
                "Halo, tether features, loads and manufacturing tolerances need engineering review",
                "Synthetic ORACLE predictions are not CFD observations",
            ],
        }
        (directory / "oracle.json").write_text(json.dumps(manifest, indent=2))
        destination = root / "designs" / design_id
        directory.rename(destination)
    store = EvidenceStore(root)
    try:
        if not store.exists(project_id):
            store.add(
                c.Project(project_id=project_id, team="Veloira", competition_class="Professional")
            )
        store.add(
            c.Design(
                design_id=design_id,
                project_id=project_id,
                parent_design_id=baseline.name if store.exists(baseline.name) else None,
                geometry_hash=sha256_of((destination / "source.step").read_bytes()),
                cad_source="build123d",
                parameters=parameters,
                provenance=c.Provenance.ESTIMATED,
            )
        )
        artifact = store.put_artifact(
            (destination / "source.step").read_bytes(),
            kind="cad_step",
            source_entity_id=design_id,
            provenance=c.Provenance.ESTIMATED,
            units=("mm",),
            warnings=tuple(report.warnings),
        )
        store.put_artifact(
            json.dumps(manifest, sort_keys=True).encode(),
            kind="oracle_candidate",
            source_entity_id=design_id,
            provenance=c.Provenance.ESTIMATED,
        )
    finally:
        store.close()
    return {
        "design_id": design_id,
        "artifact_id": artifact.artifact_id,
        "checks": [asdict(check) for check in checks],
        "failed_rules": sum(check.state == "fail_cad" for check in checks),
        "manual_rules": sum(check.state == "manual_review" for check in checks),
        "warnings": [*manifest["warnings"], *report.warnings],
        "provenance": "estimated",
    }
