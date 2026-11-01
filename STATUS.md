# Status

Remaining work is tracked task-by-task in [docs/build/TASK-BOARD.md](docs/build/TASK-BOARD.md) (T01–T14). Mapping: T01→P3-02, T02→P1-03, T03→P3-03, T04/T05/T06→P3-04+Appendix B, T07→P6-04, T08→P6-07, T09→P1-04/P2-02, T10→P4-*/P7-*, T11→P5-01/P6-08, T12→P6-09, T13→P6-10, T14→P6-11.

| ID | Title | Owner | Status | Evidence |
|---|---|---|---|---|
| P0-01 | Repo and toolchain | Claude | accepted | [evidence](evidence/P0-01.md) |
| P0-02 | Data contracts | Claude | accepted (2 items moved to P1-01/P1-02) | [evidence](evidence/P0-02.md) |
| P1-01 | Evidence store | Claude | accepted | [evidence](evidence/P1-01.md) |
| P1-02 | API skeleton | Claude | done: health, race, Monte Carlo, designs, CFD runs, flow-field endpoints | [evidence](evidence/P6-07-race.md) |
| P1-03 | Job runner | Codex (GPT-6) | T02 review: durable queue, subprocess worker, cancel/recovery, API and launch drawer | [evidence](evidence/T02.md) |
| P1-04 | Units and imports | GPT | todo | |
| P2-01 | Race model M0–M2 | Claude | accepted | [evidence](evidence/P2-01.md) |
| P2-02 | Calibration and sealed predictions | Claude | sealing/verify/score done (tests/test_predictions.py); calibration needs measured runs | |
| P2-03 | Monte Carlo uncertainty | Claude | done: vectorised, 2000 samples in 0.9 s, API + Race panel (tests/test_montecarlo.py) | |
| P3-01 | Geometry path decision | GPT + Claude | blocked: car CAD/GLB | |
| P3-02 | OpenFOAM case template | Claude + Codex | T01 review: axle rotation, explicit mesh quality and averaged CI gate implemented; single v2 quick mesh rejected (51 skew faces), no v2 Cd | [T01](evidence/T01.md), [motorBike](evidence/P3-02-motorbike.md), [orbit](evidence/P3-02-orbit-baseline.md) |
| P3-03 | Grid study and speed check | Codex (GPT-6) | T03 review: tooling and NASA verification done; 5 quick jobs queued, no campaign executed; Celik table check pending | [evidence](evidence/T03.md) |
| P3-04 | Component forces and field export | Claude + Codex | T04 review: v2 Q/shell/oilflow/separation/Cp0/slices and drag build-up exported in 32.2 s, 29.5 MB; source rejected; viewer additions T06; T05 tooling built, runtime gated by rejected primal | [T04](evidence/T04.md), [original](evidence/P3-04-flow-fields.md) |
| P4-01 | Surrogate | GPT | todo | |
| P4-02 | Next-experiment recommendation | GPT | todo | |
| P4-03 | LHS benchmark harness | GPT | todo | |
| P5-01 | Rules and inspections | GPT | todo | |
| P6-01 | Design system | Claude | accepted (partial) | [evidence](evidence/P6-01-03.md) |
| P6-02 | App shell | Claude | accepted (partial) | [evidence](evidence/P6-01-03.md) |
| P6-03 | 3D car viewer | Claude | accepted (partial) | [evidence](evidence/P6-01-03.md) |
| P6-04 | Design workspace | Claude | partial: GLB viewer, part list, auto-loads reference car | |
| P6-05 | Simulate workspace | Claude | partial: KPIs, convergence, forces, acceptance, 3D flow fields | |
| P6-06 | Optimize workspace | Claude | todo | |
| P6-07 | Race workspace | Claude | partial: telemetry + Monte Carlo spread | [evidence](evidence/P6-07-race.md) |
| P6-08 | Inspect workspace | Claude | todo | |
| P6-09 | Evidence workspace | Claude | todo | |
| P6-10 | Competition Mode | Claude | todo | |
| P6-11 | Polish pass | Claude | todo | |
| P7-01 | Initial + holdout CFD runs | GPT | todo | |
| P7-02 | ORACLE loop live | GPT | todo | |
| P9-01 | Freeze and rehearse | Claude | todo | |
