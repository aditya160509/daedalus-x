# PLAN — Daedalus X end-to-end (updated 2026-11-04)

Physical-test items are out of scope and removed. Source of truth for what is left; `PROGRESS.md` records what is done.

This is the single source of truth. It merges MASTER-PLAN, TODO, PROGRESS, UI-REDO and NOW.
Those five files stay in place as history. When they disagree with this file, this file wins.

Legend: [x] ✅ built and connected · [ ] 🟨 partly built · [ ] ⬜ not built · [ ] ⏳ needs real data, a browser or a physical test · [ ] 📝 uncommitted draft.

Source tags on every number: measured, simulated, estimated, synthetic. Race and CFD outputs are simulated. Generated scenarios are synthetic.

---

## 1. Goal and scope

**Goal.** A race-engineering platform for one school team. It designs the car, checks the rules, predicts race time, and runs the solver studies behind the wind-tunnel view. Every number says where it came from.

**In scope**
- Design Studio: CAD import, named parts, rule overlays, ORACLE study generation.
- Wind Tunnel: OpenFOAM results, moving air, Cp, wake, forces, mesh and convergence gates.
- Race: replay, telemetry, Monte Carlo spread, breakdown, energy, points, calibration, timing.
- ORACLE: surrogate, expected improvement, sensitivity, equal-budget benchmark.
- Calibration and physical-test planning, paired timing statistics.
- FORGE: India rule checks in the app, risk ranking, probability, margins.
- Strength: beam checks, configured-part comparison.
- Saved records: sources, designs, runs, experiments, lineage, hashes.
- Compute table: wall time and cells per CFD run.

**Out of scope (owner cut list, 2026-11-04)**
- Judge Q&A, judging copy, one-pagers, walkthrough scripts, rehearsals.
- Presenter decks, slides, speaker notes, timers, recorded videos.
- Report PDFs, scrutineering sheets, compact summary PDFs.
- Judge ZIP packs, portfolios, evidence appendices, document pipelines.
- Official-rule PDF archive and publication. Reading the rules and sourcing rule values stays in scope.
- Public verification sites, QR publishing, public hosting.
- OpenTimestamps, RFC 3161 and external timestamp authorities.
- Signed release tags and offline demo bundles.
- Written red-team and post-event reports, separate V&V dossier generation.
- Sponsor reports, tool-cost comparisons, minutes, receipts, budgets, lessons logs.
- Gantt, administrative risk matrix, judging-weight and awarded-point tracking.
- Formal preregistration paperwork.
- Coverage-percentage targets, screenshot bureaucracy, tests that only mirror labels.
- Earlier cuts: drawing/render packs, DXF/SVG importer, AR, base-bleed, competitor scraping, photo/video scrutineering, photogrammetry, community calibration, multi-fidelity ORACLE, BoTorch/OpenMDAO/trame, OS matrix, Docker, mutation testing, 8-hour soak, multi-user, archive publication.

**Rules for work**
- Work on main. Pull with rebase before starting and before each push. Push after each commit.
- Never discard or commit another contributor's uncommitted changes. Stage only your own hunks.
- No CFD, meshing or long benchmark runs without a separate go-ahead.
- Keep saved records, IDs and hashes. They stop wrong-design and stale-result use.
- Label synthetic and estimated data honestly. Do not use a user-typed label as accepted training data.

---

## 2. Architecture summary

- **API:** FastAPI in `src/daedalus`. Routers live in `src/daedalus/api/*.py` and are registered in `api/__init__.py`. Routes sit under `/v1`.
- **Solvers and models:** OpenFOAM (simpleFoam, k-ω SST) for CFD. build123d and OCCT for CAD geometry. A race model (M1, M2) with thrust curves. A beam FEM for strength. SciPy, SALib and Optuna for analysis and optimisation.
- **Jobs:** a durable queue with logs, cancel and status. CFD runs write logs into `data/runs/<run>/`.
- **Evidence:** SQLite records, content-addressed files, lineage and hash checks.
- **Web app:** Next.js 16 in `apps/cockpit`. React 19, TanStack Query, ECharts for statistics, uPlot for telemetry, Dockview for layout, Base UI and shadcn-style primitives, Three/R3F/drei for 3D, vtk.js for field viewing, Chili3D in an iframe for CAD.
- **Client calls:** `apps/cockpit/src/lib/api.ts` is the shared client. New endpoints get their own module (`lib/api-extra.ts`) until they are merged.
- **Charts:** one theme in `components/charts/useECharts.ts` (token colours, hairline dashed grid, mono ticks, tooltip). Every chart uses it.

---

## 3. Feature status by area

### 3.1 Design Studio
- [x] ✅ Chili3D CAD, STEP/GLB/CFD import, named parts, save and import pipeline.
- [x] ✅ Failed or at-risk rules select and frame named CAD parts.
- [x] ✅ Inspection viewer: dimensions, sections, comparison.
- [x] ✅ ORACLE study builds four parameters through build123d and the canonical importer.
- [x] ✅ CAD rule overlay colours matched parts by pass, at-risk and fail.
- [x] ✅ Two-design comparison shows a signed CAD deviation in mm.
- [x] ✅ Inspect and editor controls consolidated into one side panel.
- [x] ✅ Outputs tab: six KPI tiles, rules-to-fix table, volume by part (`b261ced`, another contributor).
- [ ] ⬜ Live parametric controls with validated regeneration. `hard`
- [x] ✅ Material-aware mass and centre-of-gravity estimate from geometry. `easy`
- [ ] ⬜ Minimum wall thickness, CNC reach and measured-versus-CAD checks. `mid`
- [ ] ⏳ Keyboard, responsive and manufactured-part acceptance. `data`

### 3.2 Wind Tunnel and CFD
- [x] ✅ Cp, streamlines, slices, wake planes, Q isosurfaces, source legends.
- [x] ✅ Strict same-mesh ΔCp with compatibility rejection.
- [x] ✅ Component pressure and friction drag bars, signed waterfall, drag build-up.
- [x] ✅ Cd and residual histories, acceptance window, rejection reasons.
- [x] ✅ Grid study, speed plots, Richardson and GCI values from real study results.
- [x] ✅ Job queue with logs and cancel. Recorded Cd stopping controls.
- [x] ✅ Compact velocity export with validity mask.
- [x] ✅ Default run is the lowest-Cd accepted run.
- [x] ✅ When no run is accepted, the latest solved run loads as a preview with an amber "not accepted" badge and greyed numbers (`ae73c0e`).
- [x] ✅ Compute table: cells, iterations, solver wall time, CPU time and status per run (`9672ffb`, Compute page).
- [x] ✅ Animated GPU air coloured by speed, moving floor, camera presets (`6142cd0`).
- [ ] 🟨 One renderer and one scene for the advanced field layers. `hard`
- [ ] ⬜ Surface LIC and separation lines. `hard`
- [x] ✅ Cp probe lines. `easy`
- [x] ✅ Wall y+ map, projected bad-cell map and skewness histogram from OpenFOAM fields. Generate missing quality fields with checkMesh from the existing mesh. `easy`
- [x] ✅ Momentum-deficit wake drag cross-check, wake loss map, drag by part (`1d4a1f3`).
- [x] ✅ Aligned-grid Δwake and matched-group Δforces between two runs. `mid`
- [x] ✅ Run monitor: residual chart per field and ETA in the Jobs drawer (`4853264`).
- [x] ✅ Frontal-area versus Cd trade chart with iso-drag curves (`ff6bf40`).
- [ ] ⬜ Yaw and ride-height sweeps. `data`
- [ ] ⏳ Accepted current-car baseline, three-mesh GCI, physical correlation. `data`

### 3.3 Race, replay and timing
- [x] ✅ CAD-derived car model, 20 m track, tether, start and finish, broadcast cameras.
- [x] ✅ Four main tabs and a reaction trainer with history, statistics and JSON export.
- [x] ✅ Linked uPlot telemetry with time cursor and trajectory band.
- [x] ✅ Monte Carlo histogram with p5, p50 and p95. Tornado. Exchange-rate metrics (ms/g, ms/cm², Crr).
- [x] ✅ Energy Sankey with signed integration residual. Tether is not modelled.
- [x] ✅ Racing points scenarios, head-to-head, round probabilities. Synthetic and estimated labels kept.
- [x] ✅ Monte Carlo convergence: p5, p50 and p95 against sample count, one seed (`7de8fa2`).
- [x] ✅ Optimal legal mass curve from 50.0 g upward with the rule line dashed (`7de8fa2`).
- [x] ✅ Speed trap: peak and finish speed from the trace, m/s and km/h (`7de8fa2`).
- [x] ✅ Timing export: CSV and JSON of the trace and speed trap (`7de8fa2`).
- [x] ✅ Event annotations: launch, burnout, peak and finish markers (`aafbe8f`).
- [x] ✅ Session timing ledger with best, last, same-lane interval and reaction history. Persists in the browser and exports CSV or JSON. `mid`
- [x] ✅ Points distribution. `easy`
- [x] ✅ Stacked time-budget chart with measured reaction. `easy`
- [x] ✅ Race-level SALib indices and a declared CFD, reaction and timing variance budget. `mid`
- [x] ✅ Fastest eligible measured distance trace selected from uploads and compared by distance in Race analysis. `mid`
- [x] ✅ History strip vs prediction band on Race day (`77d738d`).
- [x] ✅ Stadium view: fullscreen race-day big numbers (`/race/day`, `750b64f`). Panel rotation still open.
- [x] ✅ M2 tether resistance in deterministic and Monte Carlo dynamics, telemetry and the energy balance. `mid`
- [x] ✅ Race-day time and reaction entry with prediction comparison and CSV/JSON export (`750b64f`).
- [x] ✅ Explicit Race Day session and lane handoff into a new calibration fit with a stored timing source file. `mid`

### 3.4 ORACLE and closed loop
- [x] ✅ Robust pick: P50/P90 race time per Pareto design under drag and race-day uncertainty (`9744fab`).
- [x] ✅ Gaussian process with expected improvement, next-point recommendation, mean and SD map.
- [x] ✅ Study-family feasibility filter.
- [x] ✅ SALib sensitivity on the fitted GP. Length scales, noise, optimiser status.
- [x] ✅ Equal-budget benchmark: Optuna TPE, CMA-ES, Sobol, LHS, random. Ten to twenty seeds with regret bands. Synthetic labels.
- [x] ✅ Observation validation with serialised, atomic appends.
- [x] ✅ Campaign acquisition history and engineer proceed, edit or veto records. `mid`
- [ ] 🟨 Adjoint tooling exists. Accepted adjoint sensitivity map and constrained updates do not. `data`
- [ ] ⬜ Accepted-only CFD feedback. STEP-to-mesh hash guard. Performance-rule gate. `hard`
- [ ] ⬜ Separate training pools: synthetic demo, unreviewed input, accepted CFD, physical data. `hard`
- [x] ✅ Pareto front with pymoo NSGA-II: predicted CdA vs uncertainty (`40d8dc2`). Mass and rule-margin objectives wait for a mass model.
- [x] ✅ Same-setup repeat CdA sample SD shown separately from the GP nugget. `mid`

### 3.5 Calibration and physical tests
- [x] ✅ Unit-aware timing and thrust input with outlier flags. No rows are dropped silently.
- [x] ✅ Bounded importance-sampling calibration. Posterior intervals. ESS and warnings. Held-out predictions.
- [x] ✅ Saved calibration inputs, results and hashes. Study browser.
- [x] ✅ D-optimal timing and coast-down planner.
- [x] ✅ Lab-day, track-day and custom protocols with advanced settings.
- [x] ✅ Paired timing: mean CI (SciPy t), prospective power and minimum detectable effect.
- [x] ✅ Minimum-N solver for paired timing, with N and N-1 power.
- [x] ✅ Across-study held-out scoring, interval coverage and posterior predictive ranks. `mid`
- [x] ✅ Apply saved posterior medians and thrust settings to Race with a source-linked application record. Joint posterior draws remain a separate modelling extension. `mid`
- [x] ✅ Prior versus posterior density plots. `easy`
- [x] ✅ Across-run error scoreboard over new measurements. `easy`
- [ ] ⬜ Repeat-run control chart and gauge R&R. `data`
- [x] ✅ Entry for part masses, caliper dimensions, coast-down, tether and load-test data. `easy`

### 3.6 FORGE (India rules, in app)
- [x] ✅ India NF rulebook loaded with page, value, limits, state, margin, points at risk.
- [x] ✅ Wheel, axle, layout, rolling band, wing section, notch and rear-wing measures.
- [x] ✅ CAD remeasurement by hash, rule-to-part focus.
- [x] ✅ Nearest-limit list and chart with unit filter.
- [x] ✅ Manufacturing-spread pass probability per rule.
- [x] ✅ Margin bars with ±1σ bands and percent-of-span margins, ordered by points at risk.
- [ ] 🟨 Rule coverage reconciled with the regulation text. The YAML has 79 entries; the recount is pending. `data`
- [x] ✅ Feasible frontier across imported CAD samples. `mid`
- [ ] ⬜ Wall thickness, chamber holes, full section chord, halo comparison. `mid`
- [x] ✅ Inspection log with physical builds, part identity, rule revision, instrument, operator, raw values and operator verdict. `mid`
- [x] ✅ Interactive per-rule dimensional what-if and signed headroom. `mid`

### 3.7 Structure (strength)
- [x] ✅ Beam FEM API and Strength panel with part and load presets. Analytic beam checks.
- [x] ✅ Solver deflection and bending-stress plots with yield band and PNG export.
- [x] ✅ Configured-part comparison table for up to four captured cases.
- [x] ✅ Safety-factor table across all four strength parts in one view. `easy`
- [ ] ⬜ Predicted versus measured load-test chart. `data`

### 3.8 Records, quality and operations
- [x] ✅ Saved source, design, run, experiment and model records with content-addressed files and lineage.
- [x] ✅ Streaming hash checks.
- [x] ✅ Shared ECharts, uPlot, TanStack Table and Base UI integration.
- [x] ✅ Compute and wall-time table per CFD run, read from logs.
- [x] ✅ CI workflow exists in the repo as `ci/github-actions-ci.yml`. Moving it to `.github/workflows` is blocked: the token lacks the `workflow` scope.
- [x] ✅ Tests for source binding, lineage and numerical helpers. Regression tests for the new endpoints.
- [x] ✅ Shared provenance badges applied to Wind Tunnel analyses and mesh, nominal Design results, Race timing and Compute. Mixed timing views distinguish prediction from entered measurements. `easy`
- [x] ✅ PNG export by default on ECharts; shared iteration cursor for Cd and residuals; labeled keyboard-scrollable tables and native row actions. `easy`
- [x] ✅ Source-linked engineering decision log with existing candidate and support record IDs. `mid`
- [x] ✅ AI Assistance and Verification Log (rule C2.18.3) exported from git history as CSV in the Evidence drawer.
- [ ] 🟨 Practical quality: coverage targets are not set. Property tests are partial. OpenAPI-generated types are not in place. `mid`
- [ ] ⏳ Grouped browser, keyboard, download and responsive review at 1440, 1024 and 375 px. `data`

### 3.9 Repo state
- [x] ✅ All work committed and pushed; CI workflow lives in `.github/workflows/ci.yml`. Old planning docs (NOW, HANDOFF, TASK-BOARD, BUILD-ORDERS, CUT-AND-ADD, RATINGS, UI-MASTER-PLAN, task files, agent notes) removed 2026-11-04.

## 4. Analyses and charts (one status per chart)

Each chart needs: shared theme, units on axes, a source tag, hairline grid, dashed limit lines, uncertainty bands where the data has them, PNG export, and a one-line caption.

| ID | Chart | Status | Remaining |
|---|---|---|---|
| W01 | Cd and CdA with grid uncertainty | ✅ | Cd and CdA share manifest reference area. Fine-grid GCI appears for accepted matching refinements. An accepted campaign is still needed. |
| W02 | Residual and force convergence with gate | ✅ | Drag and residual cursors are linked. Final steady-window spread is compared with the 1% solver gate. |
| W03 | Component drag waterfall, pressure and friction | ✅ | Accepted-CFD browser review. |
| W04 | Centreline Cp and surface Cp | ✅ | Centreline Cp preset at a chosen height and the existing surface Cp layer. |
| W05 | ΔCp, Δwake, Δforces | ✅ | Surface ΔCp, aligned-grid Δwake and matched per-part force deltas. |
| W06 | Wake planes and momentum drag | ✅ | Wake deficit and loss maps plus momentum-deficit drag cross-check. |
| W07 | Q cores coloured by vorticity | ✅ | Q isosurfaces coloured by dimensionless vorticity magnitude. |
| W08 | LIC and separation lines | ✅ | vtk.js wall-shear LIC and heuristic low-shear reversal lines. Browser GPU verification pending. |
| W09 | Speed, yaw and ride-height study | ✅ | Speed study plus yaw and ride-height plots for imported full-car CFD or measured sweeps. Native full-car yaw setup and real sweep data remain separate gates. |
| W10 | Frontal area versus Cd | ✅ | Frontal area vs Cd with iso-CdA curves. |
| W11 | Mesh and y+ maps, skewness histogram | ✅ | Existing OpenFOAM solution and checkMesh field summaries. |
| R01 | Linked telemetry traces and events | ✅ | Linked telemetry with launch, burnout, peak, finish and stop event annotations. |
| R02 | Ghost Δtime against the best run | ✅ | Race Breakdown ranks uploaded measured distance traces and plots model-minus-fastest measured delta. |
| R03 | Time-budget stacked bar | ✅ | Stacked predicted car time and entered measured gate reaction. |
| R04 | Tornado and SALib race indices | ✅ | Local tornado plus bounded SALib S₁/Sₜ and sampling intervals. |
| R05 | Exchange rates | ✅ | Browser review. |
| R06 | Monte Carlo histogram and convergence | ✅ | Convergence plot added (`7de8fa2`). |
| R07 | Energy Sankey | ✅ | Tether term, browser review. |
| R08 | Points distribution, round and head-to-head | ✅ | Full scenario distribution and round-by-round opponent win probabilities. |
| R09 | Optimal legal mass curve | ✅ | Built (`7de8fa2`). |
| R10 | Speed trap and timing export | ✅ | Built (`7de8fa2`). |
| O01 | GP mean and expected-improvement map | ✅ | Browser review. |
| O02 | Equal-budget regret benchmark with CIs | ✅ | Full numerical study. |
| O03 | Predicted versus actual candidates | ✅ | Build-time GP forecast compared with accepted CFD on identical stored surface hashes. Needs an accepted prospective run for real evidence. |
| O04 | Predictive interval calibration | ✅ | Real-data check. |
| O05 | Length scales and Sobol importance | ✅ | Accepted-data review. |
| O06 | Pareto front | ✅ | pymoo NSGA-II front over surrogate drag and model uncertainty, filtered by study-family feasibility. |
| O07 | Acquisition history | ✅ | Recorded proceed, edit and veto decisions, rationale and GP expected-improvement trend. |
| S01 | Prior and posterior plots | ✅ | Analytic priors and posterior draw densities. |
| S02 | Error shrinking scoreboard | ✅ | Held-out error scoreboard and signed residual trend in upload order. |
| S03 | Posterior predictive checks | ✅ | Held-out predicted intervals and empirical predictive-rank CDF. |
| S04 | Paired CI and minimum detectable effect | ✅ | Real paired data. |
| S05 | Repeat-run control chart | ✅ | Individuals chart for ordered, same-mass timing uploads. Physical repeat tests remain a data gate. |
| S06 | Uncertainty variance budget | ✅ | Independent first-order variance budget for CdA, reaction and timing uncertainty. |
| F01 | Margin bars with tolerance bands | ✅ | Manufacturing band and points ordering. |
| F02 | Per-rule pass probability | ✅ | Manufacturing-risk simulation is implemented. Browser review remains an acceptance check. |
| F03 | Legal frontier | ✅ | Sampled CAD frontier across imported designs on shared dimensional checks. Manual and physical inspection still apply. |
| F04 | Red, amber, green summary | ✅ | FORGE pass, risk, failure and manual-review summaries. |
| T01 | Deflection and stress plots | ✅ | Physical material review. |
| T02 | Safety-factor table, all four parts | ✅ | All four preset safety factors in a single table. |
| T03 | Predicted versus measured load | ✅ | Same-load predicted vs entered measured deflection chart. Physical measurements remain a data gate. |
| P01 | Planned versus actual timeline | ✂ | Cut from scope. |
| P02 | Risk matrix | ✂ | Cut. |
| P03 | Effort and CFD hours | ✅ | Compute table built. Effort chart is cut. |

Chart references consulted through TinyFish

- Fine-grid GCI and Richardson extrapolation. [NASA spatial convergence guidance](https://www.grc.nasa.gov/www/wind/valid/tutorial/spatconv.html)
- Shared visual mapping for signed differences. [Apache ECharts visual mapping](https://apache.github.io/echarts-handbook/en/concepts/visual-map/)
- First-order and total-order sensitivity. [SALib documentation](https://salib.readthedocs.io/en/latest/user_guide/basics.html)
- Individuals control limits based on successive moving ranges. [NIST handbook](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm)
- Surface LIC using the vtk.js mapper. [Kitware Surface LIC](https://www.kitware.com/visualize-surface-vector-fields-with-vtk-js/)

---

## 5. UI redo plan (from UI-REDO.md)

**Bar:** Linear, Vercel dashboard, T3 Code. Quiet, dense, precise. No glow, gradient cards, emoji or decorative icons.

- [x] ✅ 0. "1 Issue" runtime error fixed (Timer import, LegalPanel hydration).
- [x] ✅ 1. Moving air: GPU particles coloured by speed, preview fallback.
- [x] ✅ 2. Outputs tab (`b261ced`) and Wind Tunnel Analysis tab (`b22461b`). Strength card still open.
- [ ] ⬜ 3. Inspect redo: smooth shading, rule colours on parts, dimension lines, View, Measure, Section, Compare tabs, model table with units. `hard`
- [ ] ⬜ 4. Strength redo: part sketch with the load arrow, one compact input row, one deflection chart and one stress chart with the limit band, one summary row, all-part table. `hard`
- [x] ✅ 5. Visual system: T3 Code / affectUI tokens (#111113 cards, 8% hairline borders, desaturated accent, flat status colours), 32 px compact buttons, white primary, underline tabs, 8 px radius, no glows.
- [ ] ⬜ 6. Performance: lazy 3D, one WebGL context per page, dispose resources, demand-driven frames, bundle check. `mid`
- [ ] 🟨 7. Tokens apply app-wide. Pit Wall Flow prefers the selected solved run; browser-check the flow render and Race replay with an imported display GLB. `easy`
- [ ] ⏳ 8. Screenshot at 1440, compare with Linear and Vercel, fix anything louder than them. `data`

**Visual tokens (target):** background `#0B0B0C`; surfaces `#111113` and `#161618`; borders `rgba(255,255,255,0.08)`; text `#EDEDEF`, `#A0A0A8`, `#6B6B73`; one accent for selected tab, focus and the primary series; status as 6 px flat dots or text, no glow.
**Type:** Inter 13 px UI, 12 px labels, 20 px page titles, 24–28 px KPI values, mono tabular numbers.
**Spacing:** 4 px grid. Cards 16 px padding, radius 8, 1 px border, no shadow.

---

## 5b. Innovation backlog (researched 2026-11-04)
- [ ] ⬜ Live wind tunnel: GPU lattice-Boltzmann preview while editing. FluidX3D (non-commercial licence: run as a separate optional program, never vendored) or MarcosAsh/Lattice_Fluid_Dynamics (MIT). `hard`
- [ ] ⬜ Neural field surrogate: fine-tune NVIDIA Transolver (DrivAerML, PhysicsNeMo, Apache-2.0) on our runs for instant pressure/wake fields; label "predicted". `hard`

Taken from the TODO.md review (2026-11-04). Headline claim: "we optimise expected competition points under rule and manufacturing uncertainty, not lap time."
- [ ] ⬜ **Points-aware ORACLE (headline).** Objective = E[racing points] − E[spec penalty], gated by P(legal under manufacturing spread) ≥ 1 − α. Show three picks: fastest, most reliable, recommended. Builds on the P90 robust pick, FORGE pass probability and the race Monte Carlo. `mid`
- [ ] ⬜ **Counterfactual decision record.** Save one comparison of what lowest-Cd would choose against what the points-aware engine chooses, with signed deltas (CdA, mass, margins, time, points) and the reason. This is the smallest useful decision log. `mid`
- [x] ✅ **A/B design comparison:** matched accepted CFD and CAD hashes, shared TITAN assumptions, common rule margins and paired finish-time uncertainty. `mid`
- [x] ✅ **Why this recommendation.** ORACLE shows its reasons in one line: length-scale importance, EI, uncertainty and nearest rule risk. `easy`
- [ ] ⬜ **One status badge everywhere:** legal + accepted CFD + calibrated race model, as a filter across Design, ORACLE, Race and FORGE. `mid`
- [ ] ⬜ **Rule-versioned points engine.** Race-mode switch (automatic vs manual reaction). Every scoring rule stored as data with its clause number, with the C9.1/C9.4 and C9.6/C9.7.2 contradictions flagged. Property-test ties and the 3rd/4th-place cliff. Show the ms→points exchange rate next to ms/g. `mid`
- [ ] ⬜ **Class-aware FORGE:** General / Safety / Performance class, rectifiable-at-half-penalty flag, per-car or per-wheel multiplicity, gauge guard band so margin means margin after tool error. Performance failure = ineligible for Fastest Car and Best Engineered Car. `mid`
- [x] ✅ **Regulation proof-load presets in Strength:** 100 g wheel, 1 kg halo, 200 g tether guide; plus launch and stopping dynamic loads. `easy`
- [ ] ⬜ **Design-for-manufacture panel:** draft and undercut detection, minimum internal radius vs cutter, 3-axis reach, minimum feature size, model-block containment (trimesh / manifold3d). Extends the open wall-thickness and CNC-reach items. `hard`
- [ ] ⬜ **Turbulence model-form uncertainty:** SST vs transition (kOmegaSSTLM) vs laminar spread as a Cd error bar (wings at Re 3e4–1e5). Needs runs. `data`
- [x] ✅ **Race-objective optimiser benchmark:** equal-budget GP/EI versus random search, with regret against the finite TITAN grid. `mid`
- [x] ✅ **Value-of-information test planner:** choose tests that reduce local timing-driven points uncertainty using a declared scoring slope. `mid`
- [x] ✅ **Race physics terms:** M2 Monte Carlo has a half-normal tether prior, uniform cartridge mass spread (±0.5 g by default in Race), and optional gas mass loss proportional to cumulative thrust impulse. The gas profile is an estimate and defaults to zero until supplied. `easy`
- [ ] ⬜ **Car A/B nomination and reaction advisor:** paired-timing posterior, ex-Gaussian reaction fit (scipy `exponnorm`), earlier reaction vs false-start (−2.5 pts) trade-off. `mid`
- [x] ✅ **Frozen demo mode:** browser-cached summaries of designs, accepted CFD and saved calibration. No solver or WebGL is used in the demo view. `mid`

Not taken from TODO.md: PDF/submission validator, CadQuery, DAFoam, SU2, preCICE, SMT. Also not taken: MAPIE and PyMC/NumPyro until real held-out data exists, sustainability accounting, and portfolio/talk writing.

## 5c. Added from the full doc sweep (2026-11-05)

**Race and replay**
- [ ] ⬜ Race replay: 8 mini sectors with live sector colours and sector deltas. `mid`
- [ ] ⬜ Race replay finish: full broadcast view with the real car mesh loaded by default, no "needs display mesh" state. `hard`
- [ ] ⬜ Compatible replay overlays: only compare runs with matching track and model. `mid`
- [ ] ⬜ Stadium panel rotation between big numbers, table and history. `easy`
- [ ] ⬜ Event leaderboard in stadium view. `easy`

**Design and CAD**
- [ ] ⬜ CAD rule-state overlays with real value and limit anchors on the parts. `mid`
- [ ] ⬜ Geometry deviation frame and alignment checks. `mid`
- [ ] ⬜ Surface-quality analysis: curvature comb and continuity. `mid`

**Wind Tunnel**
- [ ] ⬜ Guided run wizard: step-by-step setup before launch (the monitor and ETA already exist). `mid`
- [ ] ⬜ Source-validated warm starts and mesh reuse to cut run time. `mid`
- [ ] ⏳ Real-Mac frame rate, memory and first-display time. `data`

**ORACLE and calibration**
- [ ] ⬜ Pareto front with mass and rule margin as objectives. `mid`
- [ ] ⬜ Prospective candidate snapshots saved before evaluation, scored against accepted results. `mid`
- [ ] ⬜ Paired sample-size solver and complete uncertainty decomposition. `mid`
- [ ] ⏳ Scheduled real benchmark and accepted adjoint campaign. `data`
- [ ] ⏳ Independent held-out validation on measured runs. `data`
- [ ] ⏳ CalculiX 3D halo and wing-mount work, once real materials exist. `data`

**Deployment ($0)**
- [ ] ⬜ Put the frozen demo on Vercel Hobby from `apps/cockpit`, deploying on push to `main`. `easy`
- [ ] ⬜ Read-only API mode that blocks every write and job start. `mid`
- [ ] ⬜ Production start script (`next build`, `next start`) plus Cloudflare Quick Tunnel for live sessions. `easy`
- [ ] ⬜ Password protection for any live public link. `mid`

## 6. Open-source map

Verify a licence before copying code. Keep the notice. No licence means no copying.

| Need | Project | Licence | Status |
|---|---|---|---|
| CFD solver | OpenFOAM | GPL | ✅ used (runs only on approved go-ahead) |
| CAD kernel | build123d / OCCT | Apache-2.0 | ✅ used |
| CAD editor | Chili3D | check | ✅ used via iframe bridge (vendored patch) |
| Telemetry charts | uPlot | MIT | ✅ used |
| Statistics charts | Apache ECharts | Apache-2.0 | ✅ used |
| Layout | dockview | MIT | ✅ used |
| Lineage graph | xyflow / React Flow | MIT | ✅ used |
| Tables | TanStack Table v9 | MIT | ✅ used |
| UI primitives | Base UI | MIT | ✅ used |
| Palette | cmdk | MIT | ✅ used |
| QR | qrcode.react | ISC/MIT | ✅ used (QR is cut from scope) |
| 3D | Three.js, R3F, drei | MIT | ✅ used |
| Field viewer | vtk.js | BSD-3 | ✅ used |
| Sensitivity | SALib | MIT | ✅ used |
| Scipy stats | SciPy | BSD-3 | ✅ used |
| Benchmark | Optuna | MIT | ✅ used |
| Design-space sampling | scipy.stats.qmc | BSD-3 | ✅ used |
| Pareto front | pymoo | Apache-2.0 | ✅ used: NSGA-II drag vs confidence (`40d8dc2`) |
| Posterior diagnostics | ArviZ | Apache-2.0 | ⬜ only where MCMC exists (current sampler is importance sampling) |
| Run wizard and monitor | FoamPilot | MIT | ✅ pattern used: residual monitor + ETA in Jobs (`4853264`) |
| Particle advection | mapbox/webgl-wind | ISC | ✅ technique used in `FlowTunnel3D` |
| WebGPU particles | dgreenheck/threejs-particle-fluids | MIT | ⏭ not needed: WebGL particles hold frame rate |
| Race timing tower, stadium | adn8naiagent/F1ReplayTiming | MIT | ✅ pattern used: timing tower, stadium view, history strip |
| Telemetry layouts | matteocelani/f1-telemetry | MIT | ✅ pattern used: Race Timing/Analysis panels |
| Design tokens and mono font | Vercel Geist | OFL (font) | ✅ used: Geist Sans/Mono (`0abe55f`) |
| UI primitives | t3code web UI | MIT | ✅ ported: 28 primitives + dark palette (`0abe55f`) |
| KPI cards | Tremor | Apache-2.0 | ✅ pattern: one shared `Metric` tile (`77d738d`) |
| Number inputs | Origin UI | MIT | ✅ covered by t3code `number-field` |
| Race track reference | Synopsys/NVIDIA digital twin | commercial | reference only |
| Reference race sim | TUMFTM race-simulation | check | reference only |
| CalculiX 3D | CalculiX | GPL | ⏳ only with real material data |

---

## 7. Real-data needs

These items cannot be finished in software alone.
- [ ] ⏳ Accepted CFD: a three-mesh GCI study, a speed sweep, and a baseline run that passes the gates. Needs an explicit go-ahead to run solvers. `data`
- [ ] ⏳ Mass and dimensions: part masses and caliper measurements for the car. `data`
- [ ] ⏳ Material properties: measured yield and modulus for the strength parts. `data`
- [ ] ⏳ Load tests: measured deflection and failure load to compare with the beam FEM. `data`
- [ ] ⏳ Rule text: the official India rule pages, to reconcile the 79 YAML rule entries. `data`
- [ ] ⏳ Race-day timing: a live or recorded event ledger for calibration and the stadium view. `data`

---

## 8. Ordered next steps

1. [ ] Push pending local commits when the owner refreshes the token. Include the CI move.
2. [ ] Commit the other contributor's `raceTracks.ts` annotation work once they finish it. Then `d42e65f` passes on HEAD.
3. [ ] Task 10 gaps: the safety-factor table for all four parts in one view. Rule margin bars already exist.
4. [ ] Wind Tunnel: LIC, Δwake and Δforces. Cp probes, y+ and bad-cell maps are implemented.
5. [ ] Inspect redo (UI-REDO §3) and Strength redo (§4).
6. [ ] Stadium and TV mode, with F1ReplayTiming for the layout.
7. [ ] Event timing ledger with lap and interval history, and the speed-trap leaderboard.
8. [ ] Time-budget stacked chart with measured reaction. Race Sobol indices and the full variance budget.
9. [ ] Points distribution. Best eligible real-run ghost.
10. [ ] Calibration: prior and posterior plots, posterior predictive checks, the repeat-run control chart.
11. [ ] Apply a saved posterior to Race, with a linked record.
12. [ ] pymoo Pareto front on drag, mass and rule margin.
13. [ ] ORACLE: accepted-only CFD feedback, STEP-to-mesh hash guard, training-pool separation.
14. [ ] FORGE: wall thickness, chamber holes, halo comparison, inspection log.
15. [ ] Visual system: port t3code primitives, Geist tokens, one accent. Apply to every page.
16. [ ] Performance: lazy 3D, dispose resources, frame-demand rendering, bundle check.
17. [ ] Grouped browser, keyboard and responsive review at 1440, 1024 and 375 px.
18. [ ] Physical GPU and real-data checks once the data exists.

---

## 9. Done in this plan's last pass (2026-11-04)

- [x] ✅ `raceTracks.test.ts` imports vitest globals (`d42e65f`).
- [x] ✅ CI workflow move prepared (`8376558`). Blocked by token scope.
- [x] ✅ Wind Tunnel preview fallback (`ae73c0e`).
- [x] ✅ Compute endpoint and tests (`9672ffb`).
- [x] ✅ Race: MC convergence, mass curve, speed trap, timing export, compute page (`7de8fa2`).
- [x] ✅ Race annotations (task 5): committed in `aafbe8f`.
- [x] ✅ Chart gaps (task 10): Section 4 software is implemented. Native full-car yaw setup and physical/CFD acceptance remain separate gates. `mid`
