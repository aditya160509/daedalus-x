# BOARD: what is left, by difficulty

Generated from `PLAN.md` by `scripts/board.py` on every commit. Do not edit by hand:
tick the item in PLAN.md instead.

**Whole plan: 110/168 done (65%).**

| Group | Done | Open |
|---|---|---|
| Easy (10-30 min each) | 14 | 5 |
| Medium (1-2 h each) | 19 | 22 |
| Hard (3-8 h each) | 0 | 11 |
| Needs CFD runs or real measurements | 0 | 20 |

## Easy (10-30 min each)

- [ ] 7. Tokens apply app-wide. Pit Wall Flow prefers the selected solved run; browser-check the flow render and Race replay with an imported display GLB. _(5. UI redo plan (from UI-REDO.md))_
- [ ] Stadium panel rotation between big numbers, table and history. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Event leaderboard in stadium view. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Put the frozen demo on Vercel Hobby from `apps/cockpit`, deploying on push to `main`. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Production start script (`next build`, `next start`) plus Cloudflare Quick Tunnel for live sessions. _(5c. Added from the full doc sweep (2026-11-05))_
- [x] Material-aware mass and centre-of-gravity estimate from geometry. _(3.1 Design Studio)_
- [x] Cp probe lines. _(3.2 Wind Tunnel and CFD)_
- [x] Wall y+ map, projected bad-cell map and skewness histogram from OpenFOAM fields. Generate missing quality fields with checkMesh from the existing mesh. _(3.2 Wind Tunnel and CFD)_
- [x] Points distribution. _(3.3 Race, replay and timing)_
- [x] Stacked time-budget chart with measured reaction. _(3.3 Race, replay and timing)_
- [x] Prior versus posterior density plots. _(3.5 Calibration and physical tests)_
- [x] Across-run error scoreboard over new measurements. _(3.5 Calibration and physical tests)_
- [x] Entry for part masses, caliper dimensions, coast-down, tether and load-test data. _(3.5 Calibration and physical tests)_
- [x] Safety-factor table across all four strength parts in one view. _(3.7 Structure (strength))_
- [x] Shared provenance badges applied to Wind Tunnel analyses and mesh, nominal Design results, Race timing and Compute. Mixed timing views distinguish prediction from entered measurements. _(3.8 Records, quality and operations)_
- [x] PNG export by default on ECharts; shared iteration cursor for Cd and residuals; labeled keyboard-scrollable tables and native row actions. _(3.8 Records, quality and operations)_
- [x] **Why this recommendation.** ORACLE shows its reasons in one line: length-scale importance, EI, uncertainty and nearest rule risk. _(5b. Innovation backlog (researched 2026-11-04))_
- [x] **Regulation proof-load presets in Strength:** 100 g wheel, 1 kg halo, 200 g tether guide; plus launch and stopping dynamic loads. _(5b. Innovation backlog (researched 2026-11-04))_
- [x] **Race physics terms:** M2 Monte Carlo has a half-normal tether prior, uniform cartridge mass spread (±0.5 g by default in Race), and optional gas mass loss proportional to cumulative thrust impulse. The gas profile is an estimate and defaults to zero until supplied. _(5b. Innovation backlog (researched 2026-11-04))_

## Medium (1-2 h each)

- [ ] Minimum wall thickness, CNC reach and measured-versus-CAD checks. _(3.1 Design Studio)_
- [ ] Wall thickness, chamber holes, full section chord, halo comparison. _(3.6 FORGE (India rules, in app))_
- [ ] Practical quality: coverage targets are not set. Property tests are partial. OpenAPI-generated types are not in place. _(3.8 Records, quality and operations)_
- [ ] 6. Performance: lazy 3D, one WebGL context per page, dispose resources, demand-driven frames, bundle check. _(5. UI redo plan (from UI-REDO.md))_
- [ ] **Points-aware ORACLE (headline).** Objective = E[racing points] − E[spec penalty], gated by P(legal under manufacturing spread) ≥ 1 − α. Show three picks: fastest, most reliable, recommended. Builds on the P90 robust pick, FORGE pass probability and the race Monte Carlo. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Counterfactual decision record.** Save one comparison of what lowest-Cd would choose against what the points-aware engine chooses, with signed deltas (CdA, mass, margins, time, points) and the reason. This is the smallest useful decision log. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **One status badge everywhere:** legal + accepted CFD + calibrated race model, as a filter across Design, ORACLE, Race and FORGE. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Rule-versioned points engine.** Race-mode switch (automatic vs manual reaction). Every scoring rule stored as data with its clause number, with the C9.1/C9.4 and C9.6/C9.7.2 contradictions flagged. Property-test ties and the 3rd/4th-place cliff. Show the ms→points exchange rate next to ms/g. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Class-aware FORGE:** General / Safety / Performance class, rectifiable-at-half-penalty flag, per-car or per-wheel multiplicity, gauge guard band so margin means margin after tool error. Performance failure = ineligible for Fastest Car and Best Engineered Car. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] **Car A/B nomination and reaction advisor:** paired-timing posterior, ex-Gaussian reaction fit (scipy `exponnorm`), earlier reaction vs false-start (−2.5 pts) trade-off. _(5b. Innovation backlog (researched 2026-11-04))_
- [ ] Race replay: 8 mini sectors with live sector colours and sector deltas. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Compatible replay overlays: only compare runs with matching track and model. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] CAD rule-state overlays with real value and limit anchors on the parts. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Geometry deviation frame and alignment checks. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Surface-quality analysis: curvature comb and continuity. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Guided run wizard: step-by-step setup before launch (the monitor and ETA already exist). _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Source-validated warm starts and mesh reuse to cut run time. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Pareto front with mass and rule margin as objectives. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Prospective candidate snapshots saved before evaluation, scored against accepted results. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Paired sample-size solver and complete uncertainty decomposition. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Read-only API mode that blocks every write and job start. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Password protection for any live public link. _(5c. Added from the full doc sweep (2026-11-05))_
- [x] Aligned-grid Δwake and matched-group Δforces between two runs. _(3.2 Wind Tunnel and CFD)_
- [x] Session timing ledger with best, last, same-lane interval and reaction history. Persists in the browser and exports CSV or JSON. _(3.3 Race, replay and timing)_
- [x] Race-level SALib indices and a declared CFD, reaction and timing variance budget. _(3.3 Race, replay and timing)_
- [x] Fastest eligible measured distance trace selected from uploads and compared by distance in Race analysis. _(3.3 Race, replay and timing)_
- [x] M2 tether resistance in deterministic and Monte Carlo dynamics, telemetry and the energy balance. _(3.3 Race, replay and timing)_
- [x] Explicit Race Day session and lane handoff into a new calibration fit with a stored timing source file. _(3.3 Race, replay and timing)_
- [x] Campaign acquisition history and engineer proceed, edit or veto records. _(3.4 ORACLE and closed loop)_
- [x] Same-setup repeat CdA sample SD shown separately from the GP nugget. _(3.4 ORACLE and closed loop)_
- [x] Across-study held-out scoring, interval coverage and posterior predictive ranks. _(3.5 Calibration and physical tests)_
- [x] Apply saved posterior medians and thrust settings to Race with a source-linked application record. Joint posterior draws remain a separate modelling extension. _(3.5 Calibration and physical tests)_
- [x] Feasible frontier across imported CAD samples. _(3.6 FORGE (India rules, in app))_
- [x] Inspection log with physical builds, part identity, rule revision, instrument, operator, raw values and operator verdict. _(3.6 FORGE (India rules, in app))_
- [x] Interactive per-rule dimensional what-if and signed headroom. _(3.6 FORGE (India rules, in app))_
- [x] Source-linked engineering decision log with existing candidate and support record IDs. _(3.8 Records, quality and operations)_
- [x] **A/B design comparison:** matched accepted CFD and CAD hashes, shared TITAN assumptions, common rule margins and paired finish-time uncertainty. _(5b. Innovation backlog (researched 2026-11-04))_
- [x] **Race-objective optimiser benchmark:** equal-budget GP/EI versus random search, with regret against the finite TITAN grid. _(5b. Innovation backlog (researched 2026-11-04))_
- [x] **Value-of-information test planner:** choose tests that reduce local timing-driven points uncertainty using a declared scoring slope. _(5b. Innovation backlog (researched 2026-11-04))_
- [x] **Frozen demo mode:** browser-cached summaries of designs, accepted CFD and saved calibration. No solver or WebGL is used in the demo view. _(5b. Innovation backlog (researched 2026-11-04))_
- [x] Chart gaps (task 10): Section 4 software is implemented. Native full-car yaw setup and physical/CFD acceptance remain separate gates. _(9. Done in this plan's last pass (2026-11-04))_

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
- [ ] Race replay finish: full broadcast view with the real car mesh loaded by default, no "needs display mesh" state. _(5c. Added from the full doc sweep (2026-11-05))_

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
- [ ] Real-Mac frame rate, memory and first-display time. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Scheduled real benchmark and accepted adjoint campaign. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Independent held-out validation on measured runs. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] CalculiX 3D halo and wing-mount work, once real materials exist. _(5c. Added from the full doc sweep (2026-11-05))_
- [ ] Accepted CFD: a three-mesh GCI study, a speed sweep, and a baseline run that passes the gates. Needs an explicit go-ahead to run solvers. _(7. Real-data needs)_
- [ ] Mass and dimensions: part masses and caliper measurements for the car. _(7. Real-data needs)_
- [ ] Material properties: measured yield and modulus for the strength parts. _(7. Real-data needs)_
- [ ] Load tests: measured deflection and failure load to compare with the beam FEM. _(7. Real-data needs)_
- [ ] Rule text: the official India rule pages, to reconcile the 79 YAML rule entries. _(7. Real-data needs)_
- [ ] Race-day timing: a live or recorded event ledger for calibration and the stadium view. _(7. Real-data needs)_
