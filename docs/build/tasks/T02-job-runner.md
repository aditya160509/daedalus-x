# T02 — Job runner and launching runs from the UI

**Spec:** §10.1, §10.1a (durable job lifecycle), §11.1 · **Lane:** backend-api · **Files:** new `src/daedalus/jobs.py`, `src/daedalus/api/jobs.py`, `apps/cockpit/src/lib/api.ts`, new `apps/cockpit/src/components/jobs/*`, `SimulateWorkspace.tsx` (header only)

## Build
1. **`jobs.py`: durable local queue** on SQLite (`data/jobs.sqlite`), using the stdlib only.
   - Table `jobs(id, kind, params_json, state, created_at, started_at, finished_at, pid, log_path, result_path, error)`.
   - States: `queued → running → succeeded | failed | cancelled`, with `JobState` from `contracts.py`.
   - **One worker process** (`daedalus jobs worker`) that claims jobs atomically (`UPDATE … WHERE state='queued' … RETURNING`) and runs them as subprocesses. The worker is a separate process so the API never blocks.
   - **Resource lock**: at most one `cfd` job runs at once, and other kinds can run alongside. A CFD job gets `procs = min(requested, os.cpu_count() − 2)`.
   - Kinds: `cfd_run` (calls `daedalus cfd run …`), `cfd_viz`, `montecarlo_batch` (for later), `geometry_import`.
   - Cancel sends SIGTERM to the process group, then SIGKILL after 10 s. The state becomes `cancelled`, and the case directory is kept and marked by writing `CANCELLED`.
   - On worker restart, jobs left `running` with a dead pid become `failed` with error "worker restarted".
2. **API** (`/v1/jobs`):
   - `POST /v1/jobs` with body `{kind, params}` validated per kind (Pydantic discriminated union). Run IDs must match `^[a-z0-9_]{3,64}$`, and the endpoint refuses existing run dirs.
   - `GET /v1/jobs?state=`, `GET /v1/jobs/{id}`, `POST /v1/jobs/{id}/cancel`.
   - `GET /v1/jobs/{id}/log?offset=` returns the incremental log tail (max 64 KB per call).
3. **CLI**: `daedalus jobs worker`, `daedalus jobs submit cfd_run --design … --run … --fidelity quick`, `daedalus jobs ls`.
4. **UI**:
   - A "New run" button in the Simulate header opens a shadcn `Dialog` with design select (from `/v1/designs`), speed, fidelity (`quick`/`final`), procs (default 8) and a run id auto-suggested as `<design>_<speed>ms_<fidelity>_<n>`.
   - A **Jobs drawer** (shadcn `Sheet`, right side) lists jobs with state chip, elapsed time, a progress bar parsed from the log (`Time = N` / endTime) and a live log tail in a monospace scroll area (poll every 2 s while running). It has a cancel button with a confirm.
   - When a cfd job succeeds, invalidate the `cfd-runs` query so the new run appears.
5. Add `"jobs"` to `.claude/launch.json` (repo root `..`): `uv run --project daedalus-x daedalus jobs worker`.

## Acceptance
- [ ] Unit tests cover the state machine, atomic claim (two workers in threads, no double claim), the CFD lock, cancel on a `sleep` subprocess job, and the restart recovery.
- [ ] API tests cover submit validation (bad id, existing dir, unknown kind), list, log offset and cancel.
- [ ] The UI compiles. Do not browser-test; the reviewer will.

## References
- FastAPI background work vs separate worker: https://fastapi.tiangolo.com/tutorial/background-tasks/
- SQLite RETURNING (≥3.35): https://www.sqlite.org/lang_returning.html
- shadcn Sheet, Dialog: https://ui.shadcn.com/docs/components/sheet
