"""Evidence binding and resource exclusion; never launches CFD or a benchmark campaign."""

import itertools
import json
from pathlib import Path

import pytest

from daedalus import benchmark_campaign, oracle
from daedalus.contracts import JobState
from daedalus.jobs import JobQueue
from daedalus.oracle_benchmark import BenchmarkSpec
from daedalus.oracle_diagnostics import leave_one_out


def test_protocol_precedes_queue_and_blocks_cfd(tmp_path):
    registered = benchmark_campaign.register(tmp_path, BenchmarkSpec(), "veloira")
    protocol = benchmark_campaign.read_protocol(tmp_path, registered["protocol_id"])
    assert protocol["spec"]["seeds"] == 10
    assert protocol["provenance"] == "synthetic"
    queue = JobQueue(tmp_path)
    first = queue.claim()
    assert first is not None and first.kind == "oracle_benchmark"
    design = tmp_path / "designs" / "car_one"
    design.mkdir(parents=True)
    (design / "geometry.json").write_text("{}")
    second = queue.submit("cfd_run", {"design": "car_one", "run": "run_one"})
    assert queue.claim() is None
    queue.finish(first.id, JobState.FAILED, "fixture completion")
    assert queue.claim().id == second.id


def test_implementation_drift_rejected_before_execution(tmp_path, monkeypatch):
    registered = benchmark_campaign.register(tmp_path, BenchmarkSpec(), "veloira")
    job = JobQueue(tmp_path).get(registered["job"]["id"])
    monkeypatch.setattr(benchmark_campaign, "implementation", lambda: {"changed": "yes"})
    with pytest.raises(ValueError, match="changed after preregistration"):
        benchmark_campaign.execute(tmp_path, job)
    assert not Path(job.result_path).exists()


def test_result_bound_to_job_and_protocol(tmp_path, monkeypatch):
    from daedalus import oracle_benchmark

    registered = benchmark_campaign.register(tmp_path, BenchmarkSpec(), "veloira")
    queue = JobQueue(tmp_path)
    job = queue.claim()
    monkeypatch.setattr(
        oracle_benchmark, "run", lambda *args, **kwargs: {"provenance": "synthetic"}
    )
    benchmark_campaign.execute(tmp_path, job)
    queue.finish(job.id, JobState.SUCCEEDED)
    result = benchmark_campaign.detail(tmp_path, queue.get(job.id))
    assert result["result"]["protocol_id"] == registered["protocol_id"]
    assert result["result"]["job_id"] == job.id
    second = benchmark_campaign.register(tmp_path, BenchmarkSpec(seed=8), "veloira")
    other = queue.claim()
    assert other.id == second["job"]["id"]
    Path(other.result_path).write_text(
        json.dumps({"result_artifact_id": result["result_artifact_id"]})
    )
    queue.finish(other.id, JobState.SUCCEEDED)
    with pytest.raises(ValueError, match="not bound"):
        benchmark_campaign.detail(tmp_path, queue.get(other.id))


def test_leave_one_out_intervals_include_targets_without_leaking(tmp_path):
    observations = oracle.Campaign(tmp_path).load()
    result = leave_one_out(observations)
    assert result["provenance"] == "synthetic"
    assert result["observations"] == len(observations)
    for row in result["rows"]:
        assert row["lower90_m2"] < row["predicted_m2"] < row["upper90_m2"]
        assert row["target_m2"] == observations[row["index"]].cda_m2
    for item in result["coverage"]:
        assert 0 <= item["lower95"] <= item["observed"] <= item["upper95"] <= 1
    with pytest.raises(ValueError, match="4-64"):
        leave_one_out(observations[:3])


def test_native_sampler_budget_and_seed_contract(monkeypatch):
    import numpy as np

    from daedalus import oracle_benchmark

    # Avoid repeated GP fits here; native Optuna and SciPy sampler paths still execute.
    monkeypatch.setattr(
        oracle, "next_best", lambda *args, **kwargs: (np.full(oracle.DIM, 0.5), 0.0, None)
    )
    result = oracle_benchmark.run(BenchmarkSpec(budget=8, n_init=4, seeds=10))
    assert len(result["methods"]) == 6
    assert len(result["evaluations"]) == 6 * 10 * 8
    for method in result["methods"]:
        curve = method["mean_cda_m2"]
        assert len(curve) == 8 and all(a >= b for a, b in itertools.pairwise(curve))
        assert all(
            lo <= mean <= hi
            for lo, mean, hi in zip(
                method["lower_cda_m2"], curve, method["upper_cda_m2"], strict=True
            )
        )
    for seed in range(7, 17):
        starts = {
            method: [
                row["unit"]
                for row in result["evaluations"]
                if row["method"] == method and row["seed"] == seed and row["index"] <= 4
            ]
            for method in ("gp_ei", "tpe", "cmaes")
        }
        assert starts["gp_ei"] == starts["tpe"] == starts["cmaes"]
