"""Paired analysis against analytic t intervals and native two-sided power."""

import json

import numpy as np
import pytest
from scipy.stats import t

from daedalus.paired import PairedRequest, analyze, power

CSV = "pair_id,baseline_s,candidate_s\na,1.5,1.49\nb,1.6,1.58\nc,1.4,1.40\nd,1.55,1.52\n"


def request(**kwargs):
    return PairedRequest(
        csv_text=CSV,
        source_label="synthetic test fixture",
        pairing_basis="matched fixture rows",
        **kwargs,
    )


def test_ci_sign_units_and_prospective_detectability():
    result = analyze(request())
    diffs = np.array([-10, -20, 0, -30])
    half = t.ppf(0.975, 3) * np.std(diffs, ddof=1) / 2
    assert result["mean_difference_ms"] == pytest.approx(-15)
    assert result["ci_ms"] == pytest.approx([-15 - half, -15 + half])
    assert len(result["rows"]) == 4
    assert result["provenance"] == "user_entered"
    assert power(
        result["minimum_detectable_ms"] / result["sd_difference_ms"], 20, 0.05
    ) == pytest.approx(0.8)
    assert (
        analyze(request(planned_pairs=40))["minimum_detectable_ms"]
        < result["minimum_detectable_ms"]
    )
    assert power(0, 20, 0.05) == pytest.approx(0.05)
    json.dumps(result, allow_nan=False)


@pytest.mark.parametrize(
    "text",
    [
        "pair_id,baseline_ms,candidate_ms\na,1,2\n",
        CSV.replace("b,", "a,"),
        CSV.replace("1.49", "nan"),
        CSV.replace("1.49", "-1"),
        "pair_id,baseline_s,candidate_s\na,1,1.1\nb,1,1.1\nc,1,1.1\n",
        "pair_id,baseline_s,candidate_s\na,1,1.1\nb,1\nc,1,1.2\n",
    ],
)
def test_bad_source_is_rejected_without_dropping_pairs(text):
    with pytest.raises(ValueError):
        analyze(request().model_copy(update={"csv_text": text}))


def test_api_persists_exact_source_and_result_binding(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from daedalus import contracts as c
    from daedalus.api import create_app
    from daedalus.store import EvidenceStore

    monkeypatch.setenv("DAEDALUS_DATA", str(tmp_path))
    response = TestClient(create_app()).post("/v1/analysis/paired", json=request().model_dump())
    assert response.status_code == 200, response.text
    body = response.json()
    store = EvidenceStore(tmp_path)
    try:
        source = json.loads(store.read_artifact(body["source_artifact_id"]))
        assert source["csv_text"] == CSV
        artifact = store.get(body["result_artifact_id"], c.Artifact)
        assert artifact.source_entity_id == body["source_artifact_id"]
        assert artifact.provenance == c.Provenance.ESTIMATED
    finally:
        store.close()


@pytest.mark.parametrize("pairs", [3, 1000])
@pytest.mark.parametrize("alpha", [0.001, 0.1])
@pytest.mark.parametrize("target", [0.5, 0.99])
def test_planning_boundary_settings_remain_finite(pairs, alpha, target):
    result = analyze(request(planned_pairs=pairs, alpha=alpha, target_power=target))
    assert result["minimum_detectable_ms"] > 0
    effect = result["minimum_detectable_ms"] / result["sd_difference_ms"]
    assert power(effect, pairs, alpha) == pytest.approx(target, abs=1e-8)
