# Task board

Status: `todo` → `in-progress` (put your model name in) → `review` (handoff written) → `accepted` (reviewer only).
Take the **first `todo` whose dependencies are `accepted` or `review`**. "Lane" shows which tasks can run at the same time: tasks in different lanes touch disjoint files.

| ID | Task | Lane | Depends on | Status | Owner |
|---|---|---|---|---|---|
| T01 | [CFD accuracy: rotating wheels, mesh quality, unsteady gate](tasks/T01-cfd-accuracy.md) | backend-cfd | — | review | Codex (GPT-6) |
| T01b | Contact-patch mesh fix: raise `ground_offset_m` 0.5 mm → 1.5–2 mm (plinth fallback, contact refinement boxes) until checkMesh has 0 failures. Mesh-check only, no CFD run until the new car model lands | backend-cfd | T01 | review | Claude Opus 5.5 |
| T02 | [Job runner + launch runs from the UI](tasks/T02-job-runner.md) | backend-api | — | review | Codex (GPT-6) |
| T03 | [Grid study + speed check](tasks/T03-grid-study.md) | backend-cfd | T01 | review | Codex (GPT-6) |
| T04 | [Flow insight export: Q-criterion, iso-surfaces, oil flow, separation, total-pressure loss, drag build-up](tasks/T04-flow-insight-export.md) | backend-viz | — | review | Codex (GPT-6) |
| T05 | [Adjoint drag sensitivity map](tasks/T05-adjoint-sensitivity.md) | backend-cfd | T01 | in-progress | Codex (GPT-6) |
| T06 | [AETHER Wind Tunnel: commercial-grade visuals](tasks/T06-aether-wind-tunnel.md) | frontend-3d | T04 | review | DeepSeek V4.1 |
| T07 | [AETHER Design Studio](tasks/T07-aether-design-studio.md) | frontend-3d | — | review | DeepSeek V4.1 |
| T08 | [TITAN race experience](tasks/T08-titan-race.md) | frontend-2d | — | review | Claude (Codebuff) |
| T09 | [Importers, units, calibration](tasks/T09-importers-calibration.md) | backend-api | T02 | review | Claude Opus 5.5 (recovered) |
| T10 | [ORACLE optimisation](tasks/T10-oracle.md) | backend-ml + frontend-2d | T02, T03 | review | Claude Opus 5.5 (lean: numpy GP, Pit Wall) |
| T11 | [FORGE rules and inspections](tasks/T11-forge.md) | backend-api + frontend-2d | — | review | Claude Opus 5.5 (CAD checks; inspections not yet) |
| T12 | [ATLAS evidence workspace](tasks/T12-atlas-evidence.md) | frontend-2d | T02 | review | Claude Opus 5.5 (timeline drawer + verify; lineage graph not built) |
| T13 | [Competition Mode, PDF report, AR](tasks/T13-competition-mode.md) | frontend | T06, T08, T12 | review | Claude Opus 5.5 (presenter + Typst PDF; AR not built) |
| T14 | [App-wide polish pass](tasks/T14-polish.md) | frontend | all UI tasks | todo | |
| T15 | Outcome objective: expected India NF points, knock-out win probability, tail risk (MASTER-PLAN 22.3) | backend-ml | T10 | review | Claude Sonnet 5.5 (branch next-wave; outcome.py, no API or UI yet) |
| T16 | Third-party timestamps for sealed predictions | backend-api | P2-02 | todo | |
| T17 | Bayesian calibration, information gain, out-of-sample validation | backend-ml | T09 | todo | |
| T18 | Cartridge thrust model (gas type to be confirmed) | backend-ml | gas confirmed | todo | |
| T19 | Energy-loss audit | backend-ml | - | todo | |
| T20 | FORGE v2: missing measures, pass probability, points at risk | backend-api + frontend-2d | T11 | todo | |
| T21 | Structural analysis: beam FEM first, 3D FEA later | backend-ml | - | todo | |
| T22 | Engineering drawing pack generator and 2D drawing importer | backend-api | T07 | todo | |
| T23 | Test planner (expected information gain) | backend-ml | T17 | todo | |
| T24 | Gradient-enhanced and multi-fidelity ORACLE | backend-ml | T05, T10 | todo | |
| T25 | Free-form adjoint shape optimisation | backend-cfd | T05, T20 | todo | |
| T26 | Exhaust base-bleed study (research) | backend-cfd | T18 | todo | |
| T27 | Physical-in-the-loop optimiser with model discrepancy | backend-ml | T15, T17 | todo | |
| T28 | Field intelligence from public portfolios | backend-ml | - | todo | |
| T29 | Legal-frontier map | backend-api | T20 | todo | |
| T30 | Virtual scrutineer from photos | backend-api | T20 | todo | |
| T31 | Video test lab | backend-ml | T17 | todo | |
| T32 | As-built twin | backend-cfd | T20 | todo | |
| T33 | Project twin for the 90-point project management scorecard | frontend-2d | - | todo | |
| T34 | Red-team mode, V&V dossier, post-event regret report | backend-ml | T10, T17 | todo | |
| T35 | Community calibration | backend-ml | T17 | todo | |

## Suggested parallel pairs
- Round 1: **T01** (backend-cfd) with **T07** (frontend-3d) with **T04** (backend-viz) with **T08** (frontend-2d)
- Round 2: **T02** with **T06** with **T11**
- Round 3: **T03**, **T05** (sequential; both use the CPU) with **T09** with **T12**
- Round 4: **T10**, then **T13**, then **T14**

CPU rule: only **one** task that runs OpenFOAM at a time (T01, T03 and T05 share the `backend-cfd` lane for this reason).

## Build order (2026-11-01): build first, long runs and full QA last
Build everything first. Each build task runs only its own fast checks (format, types, lint, its unit tests); no CFD and no browser.

| # | Task | Built from (existing open source) | Build hours |
|---|---|---|---|
| 1 | UI master plan P0s (Haiku agent, running) | coss ui, T3 Code, cmdk, Dockview, drei | 3–4 |
| 2 | T09 review and fix (uncommitted, failing checks) | pint, openpyxl, scipy.optimize | 1.5 |
| 3 | T10 ORACLE | Optuna, BoTorch/Ax, optuna-dashboard charts | 3 |
| 4 | T11 FORGE | Pydantic rule schema, three-cad-viewer highlight | 2.5 |
| 5 | T12 ATLAS | TanStack Table, SQLite FTS5 | 2.5 |
| 6 | T13 report, competition mode, AR | Typst, model-viewer | 3 |
| 7 | CAD studio and flowing air (UI plan C/D) | three-cad-viewer, webgl-wind | 4 |

**Build total ≈ 20 h.**

### Deferred to the end (only after all builds land)
| Run | Needs | Time |
|---|---|---|
| L1 | New car: import, mesh, quick CFD | new car model | ~20 min |
| L2 | Final-fidelity CFD → accepted Cd | L1 | ~60–90 min |
| L3 | T03 grid study (5 runs) | L2 | ~3–4 h |
| L4 | T05 adjoint sensitivity | L2 | ~45 min |
| L5 | T10 optimisation loop (CFD-in-the-loop) | L2 | overnight |
| Q1 | Full QA: browser pass all workspaces, Lighthouse, axe, screenshots, full pytest + pnpm check | all builds | ~2 h |
