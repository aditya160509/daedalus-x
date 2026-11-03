"""Queue invariants with real SQLite connections and OS subprocess groups."""

import json
import os
import signal
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

from daedalus.contracts import JobState
from daedalus.jobs import LOG_LIMIT, Job, JobQueue, alive, cpu_limit, start_process


@pytest.fixture
def queue(tmp_path: Path) -> JobQueue:
    root = tmp_path / "data"
    design = root / "designs/car_one"
    design.mkdir(parents=True)
    (design / "geometry.json").write_text("{}")
    return JobQueue(root)


def cfd(queue: JobQueue, name: str = "run_one") -> str:
    return queue.submit("cfd_run", {"design": "car_one", "run": name}).id


def test_states_reservation_and_cpu_cap(queue: JobQueue) -> None:
    jid = cfd(queue)
    assert queue.get(jid).state == JobState.QUEUED
    with pytest.raises(FileExistsError):
        cfd(queue)
    job = queue.claim()
    assert job is not None and job.id == jid and job.state == JobState.RUNNING
    queue.finish(jid, JobState.SUCCEEDED)
    assert queue.get(jid).finished_at is not None
    queue.finish(jid, JobState.FAILED)
    assert queue.get(jid).state == JobState.SUCCEEDED
    assert 1 <= cpu_limit(999) <= 8
    assert cpu_limit(1) == 1


def test_atomic_claim_and_cfd_lock(queue: JobQueue) -> None:
    ids = {cfd(queue, "run_one"), cfd(queue, "run_two")}

    def claim(_index: int) -> Job | None:
        return JobQueue(queue.root).claim()

    with ThreadPoolExecutor(max_workers=2) as pool:
        claimed = list(pool.map(claim, range(2)))
    jobs = [j for j in claimed if j]
    assert len(jobs) == 1 and jobs[0].id in ids
    remaining = ids - {jobs[0].id}
    source = queue.root / "source.step"
    source.write_text("reference path only; this test never imports CAD")
    other = queue.submit(
        "geometry_import",
        {
            "design": "new_car",
            "step": "source.step",
            "forward": "-Y",
            "up": "+Z",
        },
    )
    claimed_other = queue.claim()
    assert claimed_other is not None and claimed_other.id == other.id
    queue.finish(jobs[0].id, JobState.FAILED, "fixture completion")
    next_job = queue.claim()
    assert next_job is not None and next_job.id in remaining


def test_cancel_real_process_group_keeps_case(queue: JobQueue) -> None:
    jid = cfd(queue)
    job = queue.claim()
    assert job is not None
    proc = start_process(queue, job, [sys.executable, "-c", "import time; time.sleep(60)"])
    assert proc is not None and os.getpgid(proc.pid) == proc.pid
    try:
        result = queue.cancel(jid, grace_seconds=0.2)
        assert result.state == JobState.CANCELLED
        assert not alive(proc.pid)
        assert (queue.root / "runs/run_one/CANCELLED").is_file()
        queue.finish(jid, JobState.FAILED)
        assert queue.get(jid).state == JobState.CANCELLED
    finally:
        if proc.poll() is None:
            proc.kill()
        proc.wait()


def test_cancel_queued_does_not_create_case(queue: JobQueue) -> None:
    jid = cfd(queue)
    assert queue.cancel(jid).state == JobState.CANCELLED
    assert queue.claim() is None
    assert not (queue.root / "runs/run_one").exists()


def test_restart_recovery_preserves_live_process(queue: JobQueue) -> None:
    jid = cfd(queue)
    job = queue.claim()
    assert job is not None
    proc = start_process(queue, job, [sys.executable, "-c", "import time; time.sleep(60)"])
    assert proc is not None
    try:
        assert queue.recover() == 0
        os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()
        assert queue.recover() == 1
        assert queue.get(jid).state == JobState.FAILED
        assert queue.get(jid).error == "worker restarted"
    finally:
        if proc.poll() is None:
            proc.kill()
        proc.wait()


def test_log_byte_offsets_bounded_and_progress(queue: JobQueue) -> None:
    jid = cfd(queue)
    job = queue.get(jid)
    data = ("μtest\n" * LOG_LIMIT).encode()
    Path(job.log_path).write_bytes(data)
    first = queue.log(jid)
    assert len(str(first["text"]).encode()) <= LOG_LIMIT
    offset = first["offset"]
    assert isinstance(offset, int)
    second = queue.log(jid, offset)
    next_offset = second["offset"]
    assert isinstance(next_offset, int) and next_offset > offset
    with pytest.raises(ValueError):
        queue.log(jid, -1)
    case = queue.root / "runs/run_one"
    case.mkdir(parents=True)
    (case / "daedalus_manifest.json").write_text(json.dumps({"config": {"max_iterations": 1200}}))
    (case / "log.simpleFoam").write_text("Time = 123\npressure residual\nTime = 200\n")
    result = queue.log(jid)
    assert result["iteration"] == 200 and result["end_time"] == 1200
    assert "Time = 200" in str(result["stage_log"])


@pytest.mark.parametrize(
    "params",
    [
        {"design": "car_one", "run": "../../evil"},
        {"design": "missing", "run": "run_one"},
        {"design": "car_one", "run": "run_one", "procs": 0},
        {"design": "car_one", "run": "run_one", "speed": float("nan")},
    ],
)
def test_validation(queue: JobQueue, params: dict[str, object]) -> None:
    with pytest.raises(ValueError):
        queue.submit("cfd_run", params)


def test_worker_executes_real_montecarlo_job(queue: JobQueue) -> None:
    import subprocess

    req = {
        "race": {
            "mass_kg": 0.075,
            "track_length_m": 20,
            "cda_m2": 0.001,
            "crr": 0.01,
            "input_provenance": "estimated",
            "thrust": {
                "t_s": [0, 0.01, 0.02],
                "force_n": [0, 8, 0],
                "provenance": "estimated",
                "source": "analytic test curve",
            },
        },
        "n": 10,
        "seed": 42,
    }
    job = queue.submit("montecarlo_batch", req)
    worker = subprocess.Popen(
        [sys.executable, "-m", "daedalus.jobs", "worker"],
        env={**os.environ, "DAEDALUS_DATA": str(queue.root)},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    try:
        deadline = time.monotonic() + 10
        while queue.get(job.id).state in (JobState.QUEUED, JobState.RUNNING):
            assert worker.poll() is None
            assert time.monotonic() < deadline
            time.sleep(0.05)
        done = queue.get(job.id)
        assert done.state == JobState.SUCCEEDED, Path(done.log_path).read_text()
        result = json.loads(Path(done.result_path or "").read_text())
        assert result["seed"] == 42 and result["n"] == 10
    finally:
        worker.terminate()
        worker.wait(timeout=5)


def test_stop_settings_forwarded_without_solver(queue: JobQueue, monkeypatch) -> None:
    from daedalus.jobs import execute

    captured = []
    monkeypatch.setattr(
        "daedalus.jobs.subprocess.run", lambda command, **kwargs: captured.append(command)
    )
    job = queue.submit(
        "cfd_run",
        {
            "design": "car_one",
            "run": "custom_stop",
            "early_stop_tolerance": 0.0005,
            "early_stop_window": 500,
            "max_iterations": 2000,
        },
    )
    execute(queue, job)
    command = captured[0]
    assert command[command.index("--early-stop-window") + 1] == "500"
    assert command[command.index("--early-stop-tolerance") + 1] == "0.0005"
    assert command[command.index("--max-iter") + 1] == "2000"
    other = queue.submit("cfd_run", {"design": "car_one", "run": "no_stop", "no_early_stop": True})
    execute(queue, other)
    assert "--no-early-stop" in captured[-1]
