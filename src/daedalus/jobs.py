"""Durable local jobs; the API enqueues, a separate worker owns subprocess groups."""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import re
import signal
import sqlite3
import subprocess
import sys
import time
from collections.abc import Iterator, Mapping
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from daedalus.contracts import JobState
from daedalus.contracts import LocalJob as Job

JobKind = Literal["cfd_run", "cfd_viz", "geometry_import", "montecarlo_batch", "oracle_benchmark"]
KINDS = ("cfd_run", "cfd_viz", "geometry_import", "montecarlo_batch", "oracle_benchmark")
ID_PATTERN = re.compile(r"^[a-z0-9_]{3,64}$")
LOG_LIMIT = 64 * 1024


def data_root() -> Path:
    return Path(os.environ.get("DAEDALUS_DATA", Path(__file__).resolve().parents[2] / "data"))


def now() -> str:
    return datetime.now(UTC).isoformat()


def cpu_limit(requested: int) -> int:
    return max(1, min(requested, 8, (os.cpu_count() or 2) - 2))


def alive(pid: int | None) -> bool:
    if pid is None:
        return False
    try:
        waited, _ = os.waitpid(pid, os.WNOHANG)
        if waited == pid:
            return False
    except ChildProcessError:
        # The API and a restarted worker are not parents of the original subprocess.
        waited = 0
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


class JobQueue:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        (self.root / "jobs").mkdir(exist_ok=True)
        self.path = self.root / "jobs.sqlite"
        with self.connection() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY, kind TEXT NOT NULL, params_json TEXT NOT NULL,
                    state TEXT NOT NULL CHECK(
                        state IN ('queued','running','succeeded','failed','cancelled')),
                    created_at TEXT NOT NULL, started_at TEXT, finished_at TEXT, pid INTEGER,
                    log_path TEXT NOT NULL, result_path TEXT, error TEXT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS jobs_new_output ON jobs(kind, result_path)
                    WHERE kind IN ('cfd_run', 'geometry_import');
            """)

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def path_under_root(self, relative: str) -> Path:
        path = (self.root / relative).resolve()
        if not path.is_relative_to(self.root) or path == self.root:
            raise ValueError("job paths must remain inside the local data directory")
        return path

    def item_path(self, kind: str, item_id: object) -> Path:
        if not isinstance(item_id, str) or not ID_PATTERN.fullmatch(item_id):
            raise ValueError("IDs must match ^[a-z0-9_]{3,64}$")
        return self.path_under_root(f"{kind}/{item_id}")

    def submit(self, kind: str, params: Mapping[str, object]) -> Job:
        if kind not in KINDS:
            raise ValueError(f"unknown job kind {kind!r}")
        spec = dict(params)
        output: Path | None = None
        if kind == "cfd_run":
            design = self.item_path("designs", spec.get("design"))
            if not (design / "geometry.json").is_file():
                raise ValueError("design does not contain geometry.json")
            output = self.item_path("runs", spec.get("run"))
            procs = spec.get("procs", 8)
            if not isinstance(procs, int) or isinstance(procs, bool) or procs < 1:
                raise ValueError("procs must be a positive integer")
            spec["procs"] = cpu_limit(procs)
            speed = spec.get("speed", 20.0)
            if not isinstance(speed, (int, float)) or not 0 < speed < 100:
                raise ValueError("speed must be in (0, 100) m/s")
            for key in ("base_cell_m", "domain_cell_m"):
                value = spec.get(key)
                if value is not None and (
                    not isinstance(value, (float, int)) or not 0 < value <= 0.5
                ):
                    raise ValueError(f"{key} must be in (0, 0.5] m")
            if spec.get("acceptance_mode") not in (None, "steady", "averaged"):
                raise ValueError("acceptance_mode must be steady or averaged")
            if spec.get("fidelity", "quick") not in ("quick", "final"):
                raise ValueError("fidelity must be quick or final")
            from daedalus.api.jobs import CfdParams

            spec = CfdParams.model_validate(spec).model_dump(exclude_none=True)
        elif kind == "cfd_viz":
            case = self.item_path("runs", spec.get("run"))
            if not (case / "daedalus_result.json").is_file():
                raise ValueError("visualization requires a finished CFD run")
        elif kind == "geometry_import":
            source = spec.get("step")
            if not isinstance(source, str):
                raise ValueError("step must name an existing file under data")
            step = self.path_under_root(source)
            if not step.is_file() or step.suffix.lower() not in (".step", ".stp"):
                raise ValueError("step must name an existing STEP file under data")
            output = self.item_path("designs", spec.get("design"))
            for key in ("forward", "up"):
                if spec.get(key) not in ("+X", "-X", "+Y", "-Y", "+Z", "-Z"):
                    raise ValueError(f"{key} must name a signed coordinate axis")
            if str(spec["forward"])[-1] == str(spec["up"])[-1]:
                raise ValueError("forward and up must be perpendicular")
        elif kind == "oracle_benchmark":
            from daedalus.benchmark_campaign import read_protocol

            protocol_id = spec.get("protocol_id")
            if not isinstance(protocol_id, str) or not ID_PATTERN.fullmatch(protocol_id):
                raise ValueError("protocol_id must name a stored benchmark protocol")
            read_protocol(self.root, protocol_id)
            spec = {"protocol_id": protocol_id}
        else:
            # Reuse the API's numerical request boundary; import it only for this job kind.
            from daedalus.api.race import MonteCarloRequest

            spec = MonteCarloRequest.model_validate(spec).model_dump(mode="json")
        if output is not None and output.exists():
            raise FileExistsError(f"{output.name} already exists; choose a new output ID")
        job_id = "job_" + uuid4().hex[:16]
        if kind in ("montecarlo_batch", "oracle_benchmark"):
            output = self.root / "jobs" / f"{job_id}.result.json"
        job = Job(
            id=job_id,
            kind=kind,
            params_json=json.dumps(spec, allow_nan=False),
            state=JobState.QUEUED,
            created_at=now(),
            started_at=None,
            finished_at=None,
            pid=None,
            log_path=str(self.root / "jobs" / f"{job_id}.log"),
            result_path=str(output) if output else None,
            error=None,
        )
        try:
            with self.connection() as db:
                db.execute(
                    "INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    tuple(job.model_dump(mode="json").values()),
                )
        except sqlite3.IntegrityError as exc:
            raise FileExistsError("an existing job already reserves this output ID") from exc
        return job

    def get(self, job_id: str) -> Job:
        with self.connection() as db:
            row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if row is None:
            raise KeyError(job_id)
        return Job(**dict(row))

    def list(self, state: JobState | None = None) -> list[Job]:
        with self.connection() as db:
            if state:
                query = "SELECT * FROM jobs WHERE state=? ORDER BY created_at DESC, id"
                rows = db.execute(query, (state,)).fetchall()
            else:
                rows = db.execute("SELECT * FROM jobs ORDER BY created_at DESC, id").fetchall()
        return [Job(**dict(row)) for row in rows]

    def claim(self) -> Job | None:
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                """
                UPDATE jobs SET state='running', started_at=?, pid=?
                WHERE id=(SELECT id FROM jobs WHERE state='queued'
                    AND (kind NOT IN ('cfd_run','cfd_viz','oracle_benchmark') OR NOT EXISTS
                        (SELECT 1 FROM jobs WHERE state='running'
                         AND kind IN ('cfd_run','cfd_viz','oracle_benchmark')))
                    ORDER BY created_at, id LIMIT 1)
                AND state='queued' RETURNING *
            """,
                (now(), os.getpid()),
            ).fetchone()
        return Job(**dict(row)) if row else None

    def finish(self, job_id: str, state: JobState, error: str | None = None) -> None:
        if state not in (JobState.SUCCEEDED, JobState.FAILED, JobState.CANCELLED):
            raise ValueError("finish requires a terminal state")
        with self.connection() as db:
            db.execute(
                "UPDATE jobs SET state=?, finished_at=?, error=? WHERE id=? AND state='running' "
                "AND (error IS NULL OR ?='cancelled')",
                (state, now(), error, job_id, state),
            )

    def recover(self) -> int:
        recovered = 0
        for job in self.list(JobState.RUNNING):
            pid_file = self.root / "jobs" / f"{job.id}.pid"
            pid = int(pid_file.read_text()) if pid_file.exists() else job.pid
            if not alive(pid):
                self.finish(job.id, JobState.FAILED, "worker restarted")
                recovered += 1
            elif pid != job.pid:
                with self.connection() as db:
                    db.execute(
                        "UPDATE jobs SET pid=? WHERE id=? AND state='running'", (pid, job.id)
                    )
        return recovered

    def cancel(self, job_id: str, grace_seconds: float = 10.0) -> Job:
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            if row is None:
                raise KeyError(job_id)
            job = Job(**dict(row))
            if job.state == JobState.QUEUED:
                db.execute(
                    "UPDATE jobs SET state='cancelled',finished_at=? WHERE id=?", (now(), job_id)
                )
            elif job.state == JobState.RUNNING:
                db.execute("UPDATE jobs SET error='cancellation requested' WHERE id=?", (job_id,))
        if job.state == JobState.RUNNING:
            pid = job.pid
            try:
                group = os.getpgid(pid) if pid is not None and alive(pid) else None
            except ProcessLookupError:
                group = None
            if pid is not None and group == pid:
                try:
                    os.killpg(pid, signal.SIGTERM)
                    until = time.monotonic() + grace_seconds
                    while alive(pid) and time.monotonic() < until:
                        time.sleep(0.05)
                    if alive(pid):
                        os.killpg(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pid = None
            if job.kind == "cfd_run" and job.result_path:
                case = Path(job.result_path)
                case.mkdir(parents=True, exist_ok=True)
                (case / "CANCELLED").write_text(now())
            self.finish(job.id, JobState.CANCELLED, "cancelled by user")
        return self.get(job_id)

    def log(self, job_id: str, offset: int = 0) -> dict[str, object]:
        if offset < 0:
            raise ValueError("offset must be non-negative")
        job = self.get(job_id)
        path = Path(job.log_path)
        size = path.stat().st_size if path.exists() else 0
        if offset > size:
            raise ValueError("offset exceeds current log size; restart at zero")
        payload = b""
        if path.exists():
            with path.open("rb") as stream:
                stream.seek(offset)
                payload = stream.read(LOG_LIMIT // 2)
        text = payload.decode("utf-8", errors="replace")
        stage_log = ""
        iteration: int | None = None
        end_time: int | None = None
        if job.kind == "cfd_run" and job.result_path:
            case = Path(job.result_path)
            manifest = case / "daedalus_manifest.json"
            if manifest.exists():
                end_time = int(json.loads(manifest.read_text())["config"]["max_iterations"])
            stages = sorted(case.glob("log.*"), key=lambda p: p.stat().st_mtime)
            if stages:
                with stages[-1].open("rb") as stream:
                    stream.seek(max(0, stages[-1].stat().st_size - LOG_LIMIT // 2))
                    stage_log = (
                        stages[-1].name
                        + "\n"
                        + stream.read(LOG_LIMIT // 2 - 100).decode("utf-8", errors="replace")
                    )
            solver_log = case / "log.simpleFoam"
            if solver_log.exists():
                with solver_log.open("rb") as stream:
                    stream.seek(max(0, solver_log.stat().st_size - LOG_LIMIT))
                    tail = stream.read(LOG_LIMIT).decode("utf-8", errors="replace")
                times = re.findall(r"^Time = ([0-9]+)", tail, re.MULTILINE)
                iteration = int(times[-1]) if times else None
        return {
            "text": text,
            "offset": offset + len(payload),
            "has_more": offset + len(payload) < size,
            "stage_log": stage_log,
            "iteration": iteration,
            "end_time": end_time,
        }


def start_process(queue: JobQueue, job: Job, command: list[str]) -> subprocess.Popen[bytes] | None:
    """Persist the subprocess group before a concurrent cancel can select it."""
    with queue.connection() as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT state,error FROM jobs WHERE id=?", (job.id,)).fetchone()
        if row is None or row[0] != JobState.RUNNING or row[1] is not None:
            return None
        with Path(job.log_path).open("ab") as log:
            proc = subprocess.Popen(
                command,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                env={
                    **os.environ,
                    "PYTHONUNBUFFERED": "1",
                    **(
                        {
                            "OMP_NUM_THREADS": "1",
                            "OPENBLAS_NUM_THREADS": "1",
                            "MKL_NUM_THREADS": "1",
                            "VECLIB_MAXIMUM_THREADS": "1",
                        }
                        if job.kind == "oracle_benchmark"
                        else {}
                    ),
                },
            )
        try:
            (queue.root / "jobs" / f"{job.id}.pid").write_text(str(proc.pid))
            db.execute("UPDATE jobs SET pid=? WHERE id=?", (proc.pid, job.id))
        except BaseException:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
            raise
    return proc


def worker(queue: JobQueue, poll_seconds: float = 0.25) -> None:
    processes: dict[str, subprocess.Popen[bytes]] = {}
    with (queue.root / "jobs" / "worker.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise ValueError("a jobs worker already owns this data directory") from exc
        queue.recover()
        try:
            while True:
                for job_id, proc in list(processes.items()):
                    code = proc.poll()
                    if code is not None:
                        queue.finish(
                            job_id,
                            JobState.SUCCEEDED if code == 0 else JobState.FAILED,
                            None if code == 0 else f"process exited {code}; inspect log",
                        )
                        del processes[job_id]
                if len(processes) < 2:
                    job = queue.claim()
                    if job:
                        try:
                            proc = start_process(
                                queue,
                                job,
                                [
                                    sys.executable,
                                    "-m",
                                    "daedalus.jobs",
                                    "execute",
                                    str(queue.root),
                                    job.id,
                                ],
                            )
                            if proc:
                                processes[job.id] = proc
                        except OSError as exc:
                            queue.finish(job.id, JobState.FAILED, f"cannot start job: {exc}")
                time.sleep(poll_seconds)
        finally:
            for job_id in processes:
                queue.cancel(job_id)


def execute(queue: JobQueue, job: Job) -> None:
    params = json.loads(job.params_json)
    base = [sys.executable, "-m", "daedalus.cli"]
    if job.kind == "cfd_run":
        design = queue.item_path("designs", params["design"])
        case = queue.item_path("runs", params["run"])
        command = [
            *base,
            "cfd",
            "run",
            str(design),
            str(case),
            "--speed",
            str(params.get("speed", 20)),
            "--procs",
            str(cpu_limit(params.get("procs", 8))),
            "--fidelity",
            params.get("fidelity", "quick"),
        ]
        for key, flag in (
            ("base_cell_m", "--base-cell"),
            ("domain_cell_m", "--domain-cell"),
            ("acceptance_mode", "--acceptance-mode"),
            ("early_stop_tolerance", "--early-stop-tolerance"),
            ("early_stop_window", "--early-stop-window"),
            ("max_iterations", "--max-iter"),
        ):
            if params.get(key) is not None:
                command.extend([flag, str(params[key])])
        if params.get("no_early_stop", False):
            command.append("--no-early-stop")
    elif job.kind == "cfd_viz":
        command = [*base, "cfd", "viz", str(queue.item_path("runs", params["run"]))]
    elif job.kind == "geometry_import":
        command = [
            *base,
            "geometry",
            "import",
            str(queue.path_under_root(params["step"])),
            str(queue.item_path("designs", params["design"])),
            f"--forward={params['forward']}",
            f"--up={params['up']}",
        ]
    elif job.kind == "oracle_benchmark":
        from daedalus.benchmark_campaign import execute as execute_benchmark

        execute_benchmark(queue.root, job)
        return
    elif job.kind == "montecarlo_batch":
        from daedalus.api.race import MonteCarloRequest, race_montecarlo

        result = race_montecarlo(MonteCarloRequest.model_validate(params))
        Path(job.result_path or "").write_text(result.model_dump_json(indent=2))
        print(f"Monte Carlo result: {job.result_path}", flush=True)
        return
    else:
        raise ValueError(f"unsupported persisted kind {job.kind!r}")
    subprocess.run(command, check=True, env={**os.environ, "DAEDALUS_DATA": str(queue.root)})


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="daedalus jobs")
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("worker")
    sub.add_parser("ls")
    submit = sub.add_parser("submit")
    submit.add_argument("kind", choices=KINDS)
    submit.add_argument("--design")
    submit.add_argument("--run")
    submit.add_argument("--fidelity", choices=("quick", "final"), default="quick")
    submit.add_argument("--speed", type=float, default=20)
    submit.add_argument("--procs", type=int, default=8)
    submit.add_argument("--step")
    submit.add_argument("--forward")
    submit.add_argument("--up")
    submit.add_argument("--request", type=Path, help="Numerical job request JSON")
    internal = sub.add_parser("execute")
    internal.add_argument("root", type=Path)
    internal.add_argument("id")
    args = parser.parse_args(argv)
    queue = JobQueue(args.root if args.action == "execute" else data_root())
    if args.action == "execute":
        job = queue.get(args.id)
        if job.state != JobState.RUNNING:
            return 1
        try:
            execute(queue, job)
        except Exception as exc:
            queue.finish(job.id, JobState.FAILED, str(exc))
            raise
        queue.finish(job.id, JobState.SUCCEEDED)
    elif args.action == "worker":
        worker(queue)
    elif args.action == "ls":
        print(json.dumps([j.public() for j in queue.list()], indent=2))
    else:
        if args.kind in ("montecarlo_batch", "oracle_benchmark"):
            if args.request is None:
                parser.error(f"{args.kind} requires --request JSON")
            params = json.loads(args.request.read_text())
        elif args.kind == "cfd_run":
            params = {
                "design": args.design,
                "run": args.run,
                "speed": args.speed,
                "procs": args.procs,
                "fidelity": args.fidelity,
            }
        elif args.kind == "cfd_viz":
            params = {"run": args.run}
        else:
            params = {
                "design": args.design,
                "step": args.step,
                "forward": args.forward,
                "up": args.up,
            }
        print(json.dumps(queue.submit(args.kind, params).public(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
