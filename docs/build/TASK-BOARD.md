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
| T09 | [Importers, units, calibration](tasks/T09-importers-calibration.md) | backend-api | T02 | todo | |
| T10 | [ORACLE optimisation](tasks/T10-oracle.md) | backend-ml + frontend-2d | T02, T03 | todo | |
| T11 | [FORGE rules and inspections](tasks/T11-forge.md) | backend-api + frontend-2d | — | todo | |
| T12 | [ATLAS evidence workspace](tasks/T12-atlas-evidence.md) | frontend-2d | T02 | todo | |
| T13 | [Competition Mode, PDF report, AR](tasks/T13-competition-mode.md) | frontend | T06, T08, T12 | todo | |
| T14 | [App-wide polish pass](tasks/T14-polish.md) | frontend | all UI tasks | todo | |

## Suggested parallel pairs
- Round 1: **T01** (backend-cfd) with **T07** (frontend-3d) with **T04** (backend-viz) with **T08** (frontend-2d)
- Round 2: **T02** with **T06** with **T11**
- Round 3: **T03**, **T05** (sequential; both use the CPU) with **T09** with **T12**
- Round 4: **T10**, then **T13**, then **T14**

CPU rule: only **one** task that runs OpenFOAM at a time (T01, T03 and T05 share the `backend-cfd` lane for this reason).
