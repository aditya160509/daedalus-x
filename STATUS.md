# Status

| ID | Title | Owner | Status | Evidence |
|---|---|---|---|---|
| P0-01 | Repo and toolchain | Claude | accepted | [evidence](evidence/P0-01.md) |
| P0-02 | Data contracts | Claude | accepted (2 items moved to P1-01/P1-02) | [evidence](evidence/P0-02.md) |
| P1-01 | Evidence store | Claude | accepted | [evidence](evidence/P1-01.md) |
| P1-02 | API skeleton | Claude | done: health, race, Monte Carlo, designs, CFD runs, flow-field endpoints | [evidence](evidence/P6-07-race.md) |
| P1-03 | Job runner | GPT | todo | |
| P1-04 | Units and imports | GPT | todo | |
| P2-01 | Race model M0–M2 | Claude | accepted | [evidence](evidence/P2-01.md) |
| P2-02 | Calibration and sealed predictions | Claude | sealing/verify/score done (tests/test_predictions.py); calibration needs measured runs | |
| P2-03 | Monte Carlo uncertainty | Claude | done: vectorised, 2000 samples in 0.9 s, API + Race panel (tests/test_montecarlo.py) | |
| P3-01 | Geometry path decision | GPT + Claude | blocked: car CAD/GLB | |
| P3-02 | OpenFOAM case template | Claude | template + pipeline done; first Orbit run rejected (Cd unsteady 5.6%, 9 skewed faces) | [motorBike](evidence/P3-02-motorbike.md), [orbit](evidence/P3-02-orbit-baseline.md) |
| P3-03 | Grid study and speed check | GPT | todo | |
| P3-04 | Component forces and field export | Claude | done: Cp surface, streamlines, wake/centreline slices in cockpit | [evidence](evidence/P3-04-flow-fields.md) |
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
