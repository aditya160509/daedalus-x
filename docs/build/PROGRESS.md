# PROGRESS: one tick-box view of the whole plan (2026-11-03)

Every target in `MASTER-PLAN.md` (§15, 16, 19, 20, 22, 26) and `TODO.md` §14, with its status.

**Legend**
- ✅ done (built and connected)
- 🟨 partly done
- ⬜ not started
- ⏳ built but not checked in the browser or with real data

**Rules for whoever updates this file**
- Update a box in the same commit as the work.
- Never tick a box for code that only exists in a draft.

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

> **For the next Claude/Codex:** delete the ✂️ rows (T22, T26, T28, T30, T31, T32, T35) from the `MASTER-PLAN.md` §22.3 and §24 tables, delete the T22 row in §23, and recount the §24 score.

## Overall
- **In-scope tasks:** about **47%** (MASTER-PLAN §24 score).
- **Software built:** about 65%.
- **Real data:** about 5%. No accepted CFD campaign, no measured race, no physical tests. **This is the biggest gap.**

---

## §15 Best feature list ("final boss"): 6 of 19 done, 8 partly done, 5 not started

**Pit Wall**
- [ ] ⬜ Race-week mission control (next action, days to the event, rules at risk, best car, seal status)
- [ ] ⬜ Points dashboard: the 1000-point breakdown with our estimate and gaps (Project scorecard is the start)
- [x] ✅ dockview layout, saved per device ⏳ visual review

**Design Studio**
- [x] 🟨 Rule overlay on the CAD: failed rule → select and frame the part ✅; red/amber colouring and dimension line ⬜
- [ ] ⬜ Design diff with a deviation heat map
- [ ] 🟨 Parametric sliders: study generator built; live sliders in the UI ⬜
- [ ] ⬜ Mass and centre-of-gravity estimate
- [ ] 🟨 Manufacturing check: pass probability ✅; wall thickness and CNC reach ⬜

**Wind Tunnel**
- [x] 🟨 Flow viewer: animated GPU particles + Cp ✅, Q-criterion vortices ✅, wake planes ✅; LIC streaks, probes and clip ⬜
- [x] 🟨 Run compare (same-mesh ΔCp) ✅; drag waterfall by part ⬜
- [ ] 🟨 Quality gate: convergence ✅; y+, mesh quality and GCI shown in the UI ⬜
- [ ] ⬜ Run wizard with live residuals and ETA

**Race**
- [x] ✅ Game-quality replay: real car, track, 6 cameras, f1-dash HUD, photo finish ⏳ 60 fps check
- [ ] ⬜ Race-day mode
- [x] ✅ Monte Carlo + tornado chart + "what wins"

**Evidence and reports**
- [x] ✅ React Flow lineage graph
- [x] 🟨 PDF: report ✅, judge pack ZIP ✅; India compliance chapter, run gallery and QR ⬜
- [x] ✅ Presenter (live slides, notes, timer)

## §16 Innovation ideas

| # | Idea | Status |
|---|---|---|
| 1 | Closed-loop autonomous design | 🟨 ORACLE → CAD → FORGE built; automatic CFD hand-off and accepted-only feedback ⬜ |
| 2 | Multi-fidelity BO | ✂️ cut (not doing) |
| 3 | Physics-informed race-time uncertainty | 🟨 Monte Carlo + SALib ✅; CFD grid error not yet included ⬜ |
| 4 | Live calibration (digital twin) | 🟨 Bayesian calibration + saved studies ✅; posterior not applied to Race ⬜, error-shrinking chart ⬜ |
| 5 | Rule-aware optimisation | 🟨 family filter + FORGE check ✅; feasibility inside the acquisition function ⬜ |
| 6 | Adjoint shape hints on the CAD | ⬜ (needs an accepted adjoint run) |
| 7 | ML surrogate (stretch) | ⬜ do last, only if time is left |
| 8 | Verifiable science (hash chain, verify page) | 🟨 hashes, timestamps, coverage ✅; public verify page + QR ⬜ |

**If an idea is not being done:** mark it ✂️ here with a one-line reason and delete it from MASTER-PLAN. Never leave it half-listed.

## §19 Analysis catalogue (A–G): 9 of 38 done, 12 partly done, 17 not started

**A. Aerodynamics**
- [ ] 🟨 1 Drag by part: component forces ✅; waterfall chart and pressure/friction split ⬜
- [x] ✅ 2 Run vs run ΔCp (same mesh) — design-to-design ⬜
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
- [ ] ⬜ 15 Acquisition history
- [ ] 🟨 16 Convergence vs baselines: only the old random benchmark; Optuna, Sobol and LHS ⬜
- [ ] ⬜ 17 Pareto front (pymoo)
- [ ] ⬜ 18 Leave-one-out validation

**C. Race**
- [x] ✅ 19 Time budget
- [x] ✅ 20 Tornado chart
- [x] ✅ 21 ms per unit
- [x] ✅ 22 Monte Carlo
- [x] ✅ 23 Traces (uPlot) — annotations ⬜
- [ ] ⬜ 24 Optimal mass
- [ ] ⬜ 25 Track-length scaling
- [ ] 🟨 26 Head-to-head / knock-out probability: Points panel ✅; real field data ⬜

**D. Race-day / measured**
- [ ] 🟨 27 Calibration: UI ✅; real data ⬜
- [ ] ⬜ 28 Reaction stats
- [ ] ⬜ 29 Lane / batch t-test
- [ ] ⬜ 30 Outlier detection
- [ ] ⬜ 31 Season trend

**E. Rules**
- [x] ✅ 32 Compliance margin map + points at risk
- [x] 🟨 33 Tolerance stack-up: pass probability ✅; measured spread ⬜
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
| mapbox/webgl-wind technique | ✅ Animated flow |
| Optuna, scipy.stats.qmc | ⬜ ORACLE benchmark |
| pymoo | ⬜ Pareto front |
| ArviZ | ⬜ Calibration diagnostics |
| OpenTimestamps | ⬜ Second anchor |
| FoamPilot | ⬜ Run wizard |
| Hypothesis, pint, openapi-typescript | ⬜ Quality |
| cmdk, sonner, vaul, TanStack Table, Kibo UI, Origin UI | ⬜ UI polish (`TODO.md` §11) |
| CalculiX | ⬜ Only with real material data |

## `TODO.md` §14 chart quality bar
- [ ] ⬜ One shared chart theme across ECharts and uPlot
- [ ] ⬜ Source badge on every chart
- [ ] ⬜ PNG/SVG export everywhere (uPlot ✅ only)
- [ ] ⬜ Plain-English caption on every chart
- [ ] ⬜ Compare-two-runs overlay everywhere

## Next 5 to do
1. Run CFD overnight: baseline on 3 meshes plus the speed sweep. This unlocks GCI, the waterfall, ORACLE on real data and the closed loop.
2. ORACLE benchmark with Optuna and qmc, plus the Pareto front with pymoo.
3. Closed loop to CFD with accepted-only feedback.
4. Race-day mode + stadium/TV mode.
5. UI polish pass on every page to 8/10.
