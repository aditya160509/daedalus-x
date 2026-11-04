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
- [ ] ⬜ Live parametric controls with validated regeneration.
- [ ] ⬜ Material-aware mass and centre-of-gravity estimate from geometry.
- [ ] ⬜ Minimum wall thickness, CNC reach and measured-versus-CAD checks.
- [ ] ⏳ Keyboard, responsive and manufactured-part acceptance.

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
- [ ] 🟨 One renderer and one scene for the advanced field layers.
- [ ] ⬜ Surface LIC and separation lines.
- [ ] ⬜ Cp probe lines.
- [ ] ⬜ y+ and bad-cell maps, skewness histogram.
- [x] ✅ Momentum-deficit wake drag cross-check, wake loss map, drag by part (`1d4a1f3`).
- [ ] ⬜ Δwake and Δforces between two runs.
- [x] ✅ Run monitor: residual chart per field and ETA in the Jobs drawer (`4853264`).
- [x] ✅ Frontal-area versus Cd trade chart with iso-drag curves (`ff6bf40`).
- [ ] ⬜ Yaw and ride-height sweeps.
- [ ] ⏳ Accepted current-car baseline, three-mesh GCI, physical correlation.

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
- [ ] 🟨 Session timing: best, last, interval and reaction history. The tower exists. A full saved timing ledger does not.
- [ ] 🟨 Points distribution. Scenario averages exist. A full distribution does not.
- [ ] ⬜ Stacked time-budget chart with measured reaction (reaction is fixed at 0 now).
- [ ] ⬜ Race-level SALib indices and a full variance budget.
- [ ] ⬜ Best eligible real-run ghost (scenario ghost exists).
- [x] ✅ History strip vs prediction band on Race day (`77d738d`).
- [x] ✅ Stadium view: fullscreen race-day big numbers (`/race/day`, `750b64f`). Panel rotation still open.
- [ ] ⬜ Supported tether model through dynamics and energy balance.
- [x] ✅ Race-day time and reaction entry with prediction comparison and CSV/JSON export (`750b64f`).
- [ ] ⬜ Explicit calibration update from race-day runs.

### 3.4 ORACLE and closed loop
- [x] ✅ Robust pick: P50/P90 race time per Pareto design under drag and race-day uncertainty (`9744fab`).
- [x] ✅ Gaussian process with expected improvement, next-point recommendation, mean and SD map.
- [x] ✅ Study-family feasibility filter.
- [x] ✅ SALib sensitivity on the fitted GP. Length scales, noise, optimiser status.
- [x] ✅ Equal-budget benchmark: Optuna TPE, CMA-ES, Sobol, LHS, random. Ten to twenty seeds with regret bands. Synthetic labels.
- [x] ✅ Observation validation with serialised, atomic appends.
- [ ] 🟨 Campaign acquisition history and engineer proceed, edit or veto records.
- [ ] 🟨 Adjoint tooling exists. Accepted adjoint sensitivity map and constrained updates do not.
- [ ] ⬜ Accepted-only CFD feedback. STEP-to-mesh hash guard. Performance-rule gate.
- [ ] ⬜ Separate training pools: synthetic demo, unreviewed input, accepted CFD, physical data.
- [x] ✅ Pareto front with pymoo NSGA-II: predicted CdA vs uncertainty (`40d8dc2`). Mass and rule-margin objectives wait for a mass model.
- [ ] ⬜ Repeat-experiment noise estimate, separate from the GP nugget.

### 3.5 Calibration and physical tests
- [x] ✅ Unit-aware timing and thrust input with outlier flags. No rows are dropped silently.
- [x] ✅ Bounded importance-sampling calibration. Posterior intervals. ESS and warnings. Held-out predictions.
- [x] ✅ Saved calibration inputs, results and hashes. Study browser.
- [x] ✅ D-optimal timing and coast-down planner.
- [x] ✅ Lab-day, track-day and custom protocols with advanced settings.
- [x] ✅ Paired timing: mean CI (SciPy t), prospective power and minimum detectable effect.
- [x] ✅ Minimum-N solver for paired timing, with N and N-1 power.
- [ ] 🟨 Across-study scoring and posterior predictive checks.
- [ ] 🟨 Applying a saved posterior to Race. Explicit link and record still missing.
- [ ] ⬜ Prior versus posterior density plots.
- [ ] ⬜ Across-run error scoreboard over new measurements.
- [ ] ⬜ Repeat-run control chart and gauge R&R.
- [ ] ⬜ Entry for part masses, caliper dimensions, coast-down, tether and load-test data.

### 3.6 FORGE (India rules, in app)
- [x] ✅ India NF rulebook loaded with page, value, limits, state, margin, points at risk.
- [x] ✅ Wheel, axle, layout, rolling band, wing section, notch and rear-wing measures.
- [x] ✅ CAD remeasurement by hash, rule-to-part focus.
- [x] ✅ Nearest-limit list and chart with unit filter.
- [x] ✅ Manufacturing-spread pass probability per rule.
- [x] ✅ Margin bars with ±1σ bands and percent-of-span margins, ordered by points at risk.
- [ ] 🟨 Rule coverage reconciled with the regulation text. The YAML has 79 entries; the recount is pending.
- [ ] 🟨 Feasible frontier across the design space. Single-design ranking exists.
- [ ] ⬜ Wall thickness, chamber holes, full section chord, halo comparison.
- [ ] ⬜ Inspection log: who, tool, when, raw readings, physical part identity.
- [ ] ⬜ Interactive dimensional what-if.

### 3.7 Structure (strength)
- [x] ✅ Beam FEM API and Strength panel with part and load presets. Analytic beam checks.
- [x] ✅ Solver deflection and bending-stress plots with yield band and PNG export.
- [x] ✅ Configured-part comparison table for up to four captured cases.
- [ ] ⬜ Safety-factor table across all four strength parts in one view. The comparison table covers captured cases only.
- [ ] ⬜ Predicted versus measured load-test chart.

### 3.8 Records, quality and operations
- [x] ✅ Saved source, design, run, experiment and model records with content-addressed files and lineage.
- [x] ✅ Streaming hash checks.
- [x] ✅ Shared ECharts, uPlot, TanStack Table and Base UI integration.
- [x] ✅ Compute and wall-time table per CFD run, read from logs.
- [x] ✅ CI workflow exists in the repo as `ci/github-actions-ci.yml`. Moving it to `.github/workflows` is blocked: the token lacks the `workflow` scope.
- [x] ✅ Tests for source binding, lineage and numerical helpers. Regression tests for the new endpoints.
- [ ] 🟨 Per-screen provenance labels are not yet consistent everywhere.
- [ ] 🟨 Chart exports (PNG on every new chart), linked cursors and keyboard access for every table.
- [ ] ⬜ Source-linked decision log and engineering rationale record.
- [x] ✅ AI Assistance and Verification Log (rule C2.18.3) exported from git history as CSV in the Evidence drawer.
- [ ] 🟨 Practical quality: coverage targets are not set. Property tests are partial. OpenAPI-generated types are not in place.
- [ ] ⏳ Grouped browser, keyboard, download and responsive review at 1440, 1024 and 375 px.

### 3.9 Repo state
- [x] ✅ All work committed and pushed; CI workflow lives in `.github/workflows/ci.yml`. Old planning docs (NOW, HANDOFF, TASK-BOARD, BUILD-ORDERS, CUT-AND-ADD, RATINGS, UI-MASTER-PLAN, task files, agent notes) removed 2026-11-04.

## 4. Analyses and charts (one status per chart)

Each chart needs: shared theme, units on axes, a source tag, hairline grid, dashed limit lines, uncertainty bands where the data has them, PNG export, and a one-line caption.

| ID | Chart | Status | Remaining |
|---|---|---|---|
| W01 | Cd and CdA with grid uncertainty | 🟨 | Consistent CdA uncertainty from accepted source. |
| W02 | Residual and force convergence with gate | 🟨 | Gate line and linked comparison. |
| W03 | Component drag waterfall, pressure and friction | ✅ | Accepted-CFD browser review. |
| W04 | Centreline Cp and surface Cp | 🟨 | Centreline plot. |
| W05 | ΔCp, Δwake, Δforces | 🟨 | Δwake and Δforces. |
| W06 | Wake planes and momentum drag | 🟨 | Deficit contours and drag cross-check. |
| W07 | Q cores coloured by vorticity | 🟨 | Colour is speed now. |
| W08 | LIC and separation lines | ⬜ | Build. |
| W09 | Speed, yaw and ride-height study | 🟨 | Yaw and ride-height sweeps. |
| W10 | Frontal area versus Cd | ⬜ | Build. |
| W11 | Mesh and y+ maps, skewness histogram | 🟨 | Spatial maps, histogram. |
| R01 | Linked telemetry traces and events | 🟨 | Annotations (in uncommitted `raceTracks.ts`). |
| R02 | Ghost Δtime against the best run | 🟨 | Automatic best real run. |
| R03 | Time-budget stacked bar | ⬜ | Stacked chart with measured reaction. |
| R04 | Tornado and SALib race indices | 🟨 | Race Sobol indices. |
| R05 | Exchange rates | ✅ | Browser review. |
| R06 | Monte Carlo histogram and convergence | ✅ | Convergence plot added (`7de8fa2`). |
| R07 | Energy Sankey | ✅ | Tether term, browser review. |
| R08 | Points distribution, round and head-to-head | 🟨 | Full distribution. |
| R09 | Optimal legal mass curve | ✅ | Built (`7de8fa2`). |
| R10 | Speed trap and timing export | ✅ | Built (`7de8fa2`). |
| O01 | GP mean and expected-improvement map | ✅ | Browser review. |
| O02 | Equal-budget regret benchmark with CIs | ✅ | Full numerical study. |
| O03 | Predicted versus actual candidates | 🟨 | Accepted campaign data. |
| O04 | Predictive interval calibration | ✅ | Real-data check. |
| O05 | Length scales and Sobol importance | ✅ | Accepted-data review. |
| O06 | Pareto front | ⬜ | pymoo on eligible objectives. |
| O07 | Acquisition history | 🟨 | Real-campaign timeline and veto records. |
| S01 | Prior and posterior plots | 🟨 | Density plots. |
| S02 | Error shrinking scoreboard | 🟨 | Per-run trend. |
| S03 | Posterior predictive checks | 🟨 | PPC chart. |
| S04 | Paired CI and minimum detectable effect | ✅ | Real paired data. |
| S05 | Repeat-run control chart | ⬜ | Build. |
| S06 | Uncertainty variance budget | 🟨 | CFD, reaction and timing terms. |
| F01 | Margin bars with tolerance bands | ✅ | Manufacturing band and points ordering. |
| F02 | Per-rule pass probability | 🟨 | Browser review. |
| F03 | Legal frontier | 🟨 | Sampled feasible frontier. |
| F04 | Red, amber, green summary | 🟨 | Rule counts exist. Source archive is cut. |
| T01 | Deflection and stress plots | ✅ | Physical material review. |
| T02 | Safety-factor table, all four parts | 🟨 | One table covering all four parts. |
| T03 | Predicted versus measured load | ⬜ | Measured data needed. |
| P01 | Planned versus actual timeline | ⬜ | Gantt is cut. Keep only evidence timing if needed. |
| P02 | Risk matrix | ✂ | Cut. |
| P03 | Effort and CFD hours | ✅ | Compute table built. Effort chart is cut. |

---

## 5. UI redo plan (from UI-REDO.md)

**Bar:** Linear, Vercel dashboard, T3 Code. Quiet, dense, precise. No glow, gradient cards, emoji or decorative icons.

- [x] ✅ 0. "1 Issue" runtime error fixed (Timer import, LegalPanel hydration).
- [x] ✅ 1. Moving air: GPU particles coloured by speed, preview fallback.
- [x] ✅ 2. Outputs tab (`b261ced`) and Wind Tunnel Analysis tab (`b22461b`). Strength card still open.
- [ ] ⬜ 3. Inspect redo: smooth shading, rule colours on parts, dimension lines, View, Measure, Section, Compare tabs, model table with units.
- [ ] ⬜ 4. Strength redo: part sketch with the load arrow, one compact input row, one deflection chart and one stress chart with the limit band, one summary row, all-part table.
- [x] ✅ 5. Visual system: T3 Code / affectUI tokens (#111113 cards, 8% hairline borders, desaturated accent, flat status colours), 32 px compact buttons, white primary, underline tabs, 8 px radius, no glows.
- [ ] ⬜ 6. Performance: lazy 3D, one WebGL context per page, dispose resources, demand-driven frames, bundle check.
- [ ] 🟨 7. Tokens apply app-wide. Pit Wall Flow panel still blank; Race replay needs the display mesh.
- [ ] ⏳ 8. Screenshot at 1440, compare with Linear and Vercel, fix anything louder than them.

**Visual tokens (target):** background `#0B0B0C`; surfaces `#111113` and `#161618`; borders `rgba(255,255,255,0.08)`; text `#EDEDEF`, `#A0A0A8`, `#6B6B73`; one accent for selected tab, focus and the primary series; status as 6 px flat dots or text, no glow.
**Type:** Inter 13 px UI, 12 px labels, 20 px page titles, 24–28 px KPI values, mono tabular numbers.
**Spacing:** 4 px grid. Cards 16 px padding, radius 8, 1 px border, no shadow.

---

## 5b. Innovation backlog (researched 2026-11-04)
- [ ] ⬜ Live wind tunnel: GPU lattice-Boltzmann preview while editing. FluidX3D (non-commercial licence: run as a separate optional program, never vendored) or MarcosAsh/Lattice_Fluid_Dynamics (MIT).
- [ ] ⬜ Neural field surrogate: fine-tune NVIDIA Transolver (DrivAerML, PhysicsNeMo, Apache-2.0) on our runs for instant pressure/wake fields; label "predicted".

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
- [ ] ⏳ Accepted CFD: a three-mesh GCI study, a speed sweep, and a baseline run that passes the gates. Needs an explicit go-ahead to run solvers.
- [ ] ⏳ Mass and dimensions: part masses and caliper measurements for the car.
- [ ] ⏳ Material properties: measured yield and modulus for the strength parts.
- [ ] ⏳ Load tests: measured deflection and failure load to compare with the beam FEM.
- [ ] ⏳ Rule text: the official India rule pages, to reconcile the 79 YAML rule entries.
- [ ] ⏳ Race-day timing: a live or recorded event ledger for calibration and the stadium view.

---

## 8. Ordered next steps

1. [ ] Push pending local commits when the owner refreshes the token. Include the CI move.
2. [ ] Commit the other contributor's `raceTracks.ts` annotation work once they finish it. Then `d42e65f` passes on HEAD.
3. [ ] Task 10 gaps: the safety-factor table for all four parts in one view. Rule margin bars already exist.
4. [ ] Wind Tunnel: LIC, Cp probes, y+ and bad-cell maps. Then Δwake and Δforces.
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
- [ ] 🟨 Chart gaps (task 10): the safety-factor table exists for captured cases. The remaining chart items are in §4.
