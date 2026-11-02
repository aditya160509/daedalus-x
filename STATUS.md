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
| P2-03 | Monte Carlo uncertainty | Claude | done: vectorised, 2000 samples in 0.9 s, API + Race panel, trajectory band p5/p50/p95 (tests/test_montecarlo.py) | [T08](evidence/T08.md) |
| P2-04 | Outcome objective: India NF points, knock-out odds, car choice | Claude (branch next-wave) | review: src/daedalus/outcome.py with 13 tests; not wired to ORACLE, API or UI | [T15](evidence/T15.md) |
| P2-05 | Energy-loss audit | Claude (branch next-wave) | review: src/daedalus/energy.py with 8 tests; no API or UI | [T19-T23](evidence/T19-T23.md) |
| P2-06 | Test planner (D-optimal tests, flags unidentified parameters) | Claude (branch next-wave) | review: src/daedalus/testplan.py with 8 tests; no API or UI | [T19-T23](evidence/T19-T23.md) |
| P2-07 | Third-party timestamps for sealed predictions (RFC 3161) | Claude (branch next-wave) | review: src/daedalus/anchor.py with 7 tests; no real token yet | [T16-T21](evidence/T16-T21.md) |
| P2-08 | Structural analysis, beam FEM with the rule load tests | Claude (branch next-wave) | review: src/daedalus/structure.py with 8 tests; 3D FEA not started | [T16-T21](evidence/T16-T21.md) |
| P3-01 | Geometry path decision | GPT + Claude | blocked: car CAD/GLB | |
| P3-02 | OpenFOAM case template | Claude + Codex | T01 review: axle rotation, explicit mesh quality and averaged CI gate implemented; T01b fixed the mesh: quick and final meshes pass checkMesh (1.5 mm contact step, boundary skewness 4); Cd deferred to new car model | [T01](evidence/T01.md), [T01b](evidence/T01b.md), [motorBike](evidence/P3-02-motorbike.md), [orbit](evidence/P3-02-orbit-baseline.md) |
| P3-03 | Grid study and speed check | Codex (GPT-6) | T03 review: tooling and NASA verification done; 5 quick jobs queued, no campaign executed; Celik table check pending | [evidence](evidence/T03.md) |
| P3-04 | Component forces and field export | Claude + Codex | T04 review: v2 Q/shell/oilflow/separation/Cp0/slices and drag build-up exported in 32.2 s, 29.5 MB; source rejected; viewer additions T06 review: full layer rail, compare, delta, drag build-up; T05 tooling built, runtime gated by rejected primal | [T04](evidence/T04.md), [T06](evidence/T06.md), [original](evidence/P3-04-flow-fields.md) |
| P4-01 | Surrogate | GPT | todo | |
| P4-02 | Next-experiment recommendation | GPT | todo | |
| P4-03 | LHS benchmark harness | GPT | todo | |
| P5-01 | Rules and inspections | GPT | todo | |
| P6-01 | Design system | Claude | accepted (partial) | [evidence](evidence/P6-01-03.md) |
| P6-02 | App shell | Claude | accepted (partial) | [evidence](evidence/P6-01-03.md) |
| P6-03 | 3D car viewer | Claude | accepted (partial) | [evidence](evidence/P6-01-03.md) |
| P6-04 | Design workspace | Claude + DeepSeek | T07 review: studio/engineering modes, exploded view, dimensions and measure, inspector from geometry.json, design switcher, synced compare, 2× PNG snapshot; visual QA pending | [T07](evidence/T07.md) |
| P6-05 | Simulate workspace | Claude | partial: KPIs, convergence, forces, acceptance, 3D flow fields | |
| P6-06 | Optimize workspace | Claude | todo | |
| P6-07 | Race workspace | Claude | T08 review: telemetry wall (channel picker, cursor table, A/B delta, per-channel y-zoom, MC p5–p95 band), what-if sliders with sweep sparklines, race replay, ghost race, presets | [T08](evidence/T08.md), [original](evidence/P6-07-race.md) |
| P6-08 | Inspect workspace | Claude | todo | |
| P6-09 | Evidence workspace | Claude | todo | |
| P6-10 | Competition Mode | Claude | todo | |
| P6-11 | Polish pass | Claude | todo | |
| P7-01 | Initial + holdout CFD runs | GPT | todo | |
| P7-02 | ORACLE loop live | GPT | todo | |
| P9-01 | Freeze and rehearse | Claude | todo | |

Cleanup review 2026-11-01: dead code removed, React Compiler on, knip/jscpd/size-limit/deptry/vulture/ruff S+C901 gates, 0 prod CVEs, no secrets; per-task verdicts in [REVIEW-cleanup](evidence/REVIEW-cleanup.md).
