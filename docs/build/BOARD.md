# BOARD: what is left, by difficulty

Generated from `PLAN.md` by `scripts/board.py` on every commit. Do not edit by hand:
tick the item in PLAN.md instead.

**Whole plan: 77/147 done (52%).**

| Group | Done | Open |
|---|---|---|
| Easy (10-30 min each) | 0 | 15 |
| Medium (1-2 h each) | 0 | 29 |
| Hard (3-8 h each) | 0 | 10 |
| Needs CFD runs or real measurements | 0 | 16 |

## Easy (10-30 min each)

- [ ] Material-aware mass and centre-of-gravity estimate from geometry. _(3.1 Design Studio)_
- [ ] Cp probe lines. _(3.2 Wind Tunnel and CFD)_
- [ ] y+ and bad-cell maps, skewness histogram. _(3.2 Wind Tunnel and CFD)_
- [ ] Points distribution. Scenario averages exist. A full distribution does not. _(3.3 Race, replay and timing)_
- [ ] Stacked time-budget chart with measured reaction (reaction is fixed at 0 now). _(3.3 Race, replay and timing)_
- [ ] Prior versus posterior density plots. _(3.5 Calibration and physical tests)_
- [ ] Across-run error scoreboard over new measurements. _(3.5 Calibration and physical tests)_
- [ ] Entry for part masses, caliper dimensions, coast-down, tether and load-test data. _(3.5 Calibration and physical tests)_
- [ ] Safety-factor table across all four strength parts in one view. The comparison table covers captured cases only. _(3.7 Structure (strength))_
- [ ] Per-screen provenance labels are not yet consistent everywhere. _(3.8 Records, quality and operations)_
- [ ] Chart exports (PNG on every new chart), linked cursors and keyboard access for every table. _(3.8 Records, quality and operations)_
- [ ] 7. Tokens apply app-wide. Pit Wall Flow panel still blank; Race replay needs the display mesh. _(5. UI redo plan (from UI-REDO.md))_
- [ ] **Why this recommendation.** ORACLE shows its reasons in one line: length-scale importance, EI, uncertainty and nearest rule risk. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Regulation proof-load presets in Strength:** 100 g wheel, 1 kg halo, 200 g tether guide; plus launch and stopping dynamic loads. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Race physics terms:** tether friction with a prior, cartridge mass spread (±0.5 g) in the Monte Carlo, check that gas mass loss is modelled. _(5b. Innovation backlog (researched 2026-11-04))_

## Medium (1-2 h each)

- [ ] Minimum wall thickness, CNC reach and measured-versus-CAD checks. _(3.1 Design Studio)_
- [ ] Δwake and Δforces between two runs. _(3.2 Wind Tunnel and CFD)_
- [ ] Session timing: best, last, interval and reaction history. The tower exists. A full saved timing ledger does not. _(3.3 Race, replay and timing)_
- [ ] Race-level SALib indices and a full variance budget. _(3.3 Race, replay and timing)_
- [ ] Best eligible real-run ghost (scenario ghost exists). _(3.3 Race, replay and timing)_
- [ ] Supported tether model through dynamics and energy balance. _(3.3 Race, replay and timing)_
- [ ] Explicit calibration update from race-day runs. _(3.3 Race, replay and timing)_
- [ ] Campaign acquisition history and engineer proceed, edit or veto records. _(3.4 ORACLE and closed loop)_
- [ ] Repeat-experiment noise estimate, separate from the GP nugget. _(3.4 ORACLE and closed loop)_
- [ ] Across-study scoring and posterior predictive checks. _(3.5 Calibration and physical tests)_
- [ ] Applying a saved posterior to Race. Explicit link and record still missing. _(3.5 Calibration and physical tests)_
- [ ] Feasible frontier across the design space. Single-design ranking exists. _(3.6 FORGE (India rules, in app))_
- [ ] Wall thickness, chamber holes, full section chord, halo comparison. _(3.6 FORGE (India rules, in app))_
- [ ] Inspection log: who, tool, when, raw readings, physical part identity. _(3.6 FORGE (India rules, in app))_
- [ ] Interactive dimensional what-if. _(3.6 FORGE (India rules, in app))_
- [ ] Source-linked decision log and engineering rationale record. _(3.8 Records, quality and operations)_
- [ ] Practical quality: coverage targets are not set. Property tests are partial. OpenAPI-generated types are not in place. _(3.8 Records, quality and operations)_
- [ ] 6. Performance: lazy 3D, one WebGL context per page, dispose resources, demand-driven frames, bundle check. _(5. UI redo plan (from UI-REDO.md))_
- [ ] **Points-aware ORACLE (headline).** Objective = E[racing points] − E[spec penalty], gated by P(legal under manufacturing spread) ≥ 1 − α. Show three picks: fastest, most reliable, recommended. Builds on the P90 robust pick, FORGE pass probability and the race Monte Carlo. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Counterfactual decision record.** Save one comparison of what lowest-Cd would choose against what the points-aware engine chooses, with signed deltas (CdA, mass, margins, time, points) and the reason. This is the smallest useful decision log. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **A/B design comparison** under identical assumptions: geometry, rule margins, CFD acceptance, race time ± uncertainty, plus a "why A wins" line. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **One status badge everywhere:** legal + accepted CFD + calibrated race model, as a filter across Design, ORACLE, Race and FORGE. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Rule-versioned points engine.** Race-mode switch (automatic vs manual reaction). Every scoring rule stored as data with its clause number, with the C9.1/C9.4 and C9.6/C9.7.2 contradictions flagged. Property-test ties and the 3rd/4th-place cliff. Show the ms→points exchange rate next to ms/g. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Class-aware FORGE:** General / Safety / Performance class, rectifiable-at-half-penalty flag, per-car or per-wheel multiplicity, gauge guard band so margin means margin after tool error. Performance failure = ineligible for Fastest Car and Best Engineered Car. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Real-objective optimiser benchmark** on the race model or a small CFD sweep, reported as regret; the synthetic study stays as method validation. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Value-of-information test planner:** recommend the measurement that most reduces points uncertainty. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Car A/B nomination and reaction advisor:** paired-timing posterior, ex-Gaussian reaction fit (scipy `exponnorm`), earlier reaction vs false-start (−2.5 pts) trade-off. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Frozen demo mode** for judges: cached results, no solver calls, low GPU load. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] Chart gaps (task 10): the safety-factor table exists for captured cases. The remaining chart items are in §4. _(9. Done in this plan's last pass (2026-11-04))_

## Hard (3-8 h each)

- [ ] Live parametric controls with validated regeneration. _(3.1 Design Studio)_
- [ ] One renderer and one scene for the advanced field layers. _(3.2 Wind Tunnel and CFD)_
- [ ] Surface LIC and separation lines. _(3.2 Wind Tunnel and CFD)_
- [ ] Accepted-only CFD feedback. STEP-to-mesh hash guard. Performance-rule gate. _(3.4 ORACLE and closed loop)_
- [ ] Separate training pools: synthetic demo, unreviewed input, accepted CFD, physical data. _(3.4 ORACLE and closed loop)_
- [ ] 3. Inspect redo: smooth shading, rule colours on parts, dimension lines, View, Measure, Section, Compare tabs, model table with units. _(5. UI redo plan (from UI-REDO.md))_
- [ ] 4. Strength redo: part sketch with the load arrow, one compact input row, one deflection chart and one stress chart with the limit band, one summary row, all-part table. _(5. UI redo plan (from UI-REDO.md))_
- [ ] Live wind tunnel: GPU lattice-Boltzmann preview while editing. FluidX3D (non-commercial licence: run as a separate optional program, never vendored) or MarcosAsh/Lattice_Fluid_Dynamics (MIT). _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] Neural field surrogate: fine-tune NVIDIA Transolver (DrivAerML, PhysicsNeMo, Apache-2.0) on our runs for instant pressure/wake fields; label "predicted". _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Design-for-manufacture panel:** draft and undercut detection, minimum internal radius vs cutter, 3-axis reach, minimum feature size, model-block containment (trimesh / manifold3d). Extends the open wall-thickness and CNC-reach items. _(5b. Innovation backlog (researched 2026-11-04))_

## Needs CFD runs or real measurements

- [ ] Keyboard, responsive and manufactured-part acceptance. _(3.1 Design Studio)_
- [ ] Yaw and ride-height sweeps. _(3.2 Wind Tunnel and CFD)_
- [ ] Accepted current-car baseline, three-mesh GCI, physical correlation. _(3.2 Wind Tunnel and CFD)_
- [ ] Adjoint tooling exists. Accepted adjoint sensitivity map and constrained updates do not. _(3.4 ORACLE and closed loop)_
- [ ] Repeat-run control chart and gauge R&R. _(3.5 Calibration and physical tests)_
- [ ] Rule coverage reconciled with the regulation text. The YAML has 79 entries; the recount is pending. _(3.6 FORGE (India rules, in app))_
- [ ] Predicted versus measured load-test chart. _(3.7 Structure (strength))_
- [ ] Grouped browser, keyboard, download and responsive review at 1440, 1024 and 375 px. _(3.8 Records, quality and operations)_
- [ ] 8. Screenshot at 1440, compare with Linear and Vercel, fix anything louder than them. _(5. UI redo plan (from UI-REDO.md))_
- [ ] **Turbulence model-form uncertainty:** SST vs transition (kOmegaSSTLM) vs laminar spread as a Cd error bar (wings at Re 3e4–1e5). Needs runs. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] Accepted CFD: a three-mesh GCI study, a speed sweep, and a baseline run that passes the gates. Needs an explicit go-ahead to run solvers. _(7. Real-data needs)_
- [ ] Mass and dimensions: part masses and caliper measurements for the car. _(7. Real-data needs)_
- [ ] Material properties: measured yield and modulus for the strength parts. _(7. Real-data needs)_
- [ ] Load tests: measured deflection and failure load to compare with the beam FEM. _(7. Real-data needs)_
- [ ] Rule text: the official India rule pages, to reconcile the 79 YAML rule entries. _(7. Real-data needs)_
- [ ] Race-day timing: a live or recorded event ledger for calibration and the stadium view. _(7. Real-data needs)_
