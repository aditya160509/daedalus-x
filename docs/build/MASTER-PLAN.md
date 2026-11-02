# Master plan: final form (2026-11-02)

The goal: every screen at commercial quality, every rule checked, every feature connected, and innovation the judges can't miss. **Build in progress. Current task checkmarks and percentage: §24. Open-source reuse audit: §25.**

---

## 0. Status
- Jainam (`Jainamsomething25`) has **accepted** and is a collaborator.
- ✅ Present: connected Chili3D CAD, vtk.js Flow, hero renders, sealed prediction, ORACLE core, India NF FORGE, evidence trail, report PDF and Presenter. Feature completeness and acceptance differ; see §24.
- ✅ India NF 2025-26 is the default rulebook (80 entries). 🟨 Some dimensions compute; physical, ambiguous and unsupported checks remain manual. The UK book is retained only as a reference.

## 1. Legal: maximise every point (highest priority)
1. ⬜ Archive both source PDFs into `data/reference/rules/india_nf_2025_26/` and the evidence store. Hashes are recorded in the rulebook; the archive directory currently contains no PDFs.
2. Extract **every** measurable T-rule into a new YAML: length, width, height, wheel diameter and width, ground clearance, wing spans, chords and thickness, nose cone, cartridge chamber depth and diameter and height, tether guides, body "virtual cargo", decals, mass, wall thickness, no-go zones. Each rule gets page, measure, min, max, penalty and tolerance.
3. New FORGE measures beyond bounding boxes: wall thickness (ray casting), wheel diameter (cylinder fit), chamber position (hole detection), and section-based chord. Cover every rule a CAD model can check; the rest are flagged "physical check" with a printable inspection sheet.
4. 🟨 **Rule → CAD jump:** ✅ failed rules open the saved design, select and frame named parts using `{type:"daedalus:focus", part}`; Rules shows the value, limit and points at risk. ⬜ A dimension/limit overlay inside the CAD view remains.
5. Competition Regulations: turn the judging criteria into a **score checklist** (which evidence each judging area wants) and link each item to the screen or PDF page that proves it.

## 2. Wind Tunnel: best in class
The Flow tab (screenshot) looks cluttered: too many seeds, translucent spaghetti, and a "rejected" run as the default. Fix:
1. **One viewer engine:** move the Flow tab onto vtk.js, the same engine as 3D Flow, and delete the old R3F flow view.
2. ParaView-grade layers: surface Cp with lighting, **surface streaks (LIC)**, **Q-criterion vortex iso-surfaces** coloured by vorticity, wake planes at x/L = 1, 1.5, 2, clip and slice, probe-line plots, and a delta view between two runs (Cp difference).
3. A clean default: about 30 seed lines with a tube look, a dark studio floor, ACES tone mapping, and SSAO. Match the hero render's look.
4. Defaults to the best **accepted** run. Rejected runs carry a badge and are never the default.
5. Engineering panels: force build-up, Cd convergence with an acceptance gate, y+ map, mesh-quality heat map, and a grid-independence (Richardson) chart.
6. OSS to adopt: **trame/ParaView Web** (Apache/BSD) as the reference for layer UX; **OpenFOAM motorBike** tutorial settings; **FoamPilot** (MIT) run wizard and monitor; **F3D** (BSD) turntable video.

## 3. Race: broadcast quality
The screenshot shows blocky grey cars and an empty track.
1. Load **our real car GLB** (from the design) into the replay, with PBR paint and wheels that spin at the right speed.
2. A real F1 in Schools track: a 20 m lane with a start gate, finish gate, tether line, lighting and timing beams. Cameras: broadcast, chase, onboard and top.
3. Broadcast HUD: speed trace, delta to the ghost, mini-sectors, and a reaction-time panel. Use FastF1 (MIT) telemetry layouts as the model.
4. Charts: one theme across the app. ECharts for analysis, **uPlot** (MIT) for long time series (fast). Linked cursors across speed, acceleration, drag and thrust.
5. Monte Carlo spread with a histogram, tornado sensitivity, and "what wins races" ranking.

## 4. Analysis and charts: one quality bar
- One design token set for charts: neutral greys plus one accent, Inter/JetBrains Mono, no glow.
- Every chart gets units, an uncertainty band, a source badge (simulated / measured / synthetic) and an evidence link.
- Remove duplicate or low-value charts (see §7).

## 5. Innovation: highest level
1. **Closed design loop:** ORACLE → build123d parametric car → FORGE → CFD → ORACLE, with no hands needed. (Plan done; build next.)
2. **Multi-fidelity ORACLE:** coarse-mesh runs (cheap) plus fine runs (expensive) in one GP (co-kriging). This gets more designs per hour, and it's real research-grade.
3. **Adjoint sensitivity map** (`adjoint.py` exists): colour the car by "move this surface to cut drag" and show it on the CAD.
4. **Digital twin calibration** (`calibration.py` exists): real race times update the model (Bayesian), so predictions get sharper every race.
5. **Sealed prediction live** at the event: a QR code to the hash and a public verify page.
6. **Uncertainty everywhere:** CFD error from the grid study, plus thrust variance and mass, flowing through to the race-time band.

## 6. Open source to adopt (licence OK under our AGPL)
| Need | Project | Licence |
|---|---|---|
| CFD viewer UX | ParaView Glance / trame | BSD / Apache |
| CFD solver setup | OpenFOAM tutorials (motorBike) | GPL |
| Run wizard and monitor | FoamPilot | MIT |
| Renders and video | F3D | BSD |
| Parametric CAD | build123d (in use), CadQuery | Apache |
| Fast charts | uPlot | MIT |
| Telemetry layouts | FastF1 (patterns) | MIT |
| Layout | dockview | MIT |
| Evidence graph | xyflow | MIT |
| Adjoint (option) | SU2 | LGPL |

## 7. Remove (cuts clutter)
- The old R3F Flow view (replaced by vtk.js).
- The "Bands / Seeds 60% / Animate" toolbar clutter, replaced by one layer panel.
- Duplicate status badges ("Simulated" shown three times on one screen).
- Rejected runs as the default anywhere.
- Long "What-if" input stacks on Race: collapse them into presets plus an advanced drawer.

## 8. Build order (when usage allows)
1. India NF rulebook + FORGE measures + rule→CAD jump (§1)
2. Flow tab on vtk.js + clean defaults + accepted-run default (§2.1–2.4)
3. Race: real car GLB + track + HUD (§3.1–3.3)
4. Closed design loop (§5.1)
5. Chart theme and uPlot (§4, §3.4)
6. Multi-fidelity, adjoint map, calibration (§5.2–5.4)
7. FoamPilot wizard, dockview, xyflow
8. Full CHECKLIST.md QA, including the "connected" checks

---

## 9. UI quality bar: T3 Code / Linear / shadcn
Every page must pass this before it counts as done:
- **One job per screen.** One main view plus at most one side panel. No card grids or stacked sliders.
- **Quiet chrome.** Neutral greys, one accent used only for active or selected states, 1px hairline borders, no glow, no loud buttons. The primary action is white-on-dark (shadcn default), not cyan.
- **Type.** Inter for UI, JetBrains Mono for numbers; tabular numbers; 12–14 px UI text with clear hierarchy (title, value, unit, muted label).
- **Density like T3 Code / Linear.** Tight 8 px spacing grid, compact controls, keyboard shortcuts on everything (⌘K, tab keys).
- **Components only from shadcn/Base UI** (sheet, tabs, select, slider, tooltip, command, toast). No hand-rolled chrome.
- **Status shown once:** the provenance badge lives in the header only.
- **Charts:** one theme (ECharts/uPlot), units on every axis, uncertainty bands, source badge, hover tooltips with values.
- **Motion:** 150 ms ease-out, never decorative.
- **Empty, loading and error states** on every panel (skeletons, not spinners).
- **Responsive:** 1440 / 1024 / 375 px with no squashed panels.

## 10. Honest ratings and cuts
Full table in `RATINGS.md`. Overall today: about 5.5/10.
Cuts being done now:
- [x] Aero score "97" gauge → real CdA vs the design-space best
- [x] Old Flow view → 3D Flow (vtk.js) becomes Flow
- [x] Pit Wall Legal tab → removed (Design → Rules has it)
- [x] Loud cyan Present button → quiet
- [x] Duplicate "Simulated" badges → header only
- [x] Race what-if slider stack → collapsed behind "Advanced"
✅ Replay rebuild and Ghost controls merged into Replay are implemented; final acceptance remains. ⬜ Inspect-to-CAD side-panel merge remains.

## 11. All analysis (full list, ranked by points ÷ effort)
1. India NF compliance sheet (every rule, value, margin, penalty; printable)
2. Drag breakdown by part and by pressure vs friction
3. Run vs run comparison (ΔCp surface, Δwake, Δforces)
4. Grid independence (Richardson extrapolation, GCI)
5. Race-time sensitivity tornado (mass, CdA, thrust, rolling, reaction)
6. Adjoint drag map on the car surface
7. Prediction vs reality calibration over races
8. Wheel and wake study (Q-criterion vortex cores, wake deficit planes)
9. Mass budget vs the minimum mass rule
10. ms gained per mm changed (design-change value table)
11. Monte Carlo race-time distribution with p5–p95
12. ORACLE: GP uncertainty map, expected improvement map, benchmark vs random
13. Thrust curve fit and cartridge-to-cartridge variance
14. Start reaction statistics (mean, σ, distribution)
15. Convergence and acceptance audit per run (why accepted or rejected)

## 12. Open source map (from the 2026-11-02 search)
- Wind Tunnel: **trame + PyVista** (Apache) as the ParaView-grade engine; vtk.js/Glance (BSD) client side
- Race UI: f1-dash, F1 Replay Timing, f1-telemetry layouts (check licences); FastF1/OpenF1 chart conventions
- Charts: uPlot (MIT) + ECharts (Apache)
- UI kit: shadcn/ui templates on Tailwind v4 + Base UI (MIT)
- Reference sims: TUMFTM race-simulation / laptime-simulation
- Benchmark to beat: Synopsys/Ansys STEM Racing digital twin racetrack (commercial)

## 13. Race rebuild: open source to copy (searched and licence-checked 2026-11-02)
| Project | Licence | Stars | What we take | Fit |
|---|---|---|---|---|
| **pmndrs/racing-game** | MIT | 2.2k | **Our base.** Same stack (React Three Fiber + drei). Studio lighting and environment, PBR car shading, chase/broadcast cameras, speedometer HUD, minimap, ghost car, leaderboard, finish screen, post-processing | ★★★★★ copy the scene and HUD structure |
| **slowlydev/f1-dash** | AGPL-3.0 (same as ours) | 1.9k | Real F1 broadcast UI: timing tower, mini-sectors, gap charts, telemetry layout. Can copy code directly | ★★★★★ for the timing and telemetry panels |
| **pmndrs/postprocessing** | Zlib | 2.9k | Bloom, motion blur, SMAA, tone mapping: the "game" look | ★★★★ |
| **pmndrs/drei** | MIT | 10k | Environment maps, contact shadows, `Trail` for speed streaks, `PerformanceMonitor` | ★★★★ (already installed) |
| **BKcore/HexGL** | MIT | 1.8k | Speed-effect ideas: camera shake, FOV kick at launch, light streaks | ★★★ ideas |
| IAmTomShaw/f1-race-replay | **no licence** | 6.9k | Ideas only (replay controls, race-state UI). **Can't copy its code** | ★★ inspiration |
| Synopsys/Ansys STEM Racing digital twin racetrack | commercial | — | The benchmark to beat (realistic 20 m track) | target |

**What the rebuilt Race replay should feel like (EA F1 / TV broadcast):**
1. **Our real car**: the design's `display.glb` with team-colour PBR paint, wheels spinning from distance/radius and an illustrative launch puff (gas type unconfirmed).
2. **A real track**: the 20 m STEM Racing lane with tether line, start gate and lights, finish gate, timing beams, barriers, studio floor reflections and a crowd-free arena.
3. **Cameras**: TV broadcast pans, chase, onboard (nose cam), top-down and finish-line photo; auto-director cuts.
4. **Game-quality effects**: bloom, motion blur at speed, FOV kick at launch, light speed streaks, contact shadows.
5. **Broadcast HUD (f1-dash style)**: speed (km/h and m/s), gap to ghost, mini-sectors (purple/green/yellow with a legend), reaction time, finish time, and a "PREDICTED" vs "MEASURED" tag.
6. **Ghost and compare**: race two designs or predicted vs measured, with a split-screen delta trace.
7. **Photo finish and slow-mo replay** after each run; export a clip for the presentation.
8. **Performance**: `PerformanceMonitor` lowers effects on weak laptops; target 60 fps.

---

## 14. Charts: the look to aim for (searched 2026-11-02)
| Library | Licence | Stars | Use for |
|---|---|---|---|
| **ECharts** | Apache-2.0 | 67k | Main analysis charts: heatmaps (aero map), bar build-ups, tornado, histograms, 3D surface. Already installed |
| **uPlot** | MIT | 10.6k | Fast time series: residuals, telemetry (thousands of points at 60 fps), linked cursors |
| **Observable Plot** | ISC | 5.4k | Clean static figures for the PDF report (publication look) |
| **visx** (Airbnb) | MIT | 21k | Custom one-off visuals (timing tower bars, sealed-prediction band) |

**Chart quality rules (Formula 1 TV and engineering report style):**
- Dark plot area, a single accent per series, hairline grid at 6% opacity, no chart borders.
- Monospace tabular numbers; units in the axis title; SI units only.
- Every chart has a **source badge** (measured/simulated/synthetic), an **uncertainty band** where it applies, a **hover crosshair** with exact values, and **PNG/SVG export**.
- Linked cursors across charts on the same page (hover time on speed → the same time on thrust, drag and acceleration).
- Annotations for key events: launch, cartridge burn-out, peak speed, finish, rule limits as dashed lines.
- Colour maps: Cp = blue–white–red (diverging, centred at 0); speed = turbo/jet; never rainbow for diverging data.
- Animate in only on the first load (150 ms); no bouncing.

## 15. Best feature list per area (the target "final boss" state)
### Pit Wall
- A **race-week mission control**: next action, days to the event, rules at risk (points), best car, sealed prediction status.
- **Points dashboard**: the 1,000-point scoring broken down (Racing 250, D&E 180, Enterprise 180, Scrutineering 160, Verbal 140, PM 90) with our estimated score and the gaps.
- dockview layout the user can arrange; saved per person.
### Design Studio
- CAD with a **rule overlay**: failed rule = red part, at-risk = amber; click to see the dimension and the limit.
- **Design diff**: two designs overlaid with a deviation heat map (mm).
- **Parametric sliders** for ORACLE's 4 variables that regenerate the car live (build123d).
- **Mass and centre-of-gravity** estimate from the volumes × material density.
- **Manufacturing check**: minimum wall thickness, CNC tool reach, overhangs.
### Wind Tunnel
- Flow viewer (vtk.js now, trame later): surface Cp, LIC surface streaks, Q-criterion vortices, wake planes, probes, clip.
- **Run compare** (ΔCp, Δwake, Δforces) and a **drag build-up waterfall** by part.
- **Quality gate**: convergence, y+, mesh quality and grid independence (GCI), with a clear ACCEPTED/REJECTED reason.
- Run wizard (FoamPilot pattern) with live residuals and an ETA.
### Race
- The game-quality replay from §13: real car, real track, broadcast cameras, f1-dash HUD, ghost, photo finish.
- **Race-day mode**: big numbers, reaction-time entry, actual vs predicted, and an instant calibration update.
- Monte Carlo histogram plus a **tornado** chart, and "what wins" ranking.
### Evidence and reports
- xyflow **lineage graph** (design → mesh → run → result → prediction → race).
- PDF: India-rules compliance, run gallery, ORACLE story, sealed prediction proof, QR to verify.
- Presenter: auto-built deck from live data, speaker notes, timer.

## 16. Our own innovation ideas (thought through, ranked)
1. **Closed-loop autonomous design** (ORACLE → CAD → FORGE → CFD → ORACLE). The headline innovation.
2. **Multi-fidelity Bayesian optimisation**: coarse and fine CFD in one model; about 3× more designs for the same compute.
3. **Physics-informed race-time uncertainty**: CFD grid error + thrust variance + mass + reaction → a predicted race-time distribution, then a sealed prediction with a band we can defend.
4. **Live calibration (digital twin)**: every real race updates CdA and Crr posteriors; a "prediction error shrinking" chart over the season.
5. **Rule-aware optimisation**: ORACLE never proposes an illegal car (FORGE as a constraint in the acquisition function).
6. **Adjoint shape hints on the CAD**: arrows on the surface showing "push here −x mm → −y ms".
7. **ML surrogate (stretch)**: train a small model on our runs, plus transfer ideas from **DrivAerNet++** (8,000-car CFD dataset, MIT research; licence unclear, so check before use) for instant Cd guesses while designing.
8. **Verifiable science**: hash chain of evidence and a public verify page. Judges can check that nothing was edited.

## 17. Things that may be overbuilt or "too much": review, don't delete yet
| Item | Concern | Decision later |
|---|---|---|
| Full Chili3D CAD | Huge (~18 MB); the team may still design in Fusion/SolidWorks | Keep if we actually design in it; otherwise make it "view + small edits" |
| Two 3D stacks (R3F for Race, vtk.js for flow) | Two engines to maintain | Acceptable: each is best at its job |
| Race model M1/M2 toggle | Judges don't need M1 | Hide M1 under Advanced |
| Reaction trainer as a main tab | Fun but off-topic | Move into Race-day mode |
| ORACLE on 4 variables only | Small for a GP showcase; fine for the real car | Add variables only when the geometry generator exists |
| Evidence store complexity (typed records, references) | Heavy for a school team | Keep: it's our "verifiable science" story |
| Separate Telemetry/Spread/Ghost tabs | Too many thin tabs | Merge into Replay + Analysis |
| Photo renders and vtk.js viewer | Overlap | Renders for reports and slides, viewer for analysis |

## 18. Keep researching (instructions for any Claude working on this)
- Before building any feature, **search GitHub for an existing project**. Check the licence (`gh api repos/<owner>/<repo> --jq .license.spdx_id`); AGPL/GPL/MIT/BSD/Apache/ISC/Zlib are all fine; **no licence = ideas only**.
- Add every find to the tables above with its licence, stars and fit, then commit.
- Search ideas still open: OpenFOAM web GUIs, Rapier physics for the launch, STEM Racing world-champion portfolios (what judges reward), F1 TV graphics packages, broadcast timing fonts, Formula Student telemetry tools.

---

## 19. Deep analysis catalogue (high-level, data-driven outputs)
Each item lists **input → method → output (what the user sees) → decision it drives**. ★ = do first.

### A. Aerodynamics (from CFD)
1. ★ **Drag decomposition by part**: per-patch forces → % of drag from body / front wing / rear wing / wheels / cartridge, split into pressure vs friction → waterfall chart → "attack the biggest bar first".
2. ★ **Run vs run delta**: two runs → ΔCp on the surface, Δ wake deficit, Δ per-part drag → diverging surface map + table → "did this change actually help, and where?".
3. ★ **Grid independence / GCI**: 3 mesh levels → Richardson extrapolation and the Grid Convergence Index → Cd ± numerical error → "trust level" badge on every Cd.
4. **Wake survey**: velocity-deficit planes at x/L = 0.5, 1, 2 → momentum-deficit drag estimate (a cross-check against force integration) and wake area → contour plots.
5. **Vortex analysis**: Q-criterion / λ2 → vortex cores from the wheels and wing tips, with strength and location → "wheel wake dominates?".
6. **Surface flow topology**: wall shear stress → separation and reattachment lines, stagnation points → LIC plus marked lines → where flow separates.
7. **Pressure distributions along lines**: Cp along centreline and sections → line plots, compared between designs.
8. **Boundary-layer health**: y+ map, skin friction → mesh adequacy and transition hints.
9. **Ground effect and ride-height sensitivity**: runs at different heights → Cd vs height curve.
10. **Yaw / crosswind sensitivity** (stretch): small yaw angles → Cd(yaw).
11. **Speed sweep / Reynolds dependence**: 15–25 m/s runs → Cd vs Re → whether constant Cd is valid across the whole race.
12. **Frontal area vs Cd trade**: CdA = Cd × A → whether to shrink area or improve shape.

### B. Optimisation (ORACLE)
13. ★ **GP response surfaces**: mean and uncertainty maps for each variable pair → where the model is unsure.
14. **Variable importance**: GP length-scales and Sobol indices → "nose height matters 3× more than taper".
15. **Expected-improvement map and acquisition history** → why each run was chosen.
16. **Optimisation convergence**: best CdA vs runs, compared with random and Latin hypercube → the benchmark curve.
17. **Pareto front**: drag vs mass vs rule margin → the best legal trade-offs.
18. **Model validation**: leave-one-out predictions vs actual, with RMSE → how much to trust ORACLE.

### C. Race performance (physics model)
19. ★ **Race-time budget**: time lost to drag vs rolling vs mass vs reaction → stacked bar → where the milliseconds are.
20. ★ **Sensitivity tornado**: ±10% of each input → Δ race time → what to work on.
21. **ms per unit**: ms per gram, per cm² of CdA, per 0.001 Crr → a design-change value table for the verbal pitch.
22. **Monte Carlo distribution**: thrust variance, mass and reaction → p5/p50/p95 race time → the sealed-prediction band.
23. **Speed/acceleration/force traces**: thrust vs drag vs rolling over time → where drag overtakes thrust.
24. **Optimal mass study**: a heavier car is legal but slower → the minimum-legal-mass benefit.
25. **Track-length scaling**: times for 20 m vs other track lengths.
26. **Head-to-head win probability**: our distribution vs a rival's estimated time → P(win).

### D. Race-day and measured data
27. ★ **Predicted vs measured calibration**: each real run updates CdA and Crr (Bayesian) → posterior plots and shrinking error bars.
28. **Reaction-time statistics**: mean, σ, distribution and improvement over practice → reaction coaching.
29. **Car-to-car and lane variance**: lane A vs B, cartridge batch → is the difference real (t-test)?
30. **Outlier detection**: flags runs with timing errors or a bad launch.
31. **Season trend**: race times across events with annotations of design changes.

### E. Rules and scrutineering
32. ★ **Compliance margin map**: every India NF rule → measured, limit, margin, penalty → points at risk.
33. **Tolerance stack-up**: manufacturing tolerance (±0.2 mm) → probability each dimension ends up illegal → "make the wing 0.5 mm taller to be safe".
34. **Mass compliance**: material density × CAD volume → predicted mass vs the India NF 50 g minimum.

### F. Manufacturing and quality
35. **Measured vs CAD deviation**: scan or caliper measurements → deviation table/heat map → what manufacturing changed.
36. **Wall-thickness map** and **CNC reach check**.

### G. Project and team (Enterprise / PM points)
37. **Timeline of decisions** from the evidence log (design → run → change) → Gantt-style chart.
38. **Compute and effort log**: CFD hours, runs per week → project-management evidence.

## 20. "Full stadium" race timing view (F1 broadcast style)
What the big-screen timing page should show, inspired by F1 TV, f1-dash and STEM Racing world finals displays:
- **Timing tower** (left): position, car, best time, last time, gap to leader, interval, delta to prediction; colour codes purple = session best, green = personal best, yellow = slower (with a legend).
- **Mini-sectors**: 8 sectors per 20 m run with sector times and colours.
- **Reaction time** column with a green/amber/red threshold.
- **Speed trap**: peak speed and finish speed.
- **Race-pair view**: two lanes side by side, live gap, winner banner, photo-finish frame.
- **Event-wide leaderboard**: all teams' best times (manual entry or CSV), our position, gap to P1.
- **History strip**: every run today, as a sparkline of times.
- **Big-screen / TV mode**: full-screen, huge numbers, auto-rotates panels, works on a projector.
- **Prediction scoreboard**: predicted vs actual for every run, with a sealed-hash ✓/✗.
- Export the day as a PDF/CSV for the portfolio.

## 21. Output products (what the app produces for judges)
- **Engineering portfolio pack**: auto-generated PDF chapters (Aero, Optimisation, Race, Rules, Manufacturing) with figures from the analyses above.
- **Verbal-presentation deck**: live presenter slides with key numbers and one "wow" (the sealed prediction reveal).
- **Scrutineering sheet**: a printable compliance table with measured values.
- **Race-day report**: the times, calibration update and next actions.
- **Evidence appendix**: hash list plus a QR verify link.

## 23. Progress on main (updated 2026-11-02)
The next-wave changes were merged into `main` in `6d708b5`. The table tracks verified work and remaining orders; runtime checks are recorded separately from implementation.

| Order | Status | Done | Still missing |
|---|---|---|---|
| Honesty correction | ✅ Implemented | India NF T7.2.1 finding reproduced on `orbit_v2`: 33.00 mm front-wheel gap vs 38.00 mm minimum; pitch and checklist corrected ([evidence](../../evidence/STEP-1-india-honesty.md)) | Physical measurement and official scrutineering remain unverified |
| 1 India rulebook | 🟨 Partial | `rulebooks/stem-racing-india-nf-2025-26.yaml`, more rules measured, points at risk, scrutineering sheet (`forge_sheet.py`, `sheet.typ`), failed-rule links select and frame named CAD parts; responsive shell | Physical verification; feature-level measures tracked below |
| T20 FORGE v2 | 🟨 Partial | Axle layout measures retained; CAD cylinder rolling bands, sampled wing-section extremes, explicit named halo-notch arcs, rear-wing plane B location and rear overhang bound; hash-bound remeasurement sidecar + UI action | Halo absent/ambiguous features remain manual; continuous wing surfaces, contact geometry and physical tolerances still require verification |
| T22 drawing pack | 🟨 Partial | Design Studio Drawings tab exports all 13 C2.10.6 contents items as A4 vector PDF from original STEP; sections, exploded key, CAD extents, FORGE findings, team notes and review register | Local feature dimensioning, wing-boundary markup, missing named nose/tether geometry and team finish/decal annotations require engineering completion; DXF/SVG deviation importer and separate render pack remain |
| 2 Wind Tunnel analysis | 🟨 Partial | Analysis API (`api/analysis.py`) | Drag by part, compare runs, grid independence, wake/vortex layers |
| 3 Race replay rebuild | 🟨 Built core; acceptance pending | Correct Z-up GLB conversion and leading-point placement; PBR car/wheel motion, studio track, tether/start/sector/finish details, six camera modes, adaptive reflections/effects, cursor timing, comparison controls, photo-finish slow motion and PNG capture | Hardware 60 fps verification, final 1024 px pass and broader final QA; no measured reaction data supplied |
| 4 Race analysis | 🟨 Partial | Time budget, tornado chart, exchange rates, Breakdown tab, Energy panel (`raceanalysis.py`, `energy.py`) | Stadium timing / TV mode |
| 5 Closed loop | 📝 Local draft; deferred behind reuse backlog | Local `parametric.py` draft builds a valid 11-solid study assembly using baseline extents and the four ORACLE variables; not wired into the app or committed yet | Constraint-filtered recommendation, build-next API, Design/evidence records, Pit Wall actions, CFD-job integration and accepted-result feedback |
| 6 Calibration | 🟨 Partial | Bayesian calibration (`bayes_calibration.py`), bigger Monte Carlo | Calibration UI, uncertainty maps |
| 7 Remaining | 🟨 Partial | Project page (`app/project`), clean-up (old flow viewer deleted, knip passes) | Run wizard, dockview, evidence graph, judge outputs |

### Owner handoff checkpoint — 2026-11-02

Historical pause checkpoint, subsequently resumed; retained for handoff context. The owner resumed work with an open-source-first priority; see §26.

**Five pieces committed and pushed to main in this session:**
1. `adae52a` — Replace the UK pitch/checklist example with the reproduced India NF front-wheel-gap finding.
2. `7d18bd8` — Failed-rule links select/frame named CAD parts; responsive shell and honest rule-loading states.
3. `a596d63` — FORGE CAD features, hash-bound remeasurement, rear-wing placement checks and honest estimate states.
4. `7401273` — Thirteen-item A4 drawing-draft generator and Design Studio export form.
5. `e2a574b` — Real-car replay rebuild, coordinate correction, camera director, comparison timing and photo-finish controls.

**Current local draft:** `src/daedalus/parametric.py` is intentionally uncommitted. It constructs 11 valid CAD solids with baseline dimensions (214.63 mm length excluding cartridge, 74.34 mm width, 46.57 mm height). Only the standalone assembly was checked; import/FORGE integration and the closed-loop endpoint are unfinished. Do not call this a legal or production-ready car. The formal pipeline must keep absent halo/load/manufacturing evidence manual and feed back only scientifically accepted CFD results.

**Verification and limits:** Focused FORGE checks (20) and existing race-math checks (10) passed, alongside TypeScript and changed-file lint checks. Replay was viewed at 1440 × 900 and 375 px; the narrow page had no horizontal overflow. Full-suite/final visual QA, 1024 px review and physical-Mac 60 fps verification remain. No CFD campaign ran. Both API and frontend were stopped after review. Per owner direction, implementation and cleanup take priority over repeated testing.

**Drawing artifact:** `output/pdf/daedalus-orbit-v2-engineering-draft.pdf` is a local working example. The generator includes all 13 required contents items, but local chamber/bore dimensions, wing-boundary markup, missing named geometry and team finish/decal details still need engineering completion. It is not submission-ready.

**Extras beyond the orders:**
- Beam-strength FEM (`structure.py`, StrengthPanel)
- Test planner with coast-down tests (`testplan.py`)
- Racing-points objective (`outcome.py`)
- Legal-frontier map
- RFC 3161 timestamps for the sealed prediction (`anchor.py`)
- Evidence notes in `evidence/`

**Next priority:** Finish Order 5 (closed loop), then Order 2 (Wind Tunnel analysis), stadium timing / TV mode, calibration UI, Order 7 and consolidated final QA.

---

## 22. India NF 2025-26: what the real rules say, and the next wave

Added 2026-11-02 after reading both India NF PDFs (Technical and Competition Regulations). Hashes are in `rulebooks/stem-racing-india-nf-2025-26.yaml`.

### 22.1 Done in this pass
- 🟨 Source PDFs were read from Downloads and hashes recorded in the rulebook. Correction at this handoff: `data/reference/rules/india_nf_2025_26/` currently contains no PDFs; source archival/evidence registration remains.
- ✅ Current rulebook `rulebooks/stem-racing-india-nf-2025-26.yaml`: **80 entries** (38 general, 31 performance, 11 safety) with page, limits, penalty and class. Supported layout and CAD features compute when the design contains the required metadata; estimates and unavailable features remain manual/risk. Coverage varies by design; see §23.
- ✅ `api/forge.py` loads the India rulebook. The UK reference file stays in the repo for comparison.

### 22.2 What the real rules change

| # | Finding | Where | What to do |
|---|---|---|---|
| 1 | **The Innovation Award is one criterion:** Verbal Presentation > Innovation, out of 20. Top band: "Excellent innovations related to competition elements, or other aspects with high positive project impact". Collaboration (/20) is a separate award, and the R&D Award comes from Computer Aided Analysis + R&D + Testing. | C13.3, Awards Matrix p39, scorecard p45 | Build the innovation story around measurable project impact. |
| 2 | **FEA is wanted.** Design & Engineering "Application of Computer Aided Analysis" (/20) top band: "Proven design improvements made based on FEA/CFD study". Testing (/20) wants virtual and physical evidence on the assembled car and components. | Scorecard p41 | T21 below. The physical load tests in the rules (halo, wheel, tether guide) are natural FEA cases. |
| 3 | **Rear wing height D8.5 does not exist in India NF.** T9 has only overhang height <= 65.0 mm and wing height deviation <= 15.0 mm. The "rear wing 34.4 mm vs 35 mm" catch in `docs/innovation.md` and `CHECKLIST.md` comes from the UK reference book. | T9.4.3, T9.5.4 | Replace that example with a real India NF finding before presenting. |
| 4 | **Minimum mass is 50.0 g** (the UK reference said 60). Underweight costs 10 pts/g, and officials add ballast at 0.2 g per 0.1 g underweight (double). Ballast is allowed only in the container under the halo. | T3.6, T1.22, T4.2 | Target 50.0 g plus a measured scale margin; mass is a hard constraint, not a free variable. |
| 5 | **Performance rules decide eligibility.** A failure makes the car ineligible for Fastest Car and Best Engineered Car, and failing on both cars seeded in the top 16 means automatic round-one elimination. | C3.6.2 | Treat the 30 performance rules as hard constraints in the optimiser (T3.3, T3.6, T4.2, T4.4.1, T5.6, T7.2-T7.11, T8.6-T8.8, T9.5-T9.7). |
| 6 | **Racing points are formulas.** Reaction (105): top three get 105/100/95, others get 5 + 90/(Base - fastest) x (Base - own best), Base = 120% of third fastest. It uses TOTAL race time (car time plus reaction). Knock-out (135): eliminated in round of 16 / 8 / quarter / semi = 26 / 52 / 85 / 106, winner 135. Fastest car bonus 10. | C9.5, C9.6 | T15: optimise expected points, not mean time. |
| 7 | **Cartridge.** T1.20 says "compressed air"; C9.12 says "compressed gas". Supplied by the organisers, kept at 21 C, weighed within 0.5 g. Full pack 28.9-29.4 g, 65 mm long, 18 mm diameter. | T1.20, C9.12, Appendix vi | Confirm the gas before building the thrust model (T18 assumed CO2). |
| 8 | **Tether is 0.6 mm monofilament**, fixed at the finish, over one pulley at the start. Track is 20 m. | C9.10.1 | Re-set the tether friction prior; the Australian rules used a 0.2 mm braid. |
| 9 | **Originality.** "All design work, text and scripting ... must be wholly undertaken and created by the team", including CAD, CAM, portfolio and graphics. An Originality Declaration is part of registration, and plagiarism can be penalised or excluded. There is no statement about AI tools or software-generated designs. | C2.9.2, C2.16, T2.10 | Ask the organisers for a text clarification (allowed under C2.6.2 and T2.2.2; design-compliance rulings are not, T2.6). Keep evidence of the team's own authorship and understanding of every part. |
| 10 | **The drawing pack is 60 scrutineering points** (drawings /20, 3D renders /20, finish and assembly /20) and has a mandatory 13-item contents list, plus 5-pt penalties for missing identification (T4.3, T7.12.2, T8.1, T9.1). | C2.10.6, p40, p53 | T22: generate it from the CAD. |
| 11 | **Halo and helmet are fixed standard parts** that must appear unmodified. The halo pocket is cut with a 6.35 mm ball-nose tool to 3.175 mm depth; the pocket bottom is 24.0 mm above the track and the notch centre 34.0 mm +/- 1.0 mm. | T4.4, T1.21, Appendix ix | Include the halo in every CFD geometry. |
| 12 | **Points:** specification and scrutineering 160, design and engineering 180, project management 90, enterprise 180, verbal presentation 140, racing 250. Total 1000. | C3.5 | Use these weights in the score checklist (section 1.5). |

Inconsistencies in the source documents to raise with the organisers (competitions@stemplify.com): compressed air vs gas (T1.20 vs C9.12); verbal presentation split 60/40/40 in C3.5 but 40/40/60 on the scorecard; automatic vs manual launch in C9.1 vs C9.4 and C9.7.2; Appendix iii numbers the front wing rules T8.5.x instead of T8.6.x; T4.4.5 halo load "to be reviewed".

### 22.3 Next-wave tasks

Build order is roughly top to bottom. "Needs" lists what the code cannot work without: real CFD runs, thrust measurements, race runs, photos or video. Unavailable data uses an honest empty/manual state; estimates and synthetic examples are labelled explicitly.

| ID | Build | Task | Depends on | Needs |
|---|---|---|---|---|
| T15 | 🟨 Partial | **Outcome objective.** Expected racing points from the C9.5/C9.6 formulas, knock-out win probability, tail risk (CVaR), and a two-car portfolio choice per round. Replaces the drag-only objective in ORACLE. | montecarlo | field model for opponents (T28) for real numbers |
| T16 | 🟨 Partial | **Third-party timestamps for sealed predictions** (RFC 3161 or a witnessed public hash). | predictions | network access to a timestamp authority |
| T17 | 🟨 Partial | **Bayesian calibration** with information gain per term, model offset vs noise, and out-of-sample validation. Ported from the older repo. | calibration, montecarlo | real runs on varied conditions (mass, density) |
| T18 | ⬜ Remaining | **Cartridge thrust model** from the gas thermodynamics at 21 C. | gas type confirmed (22.2 #7) | measured thrust curves |
| T19 | ✅ Built | **Energy-loss audit:** where every joule of thrust went. | dynamics | none |
| T20 | 🟨 Partial | **FORGE v2:** build the missing measures (height, wheelbase, wheel diameter and width, clearance, overhangs, wall thickness, chamber, halo notch, wing thickness), pass probability from the manufacturing spread, and live "points at risk". | geometry, rulebook | measured part spread |
| T21 | 🟨 Partial | **Structural analysis.** Start with beam FEM (numpy) on the wings, axle and halo; model the rules' own load tests (halo 1 kg, wheel 100 g, tether guide 200 g). Add 3D FEA with CalculiX when installed. | geometry | material properties of the real block, resin or foam; solver install for 3D |
| T22 | 🟨 Partial | **Engineering drawing pack generator:** the 13-item contents list from build123d (orthographic with dimensions, exploded view, virtual cargo highlighted, sections), plus a 2D drawing importer (DXF, SVG) with a deviation check against the rebuilt 3D model. | geometry | a sample drawing to test the importer |
| T23 | 🟨 Partial | **Test planner:** which physical test (mass ballast, air density, track length) most reduces the calibration uncertainty. | T17 | none |
| T24 | ⬜ Remaining | **Gradient-enhanced and multi-fidelity ORACLE** (adjoint gradients, quick and final meshes in one GP). | T05 adjoint, T10 | working adjoint |
| T25 | ⬜ Remaining | **Free-form adjoint shape optimisation** inside the FORGE constraints. | T05, T20, CFD | accepted CFD runs |
| T26 | ⬜ Remaining | **Exhaust base-bleed study:** thrust and wake as one design problem (research, may be negligible; check T3.3 and T5.6 first). | T18, CFD | compressible CFD, gas confirmed |
| T27 | ⬜ Remaining | **Physical-in-the-loop optimiser** with a model-discrepancy term. | T15, T17 | several real runs |
| T28 | ⬜ Remaining | **Field intelligence** from public portfolios and results: where winners sit in design space. | none | curated public data, cited |
| T29 | 🟨 Partial | **Legal-frontier map:** the edge of the rule-feasible design space, with rule and page for every boundary. | T20 | none |
| T30 | ⬜ Remaining | **Virtual scrutineer from photos:** rule dimensions with uncertainty. | T20 | photos with a scale reference |
| T31 | ⬜ Remaining | **Video test lab:** trajectory, wobble and snag detection from phone video. | T17 | video |
| T32 | ⬜ Remaining | **As-built twin:** photogrammetry of the finished car back into the prediction. | T20, CFD | photo scan |
| T33 | 🟨 Partial | **Project twin:** Monte Carlo schedule and budget risk tied to engineering evidence, mapped to the 90-point project management scorecard. | none | the team's plan |
| T34 | ⬜ Remaining | **Red-team mode, V&V dossier, post-event regret report.** | T10, T17 | CFD and runs |
| T35 | ⬜ Remaining | **Community calibration** across teams. | T17 | other teams |

### 22.4 Questions for the organisers
1. Are software-generated geometry or AI-assisted code acceptable under C2.9.2 and C2.16, and what must be declared?
2. Is the power unit cartridge compressed air or CO2?
3. Is racing launched in manual driver-reaction mode or automatic mode (C9.1 vs C9.4, C9.7.2)?
4. Which Verbal Presentation split applies: 60/40/40 (C3.5) or 40/40/60 (scorecard)?


## 24. Whole-plan checklist and completion score — 2026-11-02

This is the current implementation ledger for all T01–T35 tasks. Earlier feature catalogues describe targets and repeat some work; do not add those duplicates to the percentage. T01b is a subtask of T01. The paused closed-loop draft does not earn a separate completed task.

**Legend:** ✅ scoped implementation present · 🟨 some implementation, material work remains · ⬜ remaining · 📝 local draft. A build tick does not change the task board to reviewer-accepted or tick the final QA checklist. These statuses are based on the current source and recorded evidence, not a fresh full-product acceptance audit.

**Whole expanded plan: 37% checklist score.** Three built tasks + twenty partial tasks + twelve remaining tasks. Calculation: `(3 × 1 + 20 × 0.5 + 12 × 0) / 35 = 37.1%`.

**Original core T01–T14: 54% checklist score.** Two built + eleven partial + one remaining: `(2 + 11 × 0.5) / 14 = 53.6%`.

Partial tasks receive a fixed half-point for a simple, reproducible tally; this does not mean each is halfway through its engineering effort. These are rough scope-completion indicators, not estimates of hours left, judging points or competition readiness. Broad research/stretch tasks T24–T35 are included in the 37% denominator.

| ID | Task | Build | What is present / what remains |
|---|---|---|---|
| T01 | CFD accuracy and acceptance | 🟨 Partial | Rotating-wheel / moving-ground case and acceptance tooling; accepted current-car CFD and scientific review remain. |
| T02 | Durable job queue and launch UI | ✅ Built | Queue, worker, logs, cancellation/recovery, API and launch UI implemented; reviewer acceptance remains. |
| T03 | Grid study and speed sweep | 🟨 Partial | Study tooling exists; actual accepted multi-mesh/speed campaigns remain. |
| T04 | Flow insight export | 🟨 Partial | Field/export tooling exists; full catalogue and accepted-source validation remain. |
| T05 | Adjoint sensitivity | 🟨 Partial | Tooling exists; accepted primal, adjoint result and connected sensitivity map remain. |
| T06 | Wind Tunnel experience | 🟨 Partial | vtk.js surface, streamlines and slices connected; advanced layers, compare and quality UX remain. |
| T07 | Design Studio | 🟨 Partial | Real CAD import/save, inspection and rule focus; deeper integration and final acceptance remain. |
| T08 | TITAN race experience | ✅ Built | Telemetry, what-if/presets, uncertainty band, real-car replay and comparison implemented; final QA/performance remain. |
| T09 | Imports, units and calibration | 🟨 Partial | Import/unit/calibration foundations; complete calibration UI and measured validation remain. |
| T10 | ORACLE optimisation | 🟨 Partial | GP/EI, synthetic benchmark and Pit Wall implemented; constrained CAD/CFD loop and full objective remain. |
| T11 | FORGE rules and inspections | 🟨 Partial | India rulebook, CAD states/margins and sheet; measured inspections and full coverage remain. |
| T12 | ATLAS evidence | 🟨 Partial | Store, hashes, timeline and verify exist; lineage graph and complete action linkage remain. |
| T13 | Competition mode, report and AR | 🟨 Partial | Presenter and Typst report exist; complete judge pack, public verification/AR scope remain. |
| T14 | Final app polish | ⬜ Remaining | Consolidated responsiveness, accessibility, performance and acceptance pass remains. |
| T15 | Racing-points objective | 🟨 Partial | Outcome core and API exist; ORACLE objective integration and opponent evidence remain. |
| T16 | Third-party prediction timestamps | 🟨 Partial | RFC 3161 core and API exist; real authority token and full UI workflow remain. |
| T17 | Bayesian calibration | 🟨 Partial | Bayesian core exists; measured-data workflow, uncertainty UI and held-out validation remain. |
| T18 | Cartridge thermodynamic thrust model | ⬜ Remaining | Organiser gas confirmation and measured thrust curves remain. |
| T19 | Energy-loss audit | ✅ Built | Energy model, API and Race Energy panel connected; final review remains. |
| T20 | FORGE v2 | 🟨 Partial | Added rolling bands, sampled sections, named-notch logic and remeasurement; missing features and tolerance probabilities remain. |
| T21 | Structural analysis | 🟨 Partial | Beam FEM, API and Strength panel exist; material validation and 3D FEA remain. |
| T22 | Drawing pack and drawing importer | 🟨 Partial | 13-item A4 draft generator/UI implemented; detailed annotations, DXF/SVG deviation importer and render pack remain. |
| T23 | Test planner | 🟨 Partial | Information-gain/coast-down planning core and API exist; complete UI and physical validation remain. |
| T24 | Gradient / multi-fidelity ORACLE | ⬜ Remaining | Combined gradient and multi-fidelity optimisation remains. |
| T25 | Free-form shape optimisation | ⬜ Remaining | Constraint-aware free-form optimisation remains. |
| T26 | Exhaust base-bleed study | ⬜ Remaining | Gas confirmation, compressible study and evidence remain. |
| T27 | Physical-in-the-loop optimiser | ⬜ Remaining | Measured trials and discrepancy-aware optimiser remain. |
| T28 | Field intelligence | ⬜ Remaining | Cited competitor portfolio/result dataset and connected analysis remain. |
| T29 | Legal-frontier map | 🟨 Partial | Margin-ranking/backend foundation exists; complete interactive map remains. |
| T30 | Photo scrutineer | ⬜ Remaining | Scale-aware image measurements and uncertainty workflow remain. |
| T31 | Video test lab | ⬜ Remaining | Trajectory, wobble and snag analysis workflow remains. |
| T32 | As-built twin | ⬜ Remaining | Measured scan/photogrammetry-to-model workflow remains. |
| T33 | Project twin | 🟨 Partial | Project forecast backend and Project workspace exist; scorecard completeness and final validation remain. |
| T34 | Red-team / V&V dossier | ⬜ Remaining | Integrated red-team and post-event reports remain. |
| T35 | Community calibration | ⬜ Remaining | Cross-team calibrated-data workflow remains. |

**New work landed in this session:** ✅ India honesty correction; ✅ failed-rule CAD selection/focus; 🟨 FORGE v2 feature expansion; 🟨 13-item drawing draft; 🟨 replay rebuild pending final acceptance; 📝 closed-loop generator draft only. Details and commit IDs are in §23.

## 25. Open-source reuse audit — what was actually used

The requested named projects were used to different extents. The replay is a custom integration around our data; it is not a wholesale copy of the racing-game scene/HUD or the f1-dash application. Full-project adoption for the remaining named tools has not happened.

| Requested source | Actual use | Extent / remaining gap |
|---|---|---|
| Chili3D | Full pinned upstream CAD build, patched and rebuilt; import/save and focus bridge use our STEP designs | ✅ Real upstream app integration; not a replacement CAD kernel written here |
| pmndrs/racing-game | Inspected pinned `App.tsx` and `effects/Cameras.tsx`; adapted camera/light setup patterns | 🟨 Selected adaptation. Straight-track camera control, HUD, track, wheel pivots and photo-finish glue are our implementation; full scene/HUD not ported |
| slowlydev/f1-dash | Small direct adaptation of MiniSector status mapping/styling; LeaderBoard/DriverGap layout references | 🟨 Selected adaptation. Timing calculations and data connection use our race traces; full dashboard not copied |
| pmndrs/postprocessing | Installed package through `@react-three/postprocessing`, with actual SMAA and Bloom components | ✅ Library reuse for those effects; motion blur and clip export remain |
| pmndrs/drei / React Three Fiber | Actual renderer, reflector material, performance monitor and Stats components | ✅ Library reuse; measured 60 fps target remains unverified |
| build123d + OpenCascade | Actual STEP import/export, solids/features, section geometry and polygonal hidden-line projection | ✅ Library reuse. Drawing generator and local parametric-study draft are our code using those APIs |
| Ax / BoTorch / Optuna | Not adopted in the current ORACLE core; it uses a custom NumPy/SciPy GP and expected improvement | 🟨 Open-source numerical libraries are used, but this is not an Ax/BoTorch integration |
| Typst | Actual PDF compiler/templates for reports, rule sheet and drawing draft | ✅ Library reuse |
| vtk.js / PyVista / OpenFOAM | Existing viewer/render/solver dependencies retained | 🟨 Core integrations exist; complete advanced layers and accepted campaigns remain |
| trame, FoamPilot, F3D, uPlot, FastF1, dockview, xyflow, SU2 | Not newly adopted during this build pass | ⬜ No claim that these integrations are complete; existing ECharts/PyVista/custom GP remain in use |

Licences were checked before replay-source use, pinned source references were recorded, and retained MIT/AGPL licence texts were added. See [THIRD_PARTY.md](../../THIRD_PARTY.md), [replay references](references/ORDER-3.md), and [drawing references](references/T22.md). No code from a repository without a licence was copied in this session. Planned source lists are not proof of adoption.

### 25.1 Reuse shortfall and exact continuation instructions (pre-resume snapshot)

**Owner's instruction:** reuse as much suitable, licensed open-source implementation as possible. The previous build pass fell short of that instruction: Codex used racing-game mainly as a reference and wrote more custom replay code than requested. This was an implementation choice, not a licence restriction. Existing functionality is saved; this note does not claim the missing adoption has been completed.

| Area | What was actually taken | What was not taken / what was written here |
|---|---|---|
| racing-game scene and environment | Camera/light setup patterns from pinned `App.tsx` and `effects/Cameras.tsx` | Full scene composition and environment setup were not ported. `scene/Track.tsx`, track/gate/tether/sector geometry and scene assembly in `RaceTrackScene.tsx` were written here. No upstream track or vehicle assets were imported. |
| racing-game camera system | Camera-mode ideas and setup patterns | `scene/BroadcastRig.tsx` uses a custom telemetry-driven dolly, chase, onboard, top, finish framing and director. The upstream camera components were not copied wholesale. |
| racing-game car/vehicle implementation | Existing R3F/drei libraries | Upstream `Vehicle`, `Chassis`, `Wheel`, Cannon physics, input controls and vehicle assets were not adopted. `scene/ReplayCar.tsx` clones our STEP-derived GLB, assigns materials and creates wheel pivots locally. Vehicle-driving physics would require a fit review because our motion comes from TITAN traces. |
| racing-game HUD and finish UI | General scene/HUD references | Upstream speed gauge, clock, minimap, checkpoint, leaderboard and finished-screen components were not ported. `RaceReplay.tsx` HUD, transport, photo-finish controls and still-capture glue were written here. These are the main candidates for a reuse-first review. |
| f1-dash timing | A small MiniSector status-colour/style adaptation in `timing/MiniSectors.tsx`; inspected LeaderBoard and DriverGap layouts | Full `LeaderBoard`, `DriverGap`, `DriverMiniSectors`, driver rows, data stores and timing dashboard were not ported. `TimingTower.tsx` and our trajectory-based gaps/completion/ranking remain custom. The broader requested timing-component adoption is incomplete. |
| Postprocessing | Actual installed SMAA and Bloom components; Three tone mapping | No upstream racing-game postprocessing module was ported. Motion blur, FOV kick, speed trails and video-clip export were not implemented. |
| drei / R3F | Actual Canvas, frame hooks, reflector material, PerformanceMonitor and Stats | These library components are reused directly. The track arrangement, adaptive-quality wiring, illustrative launch puff and replay orchestration are custom. |
| Chili3D | Full pinned upstream application, rebuilt with our patch | Our import/export/focus bridge and cockpit messaging are custom integration code. The CAD kernel and editor were not rewritten. |
| Drawing pack / FORGE features | Actual build123d/OpenCascade geometry APIs, polygonal hidden-line machinery and Typst compiler | `drawings.py`, drawing template/form, feature-selection logic, wing sampling, sidecar/hash checks and FORGE glue were written here. No complete upstream engineering-drawing application or rule engine was imported. |
| ORACLE and parametric family | Existing NumPy/SciPy and build123d libraries | The current GP/EI implementation is custom; Ax/BoTorch/Optuna were not integrated. The uncommitted `parametric.py` study family was written here, not copied from bitbybit or another car generator. bitbybit car-part ideas have not yet been researched/adopted for this draft. |
| Remaining named tools | Existing vtk.js, PyVista, OpenFOAM and ECharts integrations retained | trame/ParaView Web, FoamPilot wizard/monitor, F3D turntables, uPlot telemetry, FastF1 layouts, dockview, xyflow, SU2/DAFoam and PyGeM were not newly integrated in this pass. CadQuery was not added as a second CAD pipeline. OpenFOAM tutorial adoption was not newly audited in this pass. |

**Continuation checklist — still open:**
- [ ] Resume from the current checkpoint and existing reference notes. Do not reread the entire repository or restart completed work; inspect the specific upstream and local files needed for the next change.
- [ ] Before more custom replay work, inspect the actual licensed racing-game scene/HUD components and f1-dash timing components for direct reuse. Prefer adapting working components over recreating their functionality.
- [ ] Record the upstream commit, original paths, retained licence notices and destination paths for each copied/adapted component.
- [ ] Connect reused components to our real designs, telemetry, jobs and evidence. Remove foreign branding/demo data; retain honest loading/empty/error states and provenance.
- [ ] For each component left custom, record the concrete compatibility reason. Do not describe an inspected reference or installed package as a full application port.
- [ ] Review whether any suitable newly written components should be replaced by upstream adaptations. Preserve working behaviour until its replacement is connected and reviewable; do not delete the current implementation wholesale.
- [ ] Continue the remaining build order, prioritising implementation and cleanup. Batch focused checks around completed changes; leave broad QA and heavy CFD to the agreed final phase.

Historical note: the owner subsequently resumed implementation. Current work is tracked in §26.


## 26. Open-source-first resume — 2026-11-02

Owner resumed implementation, prioritising suitable prebuilt open source, fast completion of partial work and high-quality UI. Do not restart the repository audit; use the existing checkpoint and inspect only files needed for each integration.

### Reuse pass 1 — imported replay/timing components

- [x] Clone the actual licensed upstream sources to temporary directories and pin revisions.
- [x] Import/adapt racing-game's speed-gauge SVG and Score/Scores/Finished result structure; replace upstream physics/store/auth inputs with our telemetry props.
- [x] Import/adapt f1-dash DriverTag, DriverGap, DriverLapTime and full DriverMiniSectors presentation. Replace its F1 feed/settings dependencies with typed model-data adapters.
- [x] Connect imported components to selected car names, trajectory-derived speed, finish times, gaps and eight actual sector durations.
- [x] Preserve MIT/AGPL notices and record source-to-destination mapping below. TypeScript passes; changed-component lint has no errors (upstream static-index warnings remain). Consolidated visual QA remains.
- [ ] uPlot telemetry renderer (package installed; not yet connected at this checkpoint).
- [ ] React Flow evidence lineage (package installed; not yet connected at this checkpoint).

| Upstream revision / original path | Destination | Adaptation |
|---|---|---|
| racing-game `7816a5d`, `src/ui/Speed/Gauge.tsx` | `components/race/upstream/SpeedGauge.tsx` | Original SVG background/foreground paths retained; telemetry props, SI/km/h units, unique SVG IDs and cockpit styling |
| racing-game `7816a5d`, `src/ui/LeaderBoard.tsx` + `src/ui/Finished.tsx` | `components/race/upstream/ReplayResults.tsx` | Score/Scores and finish-result structure; model results replace Supabase/auth/medal assets |
| f1-dash `d21607a`, `dashboard/src/components/driver/DriverTag.tsx` | `components/race/timing/DriverTag.tsx` | Lane tags and cockpit tokens |
| f1-dash `d21607a`, `dashboard/src/components/driver/DriverGap.tsx` | `components/race/timing/DriverGap.tsx` | Typed local feed shape; our trajectory/finish gaps with units |
| f1-dash `d21607a`, `dashboard/src/components/driver/DriverLapTime.tsx` | `components/race/timing/DriverLapTime.tsx` | Current progress/finish and best comparison, without fabricated personal-best history |
| f1-dash `d21607a`, `dashboard/src/components/driver/DriverMiniSectors.tsx` | `components/race/timing/DriverMiniSectors.tsx` | Full sector presentation; eight equal-distance sectors in a compact grid; local adapter replaces settings/data stores |

**Fit decisions:** Racing-game's road-course GLB, Cannon driving physics, keyboard/audio controls and Supabase authentication are not imported: the required product is a straight STEM track replaying TITAN results, not an interactive road-driving game or a foreign score service. The real car, domain-specific track geometry and trajectory interpolation remain. This is component reuse, not a claim that the complete upstream applications were imported.

## 24. Scope decision (2026-11-02): cut list
**Do NOT build these** (camera/hardware/external-data features, not needed):
- T30 virtual scrutineer from photos
- T31 video test lab (wobble/snag from phone video)
- T32 as-built twin / photogrammetry
- T35 community calibration across teams
- T28 competitor/field intelligence scraping
- T26 exhaust base-bleed study
- AR car view

**Everything else stays in scope and gets built.** Open source: add SALib (Sobol/Morris sensitivity); CalculiX only with real material data; skip BoTorch, OpenMDAO, trame.
