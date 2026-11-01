# DAEDALUS X — Build Playbook

**What this is:** the step-by-step execution guide for building Daedalus X, from an empty folder to the nationals freeze. Every AI model and every human on the team follows this file.
**What it is not:** the design. The design is `f1.md` (master specification v2.0). If this playbook and `f1.md` disagree on *what* to build, `f1.md` wins; this file decides *how and in what order*.

---

## 1. Roles

| Role | Who | Owns | Never does |
|---|---|---|---|
| **Lead** | Claude (Opus 5.5) | Architecture decisions, the whole frontend, design system, integration, final review and acceptance of **every** step (including backend) | Accept its own work without running the checks |
| **Backend** | GPT (sol sub-agents) | Python engineering packages, API, database, job runner, CFD automation, tests and verification scripts | Change frontend code, data contracts or acceptance criteria without Lead approval |
| **Team** | Krishna + Veloira members | CAD/STEP files, rulebook, physical tests (thrust, track, video), measurements, approvals, judging narrative | Type numbers by hand into evidence that should come from an instrument file |

Rules of the split:
- Contracts (`packages/contracts`, Pydantic models, OpenAPI) are **owned by Lead**. Backend proposes changes; Lead merges.
- Backend writes the tests for backend code. Lead **re-runs** them and spot-checks results before accepting.
- Lead writes frontend tests. Backend may be asked to review them.
- A step is done only when Lead writes `ACCEPTED` in its evidence file.

---

## 2. Ground rules (all models, all steps)

1. **One step at a time.** Work only on the step you were given. Do not start the next one.
2. **No bloat.** No code, files, folders, dependencies, abstractions or features that the current step does not need. No empty scaffolding. No "future-proofing."
3. **No fake data passed as real.** Anything synthetic has `origin: "synthetic"` and a visible label in the interface. Never invent measurements, CFD results, times or statistics.
4. **Spec first.** Before coding, read the `f1.md` sections listed in the step. If the spec is unclear, stop and ask; don't guess.
5. **Pin everything.** Every dependency gets an exact version in `pyproject.toml` / `package.json` lockfiles.
6. **Units always.** Every number that has a unit carries it (Pint in Python, an explicit unit field in JSON).
7. **Tests with the code.** Code without its tests is not done.
8. **Evidence file for every step** (Section 4). No evidence file means the step is not done.
9. **Honest reporting.** Failed checks, skipped tests and known limits are written in the evidence file, never hidden.
10. **One branch: `main`.** No feature branches or PRs. Commit small, working changes directly to `main` with messages that say what changed and why; push after each passing commit. Never push a commit with failing checks.
11. **Free tools only.** No paid services, no cloud accounts, no API keys required to build or run.
12. **Don't touch other owners' files** without saying so in the evidence file.

---

## 3. Toolchain (pinned at step P0-01)

| Area | Tool |
|---|---|
| Python | Python 3.12, `uv` for env/deps, `ruff` (lint+format), `mypy --strict`, `pytest` |
| Backend | FastAPI, Pydantic v2, SQLite (via SQLAlchemy 2), Pint, NumPy, SciPy |
| Optimisation | Ax (BoTorch backend) |
| Geometry | build123d (and/or FreeCAD Python, decided at P3-01) |
| CFD | OpenFOAM via OpenFOAM.app (`brew install gerlero/openfoam/openfoam`), `foamlib`, snappyHexMesh, simpleFoam; Docker fallback |
| Post-processing | ParaView (`pvpython`) for GLB/slice export |
| Video | Tracker (Open Source Physics) → CSV |
| Frontend | Next.js (App Router) + TypeScript strict, Tailwind, shadcn/ui (Radix), TanStack Query, Zod, ECharts, React Three Fiber/Three.js |
| Frontend tests | Vitest, Playwright, axe-core |
| CI | GitHub Actions (free tier) |

---

## 4. Evidence files

Every step writes `evidence/<STEP-ID>.md` using exactly this template:

```markdown
# <STEP-ID> — <step title>
Owner: <Claude | GPT | Team>     Commits: <hashes>     Date: <YYYY-MM-DD>

## Done
- <bullet list of what now exists/works>

## Files changed
- <path> — <one line why>

## Checks run (command → result)
- `uv run pytest tests/unit -q` → 42 passed
- <screenshot path / log path / output file>

## Acceptance criteria
- [x] <criterion copied from the step> — <proof: test name, file, screenshot>
- [ ] <criterion not met> — <why, what is needed>

## Not done / known limits
- <honest list, or "none">

## Data provenance
- <every dataset used: real / synthetic, source file, hash>

## Review
Reviewer: <Claude>   Verdict: ACCEPTED | CHANGES REQUESTED
Notes: <what was re-run, what was checked>
```

`STATUS.md` at repo root holds one line per step: `ID | title | owner | status (todo/in progress/review/accepted/blocked) | evidence link`.

---

## 5. Quality standards

### 5.1 Backend (GPT writes, Claude verifies)
- `ruff check`, `ruff format --check`, `mypy --strict` clean.
- Every public function has type hints; no `Any` without a comment.
- Engineering code (`engineering/`) ≥ 90% line coverage; API ≥ 80%.
- Scientific functions have **reference tests** against known answers (analytic solutions, hand calculations) with stated tolerances.
- No network calls in tests. Tests run in < 60 s except those marked `@pytest.mark.slow` (CFD).
- Errors are typed and returned with a reason; never return a fake value on failure.
- Every stored record has: ID, created time, origin, units, source hash where applicable.

### 5.2 Frontend (Claude writes and verifies)
- TypeScript strict, no `any`, ESLint clean, no console errors.
- Visual system from `f1.md` §7.2: graphite background, off-white text, one cyan accent, amber/red only for risk; tabular numerals; design tokens only (no ad-hoc colours/spacings).
- Every value shown has units, provenance label (measured / simulated / predicted / estimated / synthetic) and a path to its source ID.
- Target screens: 1440×900 (booth) and 1280×800 (laptop). Desktop only.
- Performance: cached interactions < 250 ms; first usable render < 2 s on the event laptop; 60 fps camera orbit on the car GLB.
- Accessibility: keyboard navigation, visible focus, axe-core zero serious violations, reduce-motion respected.
- Every screen has loading, empty, error and "unavailable" states.
- Works fully offline (no CDN fonts or scripts).
- Each frontend step ends with Playwright screenshots at both sizes, stored under `evidence/screens/<STEP-ID>/`, and reviewed in the browser.

### 5.3 Review checklist (Claude, every step)
1. Re-run all checks listed in the evidence file myself.
2. Read the diff; reject anything outside the step's scope.
3. Check acceptance criteria one by one against proof.
4. Check no synthetic data is labelled real.
5. Write verdict in the evidence file and update `STATUS.md`.

---

## 6. Repository layout

```text
daedalus-x/
  apps/cockpit/          # Next.js frontend                        (Claude)
  src/daedalus/          # Python backend package                  (GPT)
    contracts.py         #   shared schemas (Claude owns, GPT proposes)
    dynamics.py, ...     #   one module per engineering responsibility; split into
                         #   subpackages only when a module outgrows one file
    api/                 #   FastAPI app
  runners/cfd/           # OpenFOAM case template + run script     (GPT)
  data/synthetic/        # labelled fixtures
  data/real/             # real imports (never edited by hand)
  docs/                  # SPEC.md (f1.md copy) and this playbook
  evidence/              # step evidence files + screenshots
  tests/                 # pytest suites
  STATUS.md
```

Folders are created only when a step needs them.

---

## 7. The steps

Format for each step: **ID — title** · Owner · Needs · Spec · Do · Accept when.

Phases run partly in parallel: backend (P1–P5) and frontend (P6) proceed side by side after P0; team tasks (T) start immediately.

### Phase T — Team tasks (start today, run in parallel)

**T-01 — Collect inputs** · Team · Spec §18
Do: get India Nationals rulebook + class, scoring rubric, AI-use rules, event date; car as **STEP or native CAD** (GLB is display-only); car mass, wheel/axle dimensions.
Accept when: files stored in `data/real/intake/` and listed in `evidence/T-01.md`.

**T-02 — Thrust rig** · Team (supervised) · Spec §5.2a
Do: load cell + HX711 + Arduino logging force vs time to CSV; calibrate with known weights; get teacher approval.
Accept when: calibration CSV + 5–10 cartridge thrust traces with units and sample rate.

**T-03 — Video and timing setup** · Team · Spec §5.2a
Do: phone at ≥ 240 fps, fixed position, measured scale in frame; practise one Tracker export.
Accept when: one Tracker CSV (time, position) from a real run.

**T-04 — Baseline pilot runs** · Team · Spec §12.2
Do: 8–10 runs of the same baseline car, filmed, with lane/cartridge batch/session recorded; plus coast-down runs (no cartridge).
Accept when: raw videos, Tracker CSVs and timing sheet stored.

---

### Phase P0 — Foundation

**P0-01 — Repo and toolchain** · GPT (backend) + Claude (frontend) · Spec §8
Do: create repo, `uv` project, Next.js app, lint/format/type configs, pinned deps, GitHub Actions running lint + tests, `STATUS.md`, `evidence/`.
Accept when: CI green on an empty test each side; versions recorded.

**P0-02 — Data contracts** · Claude · Spec §9, §9.3
Do: Pydantic models for Project, Rulebook, Design, Component, Experiment, SolverRun, Observation, PhysicalBuild, Inspection, RaceRun, Model, Prediction, ValidationProtocol, Acquisition, Decision, AIUseLog, Artifact envelope; separate fields for provenance / scientific acceptance / job state / staleness; generate OpenAPI → TS types + Zod.
Accept when: contract tests pass; `synthetic` cannot be changed to `measured` by any API input; TS types build.

---

### Phase P1 — Backend core (GPT)

**P1-01 — Evidence store** · Spec §9.2, §9.2a
Do: SQLite schema from contracts, content-addressed artifact folder (SHA-256), immutable records, referential integrity, stale-for-revision flag.
Accept when: tests prove records can't be overwritten, missing references are rejected, hashes verify.

**P1-02 — API skeleton** · Spec §11.1
Do: FastAPI endpoints from §11.1 returning contract types; long tasks return job IDs.
Accept when: contract tests match OpenAPI; 4xx errors carry reasons.

**P1-03 — Job runner** · Spec §10.1a
Do: SQLite job table + single worker process; states queued/running/succeeded/failed/cancelled; logs saved; cancel stops the process.
Accept when: tests for submit, run, fail, cancel, restart-marks-lost-jobs-failed; no duplicate execution.

**P1-04 — Units and imports** · Spec §9.1, §5.2a
Do: Pint units; CSV importers for thrust traces (T-02), Tracker CSV (T-03), timing sheets (T-04), inspection readings; validation with clear errors.
Accept when: real sample files from T-tasks import correctly (or synthetic fixtures until they exist, labelled).

---

### Phase P2 — TITAN race physics (GPT)

**P2-01 — Race model M0–M2** · Spec §5.1, §5.1a
Do: `solve_ivp` model: M0 constant acceleration, M1 measured thrust + mass, M2 + drag CdA(v) + rolling resistance; terminate at official finish distance; non-finish reported as non-finish.
Accept when: analytic limit tests (constant thrust no loss, zero thrust, constant deceleration) pass at stated tolerance; units checked; step-size convergence test.

**P2-02 — Calibration and sealed predictions** · Spec §5.2, §9.2, §12.2
Do: fit friction/drag params on calibration runs only; seal prediction manifests (hash + timestamp + exported copy) before held-out runs; scoring (MAE, RMSE, interval coverage).
Accept when: tests prove held-out data can't enter calibration; sealed prediction can't be edited; corrections create new records.

**P2-03 — Monte Carlo uncertainty** · Spec §5.3a
Do: propagate thrust/friction variation; report quantiles, non-finish probability; stability check vs sample count.
Accept when: seeded reproducibility test; convergence check within stated tolerance.

---

### Phase P3 — AETHER geometry and CFD (GPT, Team supplies CAD)

**P3-01 — Geometry path decision** · GPT + Claude · Spec §4.1, §4.1b
Do: inspect T-01 CAD; choose FreeCAD-Python or build123d; define 4 parameters with bounds; fix coordinate frame; export STL (CFD) + GLB (display) with hashes.
Accept when: decision recorded; one parameter change produces new hashed geometry; asymmetric test shape proves axes are correct.

**P3-02 — OpenFOAM case template** · Spec §4.1a, §4.2b
Do: install OpenFOAM.app; case template (half-model symmetry, snappyHexMesh, simpleFoam k-ω SST, forces/forceCoeffs per patch group, convergence stop); `daedalus cfd run <design_id>` via foamlib through the job runner.
Accept when: one real baseline run completes; forces imported with units; logs and mesh-quality report stored; runtime recorded.

**P3-03 — Grid study and speed check** · Spec §4.2a, §4.3a
Do: 3 refined meshes on baseline (GCI only if convergence supports it); 3 speeds × 2 designs.
Accept when: grid report published (including "unresolved" if so); medium mesh justified; speed decision recorded.

**P3-04 — Component forces and field export** · Spec §4.4a, §4.4c
Do: body/wing/wheel force groups with sum check vs total; ParaView script exports surface-pressure GLB, streamlines and 2–3 wake slices with scalar ranges/units.
Accept when: component sum matches total within tolerance; exported asset values match raw field sample.

---

### Phase P4 — ORACLE (GPT, Claude reviews design)

**P4-01 — Surrogate** · Spec §3.3
Do: Ax experiment with GP on drag/CdA; applicability domain; cross-validation report; reserved holdout IDs excluded from all fitting.
Accept when: holdout segregation test passes; model ID versioned; CV report generated.

**P4-02 — Next-experiment recommendation** · Spec §3.2, §3.3
Do: candidate set passing geometry checks → GP posterior samples → frozen TITAN → expected improvement in race time; output reason, benefit, uncertainty, cost, constraints, approval state; student approval endpoint queues CFD.
Accept when: same seed + data = same proposal; illegal geometry never proposed; no-feasible-candidate state handled.

**P4-03 — LHS benchmark harness** · Spec §12, §12.2c
Do: budget-matched comparison ORACLE vs Latin hypercube (repeated seeds; offline replay first).
Accept when: harness runs on synthetic objective with known optimum and reports mean/spread/failures.

---

### Phase P5 — FORGE inspection (GPT)

**P5-01 — Rules and inspections** · Spec §6
Do: rule records from the real rulebook (T-01) with source location; deterministic CAD checks for computable rules; measurement import; states pass_measured / fail_measured / pass_cad_only / at_risk / manual_review / not_tested; evidence-pack export (PDF/CSV).
Accept when: boundary tests per rule; CAD-only never shows as measured pass; export regenerates identically.

---

### Phase P6 — Frontend (Claude; runs alongside P1–P5 using synthetic data, then switches to real)

**P6-01 — Design system** · Spec §7.2
Do: tokens (colour, type, spacing, radius, motion), base components (panel, metric tile with units+provenance, table, tabs, badges, evidence drawer), dark theme, offline fonts.
Accept when: component gallery page; axe clean; screenshots at both sizes reviewed.

**P6-02 — App shell** · Spec §7.3, §7.6
Do: persistent context strip (project, design rev, build, job progress), six workspace navigation, shared selection state, job panel, keyboard nav.
Accept when: switching workspaces keeps selection; switching project clears incompatible selection; e2e test.

**P6-03 — 3D car viewer** · Spec §4.4, §7.5
Do: R3F viewer: GLB load, orbit/pan/zoom, camera presets, component selection linked to data, viewport maximise, A/B aligned cameras.
Accept when: 60 fps orbit on target laptop; selection syncs to inspector; missing GLB shows unavailable state.

**P6-04 — Design workspace** · Spec §7.3, §7.6
Do: parameters with bounds, preview, commit new revision, revision compare, geometry check results.
Accept when: commit creates new hash; invalid values blocked with reason.

**P6-05 — Simulate workspace (Virtual Wind Tunnel)** · Spec §4.4c
Do: car in tunnel view, pressure surface, streamlines, slices, force bars (component + total), residual/force history, mesh quality, A/B with common colour scale, run sheet.
Accept when: every field shows quantity, unit, run ID, quality; rejected runs visibly rejected; screenshots reviewed.

**P6-06 — Optimize workspace** · Spec §3.2, §12.2a
Do: recommendation card (reason, expected gain, uncertainty, cost, constraints), approve button, candidate comparison, benchmark chart, power display.
Accept when: approval creates job; insufficient data shows honest state.

**P6-07 — Race workspace (telemetry)** · Spec §7.7
Do: linked channels (thrust, position, velocity, prediction, residuals) with shared cursor, A/B delta, sealed prediction vs measured, uncertainty band, replay marker.
Accept when: cursor values match source traces in test; no extrapolated channels.

**P6-08 — Inspect workspace** · Spec §6
Do: rule list with states, nominal vs measured side by side, 3D highlight, export pack.
Accept when: states and badges match backend exactly; CAD-only clearly distinct.

**P6-09 — Evidence workspace** · Spec §7.7, §9
Do: decision timeline, provenance chain drill-down to raw files, correlation view, campaign/run browser with filters, CSV/JSON export, AI-use log.
Accept when: any number in the app can be traced to its source in ≤ 3 clicks (e2e test).

**P6-10 — Competition Mode** · Spec §7.8, §14
Do: read-only scene playlist over frozen bundle, 8-scene storyboard, offline, one-click reset, static fallback.
Accept when: cold start offline on event laptop; reset works; all labels visible.

**P6-11 — Polish pass** · Spec §7.2, §7.9
Do: consistency review of every screen, motion, empty/error states, performance profiling.
Accept when: full screenshot set reviewed at both sizes; perf targets met and recorded.

---

### Phase P7 — CFD campaign (GPT runs, Claude verifies)

**P7-01 — Initial + holdout runs** · Spec §13.3b
Do: freeze pipeline; run ~10 LHS + 5 holdout designs overnight on the Mac.
Accept when: all runs pass quality or are recorded as failed; holdout untouched by fitting.

**P7-02 — ORACLE loop live** · Spec §3, §12.2c
Do: ~10 ORACLE-selected runs with student approvals; refit after each; confirm finalist vs comparator with fresh verification runs; evaluate holdout once.
Accept when: proposal → approval → run → import → refit chain recorded for every run; benchmark vs LHS reported (positive or not).

---

### Phase P8 — Physical validation (Team runs, GPT analyses, Claude verifies)

**P8-01 — Calibrate TITAN** · Spec §5.2
Do: calibrate on T-04 pilot + thrust traces.
Accept when: parameters with uncertainty; identifiability noted.

**P8-02 — Sealed prediction and track test** · Spec §12.2, §12.2b
Do: build finalist (and baseline); seal predictions; run blocked/randomized A/B races; score.
Accept when: sealed manifest predates runs; results scored unchanged; decision record written (including negative results).

---

### Phase P9 — Nationals freeze (Claude leads)

**P9-01 — Freeze and rehearse** · Spec §13.4 G5, §14
Do: freeze evidence bundle; back up DB + artifacts; rehearse Competition Mode on event laptop offline 3×; export portfolio data; final claim review against evidence.
Accept when: every claim in the presentation links to accepted evidence; rehearsal log; backup restored once successfully.

---

## 8. Gate map

| Gate (spec §13.4) | Steps that must be ACCEPTED |
|---|---|
| G0 intake | T-01, P0-01, P0-02 |
| G1 aero chain | P3-01 … P3-04 |
| G2 physical acquisition | T-02, T-03, T-04, P1-04 |
| G3 race prediction | P2-01 … P2-03, P8-01 |
| G4 experiment loop | P4-01 … P4-03, P7-01, P7-02 |
| G5 freeze | P5-01, P6-01 … P6-11, P8-02, P9-01 |

If behind schedule: cut Tier 1 items first (spec §13.2), never cut evidence collection.

---

## 9. Handoff prompt (paste into any AI model)

```text
You are working on Daedalus X. Read BUILD_PLAYBOOK.md sections 1–6, then step <STEP-ID> in section 7,
then the f1.md sections that step lists. Work ONLY on <STEP-ID>, committing directly to main.
Follow the ground rules (section 2) and quality standards (section 5) exactly.
When finished, write evidence/<STEP-ID>.md using the template in section 4, set STATUS.md to "review",
and stop. Do not start another step. If anything is unclear or blocked, write it in the evidence file and stop.
```

---

## 10. Starting order

1. Team: T-01 now (CAD as STEP/native, rulebook). T-02/T-03 this week.
2. GPT: P0-01 backend half → P1-01 → P1-02 → P1-03 → P2-01.
3. Claude: P0-01 frontend half → P0-02 → P6-01 → P6-02 → P6-03.
4. When T-01 arrives: P3-01 → P3-02 (first real CFD run).

---
**2026-11-01:** remaining work is specified task-by-task in `docs/build/` (start with `docs/build/00-START-HERE.md`). That pack supersedes the phase list above for everything not yet accepted.
