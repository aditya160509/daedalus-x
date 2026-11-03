# PROGRESS: one tick-box view of the whole plan (2026-11-03)

Every target in `MASTER-PLAN.md` (§15, 16, 19, 20, 22, 26) and `TODO.md` §14, with its status. Checked line by line against the code on 2026-11-03.

**Legend**
- ✅ done (built and connected)
- 🟨 partly done
- ⬜ not started
- ⏳ built but not checked in the browser or with real data
- 📝 code exists only as an uncommitted local draft (never ticked)

**Rules for whoever updates this file**
- Update a box in the same commit as the work.
- Never tick a box for code that only exists in a draft.
- A line with an open ⬜ remainder is 🟨, not ✅.

**Out of scope (deleted from the plan, never build)**
- T22 drawing pack (team work, not innovation)
- T26 base-bleed
- T28 rival data
- T30 photo scrutineer
- T31 video lab
- T32 photogrammetry
- T35 community calibration
- AR view
- T24 multi-fidelity
- BoTorch, OpenMDAO, trame

> Active task tables now exclude all eight cuts, including T22 and T24. Historical coarse task score is 48.1% over 27 tasks; the denominator change is a scope correction.

## Overall
- **In-scope tasks:** **48.1% historical coarse checklist score** (27-task scope; not effort or readiness).
- **Software built:** about 65%.
- **Real data:** about 5%. No accepted CFD campaign, no measured race, no physical tests. **This is the biggest gap.**

---

## §15 Best feature list ("final boss"): 5 of 18 done, 10 partly done, 3 not started

**Pit Wall**
- [ ] ⬜ Race-week mission control (next action, days to the event, rules at risk, best car, seal status)
- [ ] 🟨 Points dashboard: the 1000-point breakdown with our estimate and gaps (project scorecard exists; the 1000-point view ⬜)
- [x] ✅ dockview layout, saved per device ⏳ visual review

**Design Studio**
- [ ] 🟨 Rule overlay on the CAD: failed rule → select and frame the part ✅; red/amber colouring and dimension line ⬜
- [ ] 🟨 Design diff with a deviation heat map (two-design side-by-side compare ✅; heat map ⬜)
- [ ] 🟨 Parametric sliders: study generator built; live sliders in the UI ⬜
- [ ] ⬜ Mass and centre-of-gravity estimate
- [ ] 🟨 Manufacturing check: pass probability ✅; wall thickness and CNC reach ⬜

**Wind Tunnel**
- [ ] 🟨 Flow viewer: Cp ✅, Q-criterion vortices ✅, wake planes ✅ (field viewer); animated particles 📝 uncommitted draft (`FlowTunnel3D.tsx`), not ticked; LIC streaks, probes and clip ⬜
- [ ] 🟨 Run compare (same-mesh ΔCp) ✅; drag build-up by part ✅ (cumulative chart); signed component waterfall connected ⏳ browser review; Δwake/Δforces ⬜
- [ ] 🟨 Quality gate: convergence ✅; GCI and mesh-quality pass/fail shown ✅; y+ and bad-cell maps ⬜
- [ ] ⬜ Run wizard with live residuals and ETA

**Race**
- [x] ✅ Game-quality replay: real car, track, 6 cameras, f1-dash HUD, photo finish ⏳ 60 fps check
- [ ] 🟨 Race-day mode: sealed-prediction reveal ✅ (Pit Wall); live time and reaction entry and calibration update ⬜
- [x] ✅ Monte Carlo + tornado chart + "what wins"

**Evidence and reports**
- [x] ✅ React Flow lineage graph
- [ ] 🟨 PDF: report ✅, judge pack ZIP ✅; India compliance chapter, run gallery and QR ⬜
- [x] ✅ Presenter (live slides, notes, timer)

## §16 Innovation ideas

| # | Idea | Status |
|---|---|---|
| 1 | Closed-loop autonomous design | 🟨 ORACLE → CAD → FORGE built; automatic CFD hand-off and accepted-only feedback ⬜ |
| 2 | Multi-fidelity BO | ✂️ cut (not doing) |
| 3 | Physics-informed race-time uncertainty | 🟨 Monte Carlo + SALib ✅; CFD grid error not yet included ⬜ |
| 4 | Live calibration (digital twin) | 🟨 Bayesian calibration + saved studies ✅; posterior not applied to Race ⬜, error-shrinking chart ⬜ |
| 5 | Rule-aware optimisation | 🟨 family filter + FORGE check ✅; feasibility inside the acquisition function ⬜ |
| 6 | Adjoint shape hints on the CAD | 🟨 adjoint tooling exists (`adjoint.py`); CAD hints ⬜, needs an accepted adjoint run |
| 7 | ML surrogate (stretch) | ⬜ do last, only if time is left |
| 8 | Verifiable science (hash chain, verify page) | 🟨 hashes, timestamps, coverage ✅; public verify page + QR ⬜ |

**If an idea is not being done:** mark it ✂️ here with a one-line reason and delete it from MASTER-PLAN. Never leave it half-listed.

## §19 Analysis catalogue (A–G): status per row

**A. Aerodynamics**
- [ ] ⏳ 1 Drag by part: signed component waterfall + pressure/friction bars + PNG export connected; browser/accepted-run validation pending
- [ ] 🟨 2 Run vs run ΔCp (same mesh) ✅ — design-to-design ⬜
- [ ] 🟨 3 GCI: tooling ✅; accepted 3-mesh run ⬜
- [ ] 🟨 4 Wake survey: planes ✅; momentum-deficit drag ⬜
- [x] ✅ 5 Vortices (Q-criterion)
- [ ] ⬜ 6 Surface topology / LIC
- [ ] ⬜ 7 Cp along lines
- [ ] ⬜ 8 y+ / boundary-layer map
- [ ] ⬜ 9 Ride-height sensitivity
- [ ] ⬜ 10 Yaw sensitivity
- [ ] 🟨 11 Speed sweep: tooling ✅; runs ⬜
- [ ] ⬜ 12 Frontal area vs Cd trade

**B. ORACLE**
- [x] ✅ 13 GP response map
- [x] ✅ 14 Variable importance (SALib)
- [ ] 🟨 15 Acquisition history: benchmark trial reasons/table/export connected; real-campaign timeline ⬜
- [ ] ⏳ 16 Equal-budget GP/EI, native Optuna TPE/CMA-ES, Sobol/LHS/random: preregistered 10–20-seed queue, confidence bands and export built; completed study/browser review pending
- [ ] ⬜ 17 Pareto front (pymoo)
- [ ] ⏳ 18 Leave-one-out refitted GP validation and predictive coverage charts built; real-data/browser review pending

**C. Race**
- [x] ✅ 19 Time budget
- [x] ✅ 20 Tornado chart
- [x] ✅ 21 ms per unit
- [x] ✅ 22 Monte Carlo
- [ ] 🟨 23 Traces (uPlot) ✅ — annotations ⬜
- [ ] ⬜ 24 Optimal mass
- [ ] ⬜ 25 Track-length scaling
- [ ] 🟨 26 Head-to-head / knock-out probability: Points panel ✅; real field data ⬜

**D. Race-day / measured**
- [ ] 🟨 27 Calibration: UI ✅; real data ⬜
- [ ] ⬜ 28 Reaction stats
- [ ] ⬜ 29 Lane / batch t-test
- [ ] 🟨 30 Outlier detection: flags in the timing import API ✅; not shown in the UI ⬜
- [ ] ⬜ 31 Season trend

**E. Rules**
- [x] ✅ 32 Compliance margin map + points at risk
- [ ] 🟨 33 Tolerance stack-up: pass probability ✅; measured spread ⬜
- [ ] 🟨 34 Mass compliance: rule ✅; density × volume ⬜

**F. Manufacturing**
- [ ] ⬜ 35 Measured vs CAD deviation
- [ ] ⬜ 36 Wall thickness / CNC reach

**G. Project**
- [ ] 🟨 37 Decision timeline: forecast ✅; Gantt from the evidence log ⬜
- [ ] ⬜ 38 Compute and effort log

## §20 Stadium timing view: 3 of 10 done, 1 partly done, 6 not started
- [x] ✅ Timing tower (f1-dash components)
- [x] ✅ Mini-sectors (8)
- [ ] ⬜ Reaction column with thresholds
- [ ] 🟨 Speed trap: gauge ✅, trap panel ⬜
- [x] ✅ Race-pair view + photo finish
- [ ] ⬜ Event-wide leaderboard
- [ ] ⬜ History strip
- [ ] ⬜ Big-screen / TV mode
- [ ] ⬜ Prediction scoreboard
- [ ] ⬜ Day export (PDF/CSV)

## §22.2 India rule findings: 6 of 11 actions done, 1 partly done, 4 not started (#4 is a fact, nothing to build)
- [x] ✅ 1 Innovation story around project impact (`innovation.md`)
- [ ] 🟨 2 FEA wanted: beam FEM ✅; CalculiX + load test ⬜
- [x] ✅ 3 UK D8.5 example replaced with India T7.2.1
- [x] ✅ 4 Mass 50 g (in the rulebook)
- [ ] ⬜ 5 Performance rules as hard constraints inside ORACLE
- [x] ✅ 6 Points formulas (Points panel)
- [ ] ⬜ 7 Gas type confirmed → thrust model (waiting on the organisers)
- [ ] ⬜ 8 Tether 0.6 mm prior set in the model
- [ ] ⬜ 9 Originality question sent to the organisers
- [x] ✂️ 10 Drawing pack: cut
- [x] ✅ 11 Halo in CFD geometry (check for every run)
- [x] ✅ 12 1000-point weights

## §22.3 Next-wave tasks (in scope only)

| Done | Partly done | Not started |
|---|---|---|
| T19 energy, T02 queue, T08 race | T15 points, T16 timestamps, T17 calibration, T20 FORGE v2, T21 structure, T23 test planner, T29 frontier, T33 project, T34 V&V dossier | T18 thrust model, T25 free-form adjoint, T27 physical-in-loop |

## §26 Reuse passes

**Pass 1: racing-game + f1-dash components**
- [x] ✅ Imported: speed gauge, results, DriverTag, Gap, LapTime, MiniSectors
- [ ] ⬜ Their camera rigs and postprocessing chain were not taken (custom code was written instead)

**Pass 2: uPlot + React Flow**
- [x] ✅ Connected
- [ ] ⏳ Final visual review

**Pass 3: SALib**
- [x] ✅ Connected
- [ ] ⏳ Visual review of the Sensitivity tab

**Pass 4: dockview + test planner**
- [x] ✅ Connected
- [ ] ⏳ Visual review

**Saved data features**
- [x] ✅ Timestamps (T16), calibration studies (T17), project scorecard (T33), evidence coverage (T12), judge pack (T13)
- [ ] ⏳ Each still needs real data or a live check

## Open source: used to its best?

| Library | Status |
|---|---|
| Chili3D, uPlot, React Flow + Dagre, SALib, dockview, Typst, build123d, drei/R3F, postprocessing | ✅ Used properly |
| pmndrs/racing-game | 🟨 Only the HUD pieces; the camera and effects chain still to adopt |
| f1-dash | 🟨 Driver components; full leaderboard for stadium mode still to adopt |
| vtk.js | 🟨 Parsing and layers; the particle flow now uses three.js |
| mapbox/webgl-wind technique | 📝 Animated flow is an uncommitted draft (`FlowTunnel3D.tsx`) |
| Optuna, scipy.stats.qmc | ⏳ Native TPE/CMA-ES and scrambled Sobol/LHS benchmark connected; full queued study pending |
| pymoo | ⬜ Pareto front |
| ArviZ | ⬜ Calibration diagnostics |
| OpenTimestamps | ⬜ Second anchor |
| FoamPilot | ⬜ Run wizard |
| Hypothesis, pint, openapi-typescript | 🟨 pint used by the unit importers; Hypothesis and openapi-typescript ⬜ |
| cmdk, sonner, vaul, TanStack Table, Kibo UI, Origin UI | 🟨 cmdk, sonner and native TanStack v9 tables used; vaul, Kibo UI and Origin UI ⬜ (`TODO.md` §11) |
| CalculiX | ⬜ Only with real material data |

## `TODO.md` §14 chart quality bar
- [ ] 🟨 One shared chart theme across ECharts and uPlot (ECharts theme in `useECharts`; uPlot styled separately)
- [ ] ⬜ Source badge on every chart
- [ ] 🟨 PNG/SVG export everywhere (uPlot ✅ only)
- [ ] ⬜ Plain-English caption on every chart
- [ ] 🟨 Compare-two-runs overlay everywhere (ΔCp and ghost compare exist on some charts)

## Analysis: every chart, one tick each (`TODO.md` §14, merged with MASTER-PLAN §11 and §19)

**43 analyses. Status is tracked per row; new software remains ⏳ until browser/data verification.**

**Wind Tunnel (11)**
- [ ] 🟨 1 Cd / CdA with the GCI uncertainty bar: tooling ✅, accepted 3-mesh runs ⬜
- [ ] 🟨 2 Convergence (residuals + force history + gate line): residuals ✅, gate line ⬜
- [ ] ⏳ 3 Signed component waterfall + pressure/friction view + longitudinal build-up connected; browser/accepted-run validation pending
- [ ] 🟨 4 Cp along the centre line (top/bottom) + Cp on the surface: surface ✅, line plot ⬜
- [ ] 🟨 5 Run vs run: ΔCp surface (same mesh) ✅ — Δ wake / Δ forces table ⬜
- [ ] 🟨 6 Wake planes x/L 1, 1.5, 2 ✅ — deficit contours + momentum-deficit drag ⬜
- [ ] 🟨 7 Q-criterion vortex cores ✅, coloured by speed — vorticity colouring ⬜
- [ ] ⬜ 8 Surface streaks (LIC) + separation lines
- [ ] 🟨 9 Speed sweep Cd vs speed: tooling ✅, runs ⬜; yaw / ride height ⬜
- [ ] ⬜ 10 Frontal area vs Cd trade chart
- [ ] 🟨 11 Mesh quality pass/fail ✅; y+ maps and skewness histogram ⬜

**Race (9)**
- [ ] 🟨 1 Speed / accel / thrust / drag traces, linked cursors (uPlot) ✅ — event annotations ⬜
- [ ] 🟨 2 Ghost delta-time trace: ghost in Replay ✅, delta trace ✅; automatic best-run ghost ⬜
- [ ] 🟨 3 Time budget: metrics ✅; stacked bar ⬜
- [ ] 🟨 4 Tornado ✅ + SALib Sobol indices ⬜
- [x] ✅ 5 Exchange rates (ms per g, per cm² CdA, per 0.001 Crr)
- [ ] 🟨 6 Monte Carlo histogram p5/p50/p95 ✅ — convergence plot ⬜
- [ ] 🟨 7 Energy Sankey connected using native ECharts, signed integration error and PNG export; tether unmodelled; browser review ⏳
- [ ] 🟨 8 Expected points + knock-out probability ✅ — real field data ⬜
- [ ] ⬜ 9 Optimal mass curve

**ORACLE (7)**
- [ ] ⏳ 1 Aero map: mean / posterior-SD toggle + next point connected; browser review pending
- [ ] ⏳ 2 Regret curves: six native methods, 10–20 seeds and Student-t mean CIs connected; queued study/browser review pending
- [ ] 🟨 3 Held-out predicted vs stored targets with 90% intervals connected; accepted-data/campaign decision view pending
- [ ] ⏳ 4 Held-out coverage chart with Wilson bounds connected; fold-dependence caveat and synthetic label; real-data/browser review pending
- [ ] 🟨 5 Variable importance (SALib) ✅ — length-scales ⬜
- [ ] ⬜ 6 Pareto front (pymoo)
- [ ] ⬜ 7 Acquisition history timeline

**Calibration (6)**
- [ ] 🟨 1 Prior vs posterior plots: built ✅, real data ⬜
- [ ] 🟨 2 Error shrinking over runs: saved studies ✅; cross-run scoreboard ⬜
- [ ] ⬜ 3 Posterior predictive check (ArviZ)
- [ ] 🟨 4 Paired-test difference CI + minimum detectable effect: D-optimal planner ✅; paired analysis and chart ⬜
- [ ] ⬜ 5 Control chart of repeat runs
- [ ] 🟨 6 Uncertainty budget: input rank correlations ✅; variance shares ⬜

**FORGE (4)**
- [ ] 🟨 1 Margin bars sorted by points at risk ✅ — tolerance band shading ⬜
- [ ] 🟨 2 Pass probability per rule: overall pass probability ✅; per-rule plot ⬜
- [ ] 🟨 3 Legal-frontier map: single-design nearest limits ✅; sampled feasible frontier ⬜
- [ ] 🟨 4 R/A/G summary: states ✅, one-pager ⬜

**Structure (3)**
- [ ] ⏳ 1 Deflection / bending stress plots connected to solver nodes, estimated strength line and PNG export; browser/material validation pending
- [ ] 🟨 2 Safety factor table
- [ ] ⬜ 3 Predicted vs measured load test

**Project (3)**
- [ ] 🟨 1 Planned vs actual timeline: forecast ✅, Gantt from the evidence log ⬜
- [ ] ⬜ 2 Risk matrix
- [ ] ⬜ 3 Effort / CFD-hours chart

**Extra analysis from MASTER-PLAN §11 and §19 not in the 43 above**
- [ ] ⬜ Adjoint drag map on the car (§11 #6)
- [ ] ⬜ Thrust curve fit + cartridge variance (§11 #13)
- [ ] ⬜ Reaction-time statistics (§19 #28)
- [ ] ⬜ Lane / batch t-test (§19 #29)
- [ ] 🟨 Outlier detection (§19 #30): flags in the timing import API ✅; not shown in the UI ⬜
- [ ] ⬜ Season trend (§19 #31)
- [ ] ⬜ Track-length scaling (§19 #25)
- [ ] ⬜ Mass from density × volume (§19 #34)
- [ ] ⬜ Measured vs CAD deviation (§19 #35)
- [ ] ⬜ Wall thickness / CNC reach (§19 #36)
- [ ] ⏳ Leave-one-out ORACLE validation (§19 #18): refitted folds + diagnostics connected; browser/real data pending
- [ ] 🟨 Acceptance audit per run (§11 #15): reason shown ✅, full audit page ⬜

## MASTER-PLAN sections not covered above

**§1 Legal**
- [ ] ⬜ 1 PDFs archived in `data/reference/rules/` + evidence store
- [ ] 🟨 2 every T-rule in YAML
- [ ] 🟨 3 advanced measures (wall, chamber ⬜)
- [ ] 🟨 4 rule → CAD (overlay ⬜)
- [ ] ⬜ 5 judging score checklist linked to screens

**§2 Wind Tunnel**
- [ ] 📝 1 one viewer: the particle flow is an uncommitted draft; the field viewer is still mounted as the other tab
- [ ] 🟨 2 ParaView-grade layers (LIC, probes, clip ⬜)
- [x] ✅ 3 clean look
- [x] ✅ 4 accepted-run default
- [ ] 🟨 5 engineering panels (GCI chart ✅; y+ and mesh maps ⬜)
- [ ] ⬜ 6 FoamPilot wizard

**§3 Race**
- [x] ✅ 1 real car
- [x] ✅ 2 track + cameras
- [x] ✅ 3 HUD
- [ ] 🟨 4 one chart theme
- [x] ✅ 5 Monte Carlo + tornado

**§4 Chart bar** — 🟨 (see the chart quality bar list above)

**§5 Innovation** — same as §16

**§6 / §12 OSS** — see the open-source table above

**§7 Remove**
- [ ] 🟨 old flow view, toolbar clutter, duplicate badges, rejected-run default, Race slider stack (old field viewer still mounted as a second Wind Tunnel view)
- [x] ✅ Calibration and Test planner: Lab/Track/Custom presets and Advanced sections (input walls reduced)

**§8 Build order** — 1–5 mostly done; 6 partly (no multi-fidelity); 7 partly (dockview ✅, xyflow ✅, FoamPilot ⬜); 8 QA ⬜

**§9 UI bar** — 🟨 shell is good. Per-page pass to 8/10 ⬜ (`TODO.md` §11).

**§10 Cuts**
- [x] ✅ all 6 cuts done
- [ ] ⬜ Inspect → CAD side-panel merge

**§13 Race rebuild, 8 points**
- [x] ✅ 1 car, 2 track, 3 cameras, 5 HUD, 7 photo finish
- [ ] 🟨 4 effects (no motion blur / FOV kick), 6 ghost / compare (split-screen delta ⬜), 8 60 fps (unverified)
- [ ] ⬜ clip export

**§14 Chart rules** — 🟨 uPlot has export and linked cursors; ECharts theme unification, annotations and source badges everywhere ⬜

**§17 Overbuilt review**
- [ ] 🟨 Chili3D: keep
- [x] ✅ two 3D engines accepted
- [ ] ⬜ M1 under Advanced
- [ ] ⬜ reaction trainer into race-day mode
- [x] ✅ ORACLE stays at 4 variables
- [x] ✅ keep the evidence store
- [ ] ⏳ Race tabs merged to Replay / Analysis / Points / Calibration; hash links preserved; browser verification pending
- [x] ✅ renders only in the report

**§21 Output products**
- [ ] 🟨 portfolio PDF (chapters ⬜)
- [x] ✅ presenter deck
- [x] ✅ scrutineering sheet
- [ ] ⬜ race-day report
- [ ] 🟨 evidence appendix (QR ⬜)

**§28 ledger items not listed above**
- [x] ✅ Removed Drawings tab/generator/API/template and judge-pack drawing references (out of scope); saved files untouched
- [ ] ⬜ Keep synthetic and physical/accepted-CFD training data separate in ORACLE
- [ ] ⬜ Official judging weights checked against real delivery (declared points are not awarded points)
- [ ] ⬜ Red-team and post-event regret reports
- [ ] 🟨 Session best / last / interval / reaction history: timing tower ✅; full event timing system ⬜

## Why real data is only ~5%, what we need, and how to get it

**Why 5%:** almost every number in the app is either *synthetic* (made-up seed data so the screens work) or *simulated on settings nobody has accepted yet*.
- ORACLE has 8 observations, all synthetic.
- No CFD run has passed the acceptance gate on the real car with a grid study.
- No real race time, mass, dimension or thrust curve has been entered.

The only real inputs are the CAD geometry and the rulebook. Without data, judges can't verify any claim.

**What we need (minimum for a defensible story)**

| Data | How much | Who / how | Unlocks |
|---|---|---|---|
| Accepted CFD: baseline on 3 meshes | 3 runs (~3 nights on the Mac) | Codex queues them, 1 per night | GCI, Cd ± error, trust badge |
| Speed sweep 15 / 20 / 25 m/s | 3 runs | overnight | constant-Cd check |
| ORACLE design runs | 10–15 runs (~2 weeks of nights) | closed loop queues them | real aero map, benchmark, Pareto |
| Physical mass + dimensions | every part, 2 people × 3 times | team, scale + calipers | FORGE measured, gauge R&R |
| Thrust curves | 5+ cartridges at 21 °C | team (needs a load cell) | thrust model T18 |
| Track runs (paired) | 20–30 timed runs, baseline vs candidate | team at the track | calibration, sealed prediction test |
| Coast-down / spin-down | 10 runs | team | Crr, wheel friction |
| Reaction times | 50+ practice starts | driver with the Start trainer | reaction stats, points model |
| Material properties + load test | 1 datasheet + 3 load tests | team | FEA validation, CalculiX |

**Plan**
1. Start CFD tonight, one run per night, and never run it alongside the dev servers.
2. The team buys or borrows a 0.01 g scale, calipers and a small load cell.
3. Book track time: 2 sessions of about 15 runs each.
4. Enter every number through the app (Calibration / Project) so it gets hashed as evidence.

**Target:** 50% real data in about 6–8 weeks, and 90% before Nationals.

## `TODO.md` task by task (items not ticked elsewhere in this file)

**1. Wind Tunnel animated flow**
- [x] ✅ Render tab removed
- [x] ✅ Velocity texture exported
- [ ] 📝 GPU particles + Cp + camera presets (uncommitted `FlowTunnel3D.tsx`; not ticked)
- [x] ✅ Accepted-run default
- [ ] ⬜ Particle trails (streaks)
- [ ] ⬜ Faint wireframe tunnel walls
- [ ] 📝 Moving ground stripe (in the uncommitted draft)
- [ ] ⬜ Bloom on the particles only
- [ ] ⬜ Slice with particles crossing it
- [ ] 📝 Auto-drop the particle count below 50 fps (in the uncommitted draft)
- [ ] ⏳ 60 fps on the real Mac GPU

**1b. CFD speed-ups**
- [x] ✅ Parallel solve (6 procs, `decomposePar`)
- [ ] ⬜ Warm start (`mapFields`)
- [ ] ⏳ Cd convergence stopping already generated: tolerance 0.001 / 200 iterations (quick: 150). API/queue/CLI expose disable, tolerance, window and iteration cap; effective config persisted. Independent acceptance gates retained; installed v2606 execution not verified
- [ ] ⬜ Mesh reuse / morph
- [ ] ⬜ 10-core meshing
- [ ] ⬜ FluidX3D GPU screening (check its licence first)
- [ ] ⬜ Cloud burst (Inductiva / AWS) if needed

**2. Race**
- [ ] ⏳ Race tabs reduced to 4 with one active Analysis panel; browser verification pending
- [ ] ⏳ Start trainer opens as a Base UI dialog from Replay; keyboard handler unmounts on close; browser verification pending
- [ ] ⬜ Motion blur / FOV kick
- [ ] ⬜ Clip export
- [ ] ⬜ Race-day mode
- [ ] ⬜ Stadium / TV mode

**3. FORGE**
- [ ] ⬜ Rule count 79 vs 80 checked against the PDF
- [ ] 🟨 Margin in % on every rule (margin in mm per rule ✅; percent ⬜)
- [ ] ⬜ R/A/G one-pager
- [ ] ⬜ Inspection log
- [ ] ⬜ What-if drag mode
- [ ] ⬜ Halo/helmet standard-part check
- [ ] ⬜ Wall thickness, chamber, cylinder-fit wheel

**5. Closed loop**
- [ ] ⬜ Queue CFD automatically when every performance rule passes
- [ ] ⬜ STEP-hash guard
- [ ] ⬜ Accepted-only observation
- [ ] 🟨 "Run CFD" button: Pit Wall → build next → run dialog ✅ (manual queue); status ⬜

**6. ORACLE**
- [ ] ⏳ Preregistered Optuna/qmc benchmark implemented: immutable protocol before queue, code/version binding, six methods, 10–20 seeds, CI/export; no full study run yet
- [ ] ⬜ Nugget noise term
- [ ] ⬜ Acquisition history
- [ ] ⬜ Pareto chart
- [ ] ⬜ Engineer veto mode

**7. CFD campaign**
- [ ] 🟨 3-mesh GCI: GCI panel ✅; accepted 3-mesh study ⬜
- [ ] 🟨 Speed sweep: tooling ✅; runs ⬜
- [ ] ⬜ 2 turbulence models
- [ ] ⬜ One-page acceptance rule
- [ ] ⬜ OpenFOAM version pinned + case hash stored per run
- [ ] ⬜ Run wizard with residuals and ETA

**8. Calibration and tests**
- [x] ✅ Presets + Advanced on Calibration and Test planner (Lab/Track/Custom protocols)
- [ ] 🟨 Error shrinking over runs: saved studies ✅; cross-run scoreboard ⬜
- [ ] ⬜ ArviZ diagnostics (R-hat unavailable for the current importance sampler)
- [ ] 🟨 Paired-test protocol + power analysis: D-optimal planner ✅; paired protocol, CI and power analysis ⬜
- [ ] 🟨 Physical tests: timing and thrust CSV import ✅; mass, caliper, coast-down and load-test entry ⬜
- [ ] ⏳ Sealed prediction checked against a real run: seal/score workflow ✅; no real run scored yet

**9. Structure**
- [x] ✅ Beam FEM vs closed-form test (cantilever PL³/3EI test in `tests/test_structure.py`)
- [ ] ⬜ CalculiX (real material data only)
- [ ] 🟨 Safety factor
- [ ] ⬜ Before/after load test

**10. Evidence and judges**
- [ ] ⬜ OpenTimestamps second anchor (RFC 3161 anchor ✅ only)
- [ ] ⬜ Public verify page + QR (verify API ✅; page and QR ⬜)
- [ ] ⬜ Signed git tag
- [ ] ⬜ Rule PDFs and runs registered in the store (`data/reference/rules/` is empty)
- [ ] ⬜ 3-minute judge walkthrough
- [x] ✅ Speaker notes (Presenter, `N` key)
- [ ] ⬜ 60-question Q&A bank
- [ ] ⬜ Limitations slide
- [ ] ⬜ Innovation one-pager
- [ ] ⬜ Commit/rulebook hash in every PDF
- [ ] ⬜ Offline demo + fallback video

**11. UI to 8/10**

| Page | Status |
|---|---|
| Pit Wall | 🟨 |
| Wind Tunnel | 🟨 |
| Design Studio | 🟨 |
| Race | 🟨 |
| Project | 🟨 |
| Evidence | 🟨 |
| Presenter | 🟨 |
| Settings | ⬜ |

- [ ] 🟨 Adopt cmdk/sonner/vaul/TanStack Table/Kibo/Origin (cmdk, sonner and TanStack v9 used; vaul/Kibo/Origin ⬜)
- [ ] 🟨 No form with more than 6 visible inputs (Calibration and Planner done; other forms ⬜)
- [ ] 🟨 Every page re-scored in `RATINGS.md` (file exists; re-scoring pending)

**12. Engineering quality**
- [ ] 🟨 CI on every push: workflow in `ci/github-actions-ci.yml` is not in `.github/workflows/`, so it does not run; `lefthook.yml` runs ruff, pyrefly, tsc, oxlint and gitleaks on commit
- [ ] ⬜ 80% coverage on the core modules
- [ ] ⬜ Hypothesis tests
- [ ] ⬜ Golden-file baseline tests
- [ ] ⬜ OpenAPI → TS types
- [ ] ⬜ Playwright golden path (`@playwright/test` installed, no golden-path test)
- [ ] 🟨 Analytic physics benchmarks + pint (cantilever closed-form test ✅; pint in unit importers ✅; more benchmarks ⬜)
- [ ] 🟨 pip-audit / pnpm audit / licence scan (pip-audit in the CI file, not running; licence scan ⬜)

**13. Project and enterprise**
- [ ] 🟨 Timeline (forecast ✅; Gantt ⬜)
- [ ] ⬜ Decision log
- [ ] ⬜ Risk register
- [ ] ⬜ Meeting minutes
- [ ] ⬜ Budget with receipts
- [ ] ⬜ Lessons learned
- [ ] ⬜ Sponsor report
- [ ] ⬜ Tool cost vs commercial

**MASTER-PLAN §22.4: organiser questions**
- [ ] ⬜ Email sent (AI use, air vs CO₂, manual vs auto launch, presentation split)

**`NOW.md`:** it is the detailed test checklist (~550 bullets). Tick those in `NOW.md` itself; this file tracks the build.

## Next 5 to do
1. Run CFD overnight: baseline on 3 meshes plus the speed sweep. This unlocks GCI, the waterfall, ORACLE on real data and the closed loop.
2. ORACLE benchmark with Optuna and qmc, plus the Pareto front with pymoo.
3. Closed loop to CFD with accepted-only feedback.
4. Race-day mode + stadium/TV mode.
5. UI polish pass on every page to 8/10.

## Code sprint update: ORACLE and Race (2026-11-03)

- Native Optuna/CMA-ES, SciPy qmc and TanStack Table integrations are connected, with licence copies and attribution. No CFD or full optimiser benchmark launched during this sprint.
- Benchmark jobs and CFD share a mutual-exclusion gate; benchmark subprocess numerical thread counts are capped at one. Opening ORACLE no longer runs the legacy benchmark.
- GP diagnostics use actual stored targets and refit each held-out fold; synthetic seed targets remain labelled synthetic.
- Race now has four main tabs and a dialog-based trainer. Browser/performance checks remain open.
- Speed-up claims (2–3×, 50–100×) are unmeasured. Warm start, mesh reuse, separate meshing ranks and FluidX3D remain unimplemented; no restricted solver code was bundled.
- Evidence: `evidence/ORACLE-native-benchmark.md`, `evidence/C07-race-navigation.md`.
