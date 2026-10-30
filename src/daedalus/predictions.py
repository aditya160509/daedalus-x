"""Sealed predictions (spec §5.4, P2-02).

A prediction is sealed before the outcome is known: its content and the full manifest that
produced it (model config, inputs, code version) are serialised canonically, hashed, and
written to the append-only store together. Later scoring re-hashes the manifest; any change
to either breaks the seal, so a prediction cannot be quietly adjusted after the race.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from daedalus import contracts as c
from daedalus.store import EvidenceStore, IntegrityError, sha256_of

MANIFEST_KIND = "prediction_manifest"


def canonical(obj: Any) -> bytes:
    """Deterministic JSON: sorted keys, no whitespace, finite numbers only."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def seal(
    store: EvidenceStore,
    *,
    model_id: str,
    design_id: str,
    predicted: c.Quantity,
    interval_low: c.Quantity,
    interval_high: c.Quantity,
    interval_level: float,
    in_domain: bool,
    manifest: dict[str, Any],
) -> c.Prediction:
    units = {predicted.unit, interval_low.unit, interval_high.unit}
    if len(units) != 1:
        raise ValueError(f"prediction and interval must share one unit, got {sorted(units)}")
    if not interval_low.value <= predicted.value <= interval_high.value:
        raise ValueError("predicted value must lie inside its interval")

    sealed_at = c.utcnow()
    draft = c.Prediction(
        model_id=model_id,
        design_id=design_id,
        predicted=predicted,
        interval_low=interval_low,
        interval_high=interval_high,
        interval_level=interval_level,
        in_domain=in_domain,
        sealed_at=sealed_at,
    )
    body = canonical({"prediction": _core(draft), "manifest": manifest})
    pred = draft.model_copy(update={"manifest_hash": sha256_of(body)})
    store.add(pred)
    store.put_artifact(
        body,
        kind=MANIFEST_KIND,
        source_entity_id=pred.prediction_id,
        provenance=c.Provenance.PREDICTED,
    )
    return pred


def verify(store: EvidenceStore, prediction_id: str) -> dict[str, Any]:
    """Return the sealed manifest after checking the seal; raise IntegrityError if broken."""
    pred = store.get(prediction_id, c.Prediction)
    if pred.manifest_hash is None or pred.sealed_at is None:
        raise IntegrityError(f"{prediction_id} was never sealed")
    arts = [
        a
        for a in store.records(c.Artifact)
        if a.source_entity_id == prediction_id and a.kind == MANIFEST_KIND
    ]
    if len(arts) != 1:
        raise IntegrityError(f"{prediction_id} has {len(arts)} manifests, expected 1")
    body = store.read_artifact(arts[0].artifact_id)  # re-hashes file content
    if sha256_of(body) != pred.manifest_hash:
        raise IntegrityError(f"{prediction_id} manifest does not match its seal")
    doc = json.loads(body)
    if doc["prediction"] != _core(pred):
        raise IntegrityError(f"{prediction_id} record differs from what was sealed")
    manifest: dict[str, Any] = doc["manifest"]
    return manifest


@dataclass(frozen=True)
class Score:
    prediction_id: str
    measured: float
    predicted: float
    unit: str
    error: float  # measured - predicted
    relative_error: float
    inside_interval: bool


def score(store: EvidenceStore, prediction_id: str, measured: c.Quantity) -> Score:
    """Compare a verified, sealed prediction against a measurement in the same unit."""
    verify(store, prediction_id)
    pred = store.get(prediction_id, c.Prediction)
    if measured.unit != pred.predicted.unit:
        raise ValueError(
            f"unit mismatch: measured {measured.unit}, predicted {pred.predicted.unit}"
        )
    if measured.value == 0:
        raise ValueError("measured value is zero; relative error undefined")
    err = measured.value - pred.predicted.value
    return Score(
        prediction_id=prediction_id,
        measured=measured.value,
        predicted=pred.predicted.value,
        unit=measured.unit,
        error=err,
        relative_error=err / measured.value,
        inside_interval=pred.interval_low.value <= measured.value <= pred.interval_high.value,
    )


def _core(p: c.Prediction) -> dict[str, Any]:
    d: dict[str, Any] = p.model_dump(mode="json", exclude={"manifest_hash", "created_at"})
    return d
