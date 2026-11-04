# Master plan: feature and analysis checklist (2026-11-03)

The goal: every screen at commercial quality, every rule checked, every feature connected, and innovation the judges can't miss. **Build in progress. Current per-area feature ticks and all 43 analysis/chart targets: §28. Current scope: TODO.md. §24 is a historical task score, not the current completion percentage. Open-source reuse audit: §25; researched candidates: references/OSS-LANDSCAPE-2026-11-03.md.**

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

## 15. Best feature list per area (targets; live ticks in §28)

**Current built/partial/missing/removed checklist: §28 A–M.** The target prose below is not a completion claim; TODO.md scope overrides older targets.
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
- Flow viewer (animated Three.js plus existing field parsing/analysis; trame excluded): surface Cp, LIC surface streaks, Q-criterion vortices, wake planes, probes, clip.
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
2. ✂ **Multi-fidelity Bayesian optimisation — removed by current TODO; do not build.**
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

## 19. Deep analysis catalogue (targets; 43 live chart statuses in §28 K)
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

**Current ticks: §28 C.** Replay timing exists; the dedicated event/TV system is not built.
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
| 5 | **Performance rules decide eligibility.** A failure makes the car ineligible for Fastest Car and Best Engineered Car, and failing on both cars seeded in the top 16 means automatic round-one elimination. | C3.6.2 | Treat the listed performance clauses as hard constraints in the optimiser (T3.3, T3.6, T4.2, T4.4.1, T5.6, T7.2-T7.11, T8.6-T8.8, T9.5-T9.7). |
| 6 | **Racing points are formulas.** Reaction (105): top three get 105/100/95, others get 5 + 90/(Base - fastest) x (Base - own best), Base = 120% of third fastest. It uses TOTAL race time (car time plus reaction). Knock-out (135): eliminated in round of 16 / 8 / quarter / semi = 26 / 52 / 85 / 106, winner 135. Fastest car bonus 10. | C9.5, C9.6 | T15: optimise expected points, not mean time. |
| 7 | **Cartridge.** T1.20 says "compressed air"; C9.12 says "compressed gas". Supplied by the organisers, kept at 21 C, weighed within 0.5 g. Full pack 28.9-29.4 g, 65 mm long, 18 mm diameter. | T1.20, C9.12, Appendix vi | Confirm the gas before building the thrust model (T18 assumed CO2). |
| 8 | **Tether is 0.6 mm monofilament**, fixed at the finish, over one pulley at the start. Track is 20 m. | C9.10.1 | Re-set the tether friction prior; the Australian rules used a 0.2 mm braid. |
| 9 | **Originality.** "All design work, text and scripting ... must be wholly undertaken and created by the team", including CAD, CAM, portfolio and graphics. An Originality Declaration is part of registration, and plagiarism can be penalised or excluded. There is no statement about AI tools or software-generated designs. | C2.9.2, C2.16, T2.10 | Ask the organisers for a text clarification (allowed under C2.6.2 and T2.2.2; design-compliance rulings are not, T2.6). Keep evidence of the team's own authorship and understanding of every part. |
| 10 | **The drawing pack is 60 scrutineering points** (drawings /20, 3D renders /20, finish and assembly /20) and has a mandatory 13-item contents list, plus 5-pt penalties for missing identification (T4.3, T7.12.2, T8.1, T9.1). | C2.10.6, p40, p53 | Team deliverable; software generation is out of innovation scope. |
| 11 | **Halo and helmet are fixed standard parts** that must appear unmodified. The halo pocket is cut with a 6.35 mm ball-nose tool to 3.175 mm depth; the pocket bottom is 24.0 mm above the track and the notch centre 34.0 mm +/- 1.0 mm. | T4.4, T1.21, Appendix ix | Include the halo in every CFD geometry. |
| 12 | **Points:** specification and scrutineering 160, design and engineering 180, project management 90, enterprise 180, verbal presentation 140, racing 250. Total 1000. | C3.5 | Use these weights in the score checklist (section 1.5). |

Inconsistencies in the source documents to raise with the organisers (competitions@stemplify.com): compressed air vs gas (T1.20 vs C9.12); verbal presentation split 60/40/40 in C3.5 but 40/40/60 on the scorecard; automatic vs manual launch in C9.1 vs C9.4 and C9.7.2; Appendix iii numbers the front wing rules T8.5.x instead of T8.6.x; T4.4.5 halo load "to be reviewed".

### 22.3 Next-wave tasks

Build order is roughly top to bottom. "Needs" lists what the code cannot work without: real CFD runs, thrust measurements, race runs, photos or video. Unavailable data uses an honest empty/manual state; estimates and synthetic examples are labelled explicitly.

| ID | Build | Task | Depends on | Needs |
|---|---|---|---|---|
| T15 | 🟨 Partial | **Outcome objective.** Expected racing points from the C9.5/C9.6 formulas, knock-out win probability, tail risk (CVaR), and a two-car portfolio choice per round. Replaces the drag-only objective in ORACLE. | montecarlo | declared opponent assumptions or owner-supplied results; T28 scraping is cut |
| T16 | 🟨 Partial | **Third-party timestamps for sealed predictions** (RFC 3161 or a witnessed public hash). | predictions | network access to a timestamp authority |
| T17 | 🟨 Partial | **Bayesian calibration** with information gain per term, model offset vs noise, and out-of-sample validation. Ported from the older repo. | calibration, montecarlo | real runs on varied conditions (mass, density) |
| T18 | ⬜ Remaining | **Cartridge thrust model** from the gas thermodynamics at 21 C. | gas type confirmed (22.2 #7) | measured thrust curves |
| T19 | ✅ Built | **Energy-loss audit:** where every joule of thrust went. | dynamics | none |
| T20 | 🟨 Partial | **FORGE v2:** build the missing measures (height, wheelbase, wheel diameter and width, clearance, overhangs, wall thickness, chamber, halo notch, wing thickness), pass probability from the manufacturing spread, and live "points at risk". | geometry, rulebook | measured part spread |
| T21 | 🟨 Partial | **Structural analysis.** Start with beam FEM (numpy) on the wings, axle and halo; model the rules' own load tests (halo 1 kg, wheel 100 g, tether guide 200 g). Add 3D FEA with CalculiX when installed. | geometry | material properties of the real block, resin or foam; solver install for 3D |
| T23 | 🟨 Partial | **Test planner:** which physical test (mass ballast, air density, track length) most reduces the calibration uncertainty. | T17 | none |
| T25 | ⬜ Remaining | **Free-form adjoint shape optimisation** inside the FORGE constraints. | T05, T20, CFD | accepted CFD runs |
| T27 | ⬜ Remaining | **Physical-in-the-loop optimiser** with a model-discrepancy term. | T15, T17 | several real runs |
| T29 | 🟨 Partial | **Legal-frontier map:** the edge of the rule-feasible design space, with rule and page for every boundary. | T20 | none |
| T33 | 🟨 Partial | **Project twin:** Monte Carlo schedule and budget risk tied to engineering evidence, mapped to the 90-point project management scorecard. | none | the team's plan |
| T34 | ⬜ Remaining | **Red-team mode, V&V dossier, post-event regret report.** | T10, T17 | CFD and runs |

### 22.4 Questions for the organisers
1. Are software-generated geometry or AI-assisted code acceptable under C2.9.2 and C2.16, and what must be declared?
2. Is the power unit cartridge compressed air or CO2?
3. Is racing launched in manual driver-reaction mode or automatic mode (C9.1 vs C9.4, C9.7.2)?
4. Which Verbal Presentation split applies: 60/40/40 (C3.5) or 40/40/60 (scorecard)?


## 23. Progress on main (updated 2026-11-02)
The next-wave changes were merged into `main` in `6d708b5`. The table tracks verified work and remaining orders; runtime checks are recorded separately from implementation.

| Order | Status | Done | Still missing |
|---|---|---|---|
| Honesty correction | ✅ Implemented | India NF T7.2.1 finding reproduced on `orbit_v2`: 33.00 mm front-wheel gap vs 38.00 mm minimum; pitch and checklist corrected ([evidence](../../evidence/STEP-1-india-honesty.md)) | Physical measurement and official scrutineering remain unverified |
| 1 India rulebook | 🟨 Partial | `rulebooks/stem-racing-india-nf-2025-26.yaml`, more rules measured, points at risk, scrutineering sheet (`forge_sheet.py`, `sheet.typ`), failed-rule links select and frame named CAD parts; responsive shell | Physical verification; feature-level measures tracked below |
| T20 FORGE v2 | 🟨 Partial | Axle layout measures retained; CAD cylinder rolling bands, sampled wing-section extremes, explicit named halo-notch arcs, rear-wing plane B location and rear overhang bound; hash-bound remeasurement sidecar + UI action | Halo absent/ambiguous features remain manual; continuous wing surfaces, contact geometry and physical tolerances still require verification |
| 2 Wind Tunnel analysis | 🟨 Partial | Component-force/drag charts and grid study wired; ✅ wake planes, Q surfaces and strict same-mesh ΔCp with exports connected; ✅ static Render tab removed and default run now the lowest-Cd accepted run; ✅ RGBA Float32 velocity texture (`/vtk/velocity.json`, `/vtk/velocity.bin`) exported for GPU advection | GPU particle layer, accepted-source/campaign validation, interpolated design-to-design comparison and remaining wake metrics |
| 3 Race replay rebuild | 🟨 Built core; acceptance pending | Correct Z-up GLB conversion and leading-point placement; PBR car/wheel motion, studio track, tether/start/sector/finish details, six camera modes, adaptive reflections/effects, cursor timing, comparison controls, photo-finish slow motion and PNG capture | Hardware 60 fps verification, final 1024 px pass and broader final QA; no measured reaction data supplied |
| 4 Race analysis | 🟨 Partial | Time budget, tornado chart, exchange rates, Breakdown tab, Energy panel (`raceanalysis.py`, `energy.py`) | Stadium timing / TV mode |
| 5 Closed loop | 🟨 Partial; real study build connected | Canonical build123d study generator, cheap family-filtered recommendations, build-next API, real geometry import/FORGE, parameterized Design/evidence artifacts and Pit Wall CAD/rules links; existing CFD dialog receives the exact generated design when no CAD rules fail | Legal/complete production geometry, full constraints/objective, automatic accepted-only CFD feedback and synthetic/physical training separation |
| 6 Calibration / optimisation analysis | 🟨 Partial | ✅ Bayesian calibration API/UI with timing previews and held-out scoring; saved studies persist exact inputs, results and source files with browsing/reopening. Monte Carlo and SALib Sobol/Morris API + Sensitivity UI | Applying the posterior to Race, GP uncertainty maps and measured validation; ⏳ Calibration/Sensitivity visual review |
| 7 Remaining | 🟨 Partial | Project page, cleanup, ✅ uPlot telemetry, ✅ React Flow evidence lineage and ✅ T34 V&V dossier (JSON/Markdown + Project panel) | Run wizard, ⏳ dockview visual review, red-team/post-event reports and final browser review |

### Bounded 15-task pass (2026-11-04)

Implemented EASY-01…EASY-15 on `main`: presenter honesty/limitations, per-row timing outlier flags, four native PNG exports and source captions, per-rule manufacturing risk plot/table, percent-of-span margins, posterior and held-out prediction plots, comparable saved-study errors, a four-case beam comparison table, a compact FORGE summary PDF, full source identity in the report/sheet/summary PDFs, and the judge walkthrough/one-pager. Evidence: `evidence/EASY-01.md`…`evidence/EASY-15.md`. Focused Python/TypeScript tests, Ruff, TypeScript and focused lint pass; report/sheet/summary fixtures were rendered and visually inspected. Not established: accepted CFD, measured race, physical load tests, final browser/responsive acceptance and a timed teammate walkthrough. The pre-existing animated-flow draft remains uncommitted and untouched.

### Sprint: short protocol forms (2026-11-03)

- [x] F06: Calibration and Test Planner now use explicit Lab-day/Track-day/Custom assumptions and Base UI Advanced settings. Existing fit/planning APIs and saved calibration evidence stay connected.
- [x] TypeScript/changed-file lint and brief in-app interaction checks at 1440/375 px; actual planner calculation returned three recommendations, with zero console errors and no horizontal overflow. Hidden invalid settings stay visible.
- [ ] Complete final app acceptance, measured timing precision and real physical calibration remain pending. Owned browser tab and both servers were closed after this check.

### 23.1 Latest reuse integrations — current tags

| Piece | Implementation | Verification / next gap | Landed commit |
|---|---|---|---|
| racing-game gauge/results + four f1-dash timing components | ✅ Imported, adapted and connected | ⏳ Consolidated visual/performance review | `8ea5f25` |
| uPlot telemetry | ✅ Connected; bands, native zoom/cursor sync, A/B controls and PNG export | ⏳ Final responsive/performance pass; cursor-input memory fix landed | `8cfb60e` (integration began in `20ad8b9`) |
| React Flow + Dagre evidence lineage | ✅ Connected to actual records/ID references; lazy loaded | ⏳ Full action coverage and final acceptance; current DB has 3 nodes / 2 links | `8cfb60e` |
| SALib Sobol/Morris sensitivity | ✅ Library, API and Pit Wall tab connected | ⏳ Visual review; analytic/script checks passed | `6c42121` |
| dockview | ✅ Actual docking engine connected to real Overview panels; saved layouts, drag/drop, reset and compact defaults | ⏳ Visual review; TypeScript and four layout checks passed; MIT notice retained | Current reuse pass 4 |
| Closed-loop parametric car | 🟨 Real study generator/API/evidence/FORGE/UI connected | Legal geometry, complete constraints/objective and accepted-only CFD feedback remain | Current Order 5 study-build pass |
| Final acceptance | ⬜ Still pending | Full QA, accepted CFD campaigns and measured validation | No acceptance claim |

Browser and both development servers are stopped. Continue with scripts and short in-app checks only when needed; the earlier 21 GB peak remains unverified.

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

## 24. Historical T01–T35 checklist score — 2026-11-02

**Historical snapshot, superseded by TODO.md scope and §28 feature ticks.** The percentage below predates removal of drawing work and multi-fidelity. Do not quote it as current feature completeness.

This is the current implementation ledger for all T01–T35 tasks. Earlier feature catalogues describe targets and repeat some work; do not add those duplicates to the percentage. T01b is a subtask of T01. The paused closed-loop draft does not earn a separate completed task.

**Legend:** ✅ implemented core · 🟨 partly implemented · 🔄 active integration · 📝 uncommitted local draft · ⬜ planned/not started · ⏳ verification pending · ✂️ out of scope · 🚫 explicitly skipped library. A build tick does not change the task board to reviewer-accepted or tick the final QA checklist. These statuses are based on the current source and recorded evidence, not a fresh full-product acceptance audit.

**Scope-normalised historical task score: 48.1%.** The current eight cuts leave 27 tasks: three built, twenty partial, four remaining in this coarse historical ledger. `(3 + 20 × 0.5) / 27 = 48.1%`. Removing T22 and T24 changes the denominator; it is not evidence of engineering completion. Use §28 and PROGRESS for detailed current work.

**Original core T01–T14: 57% checklist score.** Two built + twelve partial: `(2 + 12 × 0.5) / 14 = 57.1%`.

Partial tasks receive a fixed half-point for a simple, reproducible tally; this does not mean each is halfway through its engineering effort. These are rough scope-completion indicators, not estimates of hours left, judging points or competition readiness. The eight explicitly cut tasks are excluded. This is a checklist tally, not an effort-weighted estimate.

| ID | Task | Build | What is present / what remains |
|---|---|---|---|
| T01 | CFD accuracy and acceptance | 🟨 Partial | Rotating-wheel / moving-ground case and acceptance tooling; accepted current-car CFD and scientific review remain. |
| T02 | Durable job queue and launch UI | ✅ Built | Queue, worker, logs, cancellation/recovery, API and launch UI implemented; reviewer acceptance remains. |
| T03 | Grid study and speed sweep | 🟨 Partial | Study tooling exists; actual accepted multi-mesh/speed campaigns remain. |
| T04 | Flow insight export | 🟨 Partial | ✅ Active VTK exporter adds lazy wake-plane/Q layers and strict ΔCp exports; remaining catalogue, accepted-source and visual validation remain. |
| T05 | Adjoint sensitivity | 🟨 Partial | Tooling exists; accepted primal, adjoint result and connected sensitivity map remain. |
| T06 | Wind Tunnel experience | 🟨 Partial | ✅ vtk.js wake/Q controls, strict same-mesh ΔCp, source metadata and downloads connected; design-to-design interpolation, remaining analysis and final visual/performance validation remain. |
| T07 | Design Studio | 🟨 Partial | Real CAD import/save, inspection and rule focus; deeper integration and final acceptance remain. |
| T08 | TITAN race experience | ✅ Built | Telemetry now uses uPlot; direct racing-game/f1-dash components, what-if/presets, uncertainty band, replay and comparison connected; ⏳ final QA/performance. |
| T09 | Imports, units and calibration | 🟨 Partial | Import/unit/calibration foundations; complete calibration UI and measured validation remain. |
| T10 | ORACLE optimisation | 🟨 Partial | GP/EI, SALib sensitivity and family-filtered study build/API/FORGE/evidence/UI connected; complete legal geometry, accepted-only CFD feedback, training-source separation and full objective remain. |
| T11 | FORGE rules and inspections | 🟨 Partial | India rulebook, CAD states/margins and sheet; measured inspections and full coverage remain. |
| T12 | ATLAS evidence | 🟨 Partial | Store, hashes, timeline, verify and React Flow lineage exist; derived missing-action coverage now ties every gap to a real design/run/calibration/prediction ID and shows it in the lineage and a Coverage view. Final acceptance remains. |
| T13 | Competition mode and report (AR cut) | 🟨 Partial | Presenter and Typst report exist; a downloadable judge pack now bundles the existing exports, rule findings, run manifests and evidence verification with an honest missing list. Public verification remains; AR is out of scope. |
| T14 | Final app polish | 🟨 Partial | ✅ `?` shortcut sheet, route error boundary, palette actions and dossier panel; consolidated responsiveness, contrast, formatting, bundle and acceptance pass remains. |
| T15 | Racing-points objective | 🟨 Partial | ✅ Outcome core, tested API and Race Points scenario panel connected (editable assumptions, points split, knock-out chart, p05–p95); ORACLE objective integration and real field data remain; competitor scraping is cut. |
| T16 | Third-party prediction timestamps | 🟨 Partial | ✅ Submission/status/OpenSSL verification UI and API connected; each verification is now an append-only evidence record linked to the prediction, token artifact and trust-bundle artifact, with a history view. A real authority response and trusted certificate-chain verification remain. |
| T17 | Bayesian calibration | 🟨 Partial | ✅ Race UI, timing-file preview, explicit priors and optional separate held-out scoring connected; saved studies now persist exact inputs, results and uploaded source files as evidence, with browsing and reopening. Real held-out validation and applying the posterior to the Race model remain. |
| T18 | Cartridge thermodynamic thrust model | ⬜ Remaining | Organiser gas confirmation and measured thrust curves remain. |
| T19 | Energy-loss audit | ✅ Built | Energy model, API and Race Energy panel verified in source; final reviewer acceptance remains. |
| T20 | FORGE v2 | 🟨 Partial | Added rolling bands, sampled sections, named-notch logic, remeasurement and a manufacturing pass-probability API/Rules panel; wall/chamber measures and measured process spread remain. |
| T21 | Structural analysis | 🟨 Partial | Beam FEM, API and Strength panel exist; material validation and 3D FEA remain. |
| T23 | Test planner | 🟨 Partial | ✅ Pit Wall UI connects editable assumptions, thrust CSV and ranked timing/coast-down recommendations (`c75b9eb`); completed-outcome feedback, density comparison, physical validation and visual review remain. |
| T25 | Free-form shape optimisation | ⬜ Remaining | Constraint-aware free-form optimisation remains. |
| T27 | Physical-in-the-loop optimiser | ⬜ Remaining | Measured trials and discrepancy-aware optimiser remain. |
| T29 | Legal-frontier map | 🟨 Partial | ✅ Interactive unit-filtered nearest-limit chart/list with rule pages and CAD focus connected; sampled feasible-space frontier and acceptance remain. |
| T33 | Project twin | 🟨 Partial | Project forecast backend and Project workspace exist; assumptions, per-task source references, a declared scorecard with evidenced points, derived evidence gaps and saved forecasts (hashed plan + result artifacts) are connected. Official weights and final validation remain team-supplied. |
| T34 | Red-team / V&V dossier | 🟨 Partial | ✅ Dossier evaluates ten requirements from stored records, lists failures/limitations/open validation and exports JSON/Markdown in the Project panel; red-team mode and post-event regret report remain. |

**New work landed in this session:** ✅ India honesty correction; ✅ failed-rule CAD selection/focus; 🟨 FORGE v2 feature expansion; 🟨 13-item drawing draft; 🟨 replay rebuild pending final acceptance; 🟨 closed-loop study generation/API/evidence/UI now connected. Details and commit IDs are in §23.

## 25. Open-source reuse audit — what was actually used

The requested named projects were used to different extents. The replay is a custom integration around our data; it is not a wholesale copy of the racing-game scene/HUD or the f1-dash application. Full-project adoption for the remaining named tools has not happened.

| Requested source | Actual use | Extent / remaining gap |
|---|---|---|
| Chili3D | Full pinned upstream CAD build, patched and rebuilt; import/save and focus bridge use our STEP designs | ✅ Real upstream app integration; not a replacement CAD kernel written here |
| pmndrs/racing-game | Original gauge SVG and Score/Scores/Finished presentation adapted and connected; camera/light references retained | ✅ Selected component integration; road-course assets, driving physics and auth intentionally excluded |
| slowlydev/f1-dash | DriverTag, DriverGap, DriverLapTime and full DriverMiniSectors imported/adapted to our traces | ✅ Selected component integration; full F1-feed dashboard intentionally excluded |
| pmndrs/postprocessing | Installed package through `@react-three/postprocessing`, with actual SMAA and Bloom components | ✅ Library reuse for those effects; motion blur and clip export remain |
| pmndrs/drei / React Three Fiber | Actual renderer, reflector material, performance monitor and Stats components | ✅ Library reuse; measured 60 fps target remains unverified |
| build123d + OpenCascade | Actual STEP import/export, solids/features, section geometry and polygonal hidden-line projection | ✅ Library reuse. Drawing generator and local parametric-study draft are our code using those APIs |
| Ax / BoTorch / Optuna | Current GP uses NumPy/SciPy; these frameworks are not integrated | 🚫 BoTorch explicitly skipped by §27; no claim of Ax/Optuna adoption |
| Typst | Actual PDF compiler/templates for reports, rule sheet and drawing draft | ✅ Library reuse |
| vtk.js / PyVista / OpenFOAM | Existing viewer/render/solver dependencies retained | 🟨 Core integrations exist; complete advanced layers and accepted campaigns remain |
| uPlot / React Flow / Dagre / SALib | Actual installed libraries connected to telemetry, lineage and surrogate sensitivity | ✅ Integrated; ⏳ acceptance gates remain as listed in §23.1 |
| dockview / FoamPilot / F3D / FastF1 / SU2 | dockview dependency installed only; other integrations not completed | 🔄 dockview candidate; ⬜ remaining suitable tools require fit/licence review |
| trame / OpenMDAO | Not adopted | 🚫 Explicitly skipped by §27 |

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
| Removed drawing pack / retained FORGE features | Actual build123d/OpenCascade geometry APIs, polygonal hidden-line machinery and Typst compiler | `drawings.py`, drawing template/form, feature-selection logic, wing sampling, sidecar/hash checks and FORGE glue were written here. No complete upstream engineering-drawing application or rule engine was imported. |
| ORACLE and parametric family | Existing NumPy/SciPy and build123d libraries | The current GP/EI implementation is custom; Ax/BoTorch/Optuna were not integrated. The uncommitted `parametric.py` study family was written here, not copied from bitbybit or another car generator. bitbybit car-part ideas have not yet been researched/adopted for this draft. |
| Remaining named tools | Existing vtk.js, PyVista, OpenFOAM and ECharts integrations retained | trame/ParaView Web, FoamPilot wizard/monitor, F3D turntables, uPlot telemetry, FastF1 layouts, dockview, xyflow, SU2/DAFoam and PyGeM were not newly integrated in this pass. CadQuery was not added as a second CAD pipeline. OpenFOAM tutorial adoption was not newly audited in this pass. |

**Continuation checklist — scoped to the reuse passes recorded in §26:**
- [x] Resume from the current checkpoint and existing reference notes. Do not reread the entire repository or restart completed work; inspect the specific upstream and local files needed for the next change.
- [x] Before more custom replay work, inspect the actual licensed racing-game scene/HUD components and f1-dash timing components for direct reuse. Prefer adapting working components over recreating their functionality.
- [x] Record the upstream commit, original paths, retained licence notices and destination paths for each copied/adapted component.
- [x] Connect reused components to our real designs, telemetry, jobs and evidence. Remove foreign branding/demo data; retain honest loading/empty/error states and provenance.
- [x] For each component left custom, record the concrete compatibility reason. Do not describe an inspected reference or installed package as a full application port.
- [x] Review whether any suitable newly written components should be replaced by upstream adaptations. Preserve working behaviour until its replacement is connected and reviewable; do not delete the current implementation wholesale.
- [ ] 🔄 Continue the remaining build order, prioritising implementation and cleanup. Batch focused checks around completed changes; leave broad QA and heavy CFD to the agreed final phase.

Historical note: the owner subsequently resumed implementation. Current work is tracked in §26.


## 26. Open-source-first resume — 2026-11-02

Owner resumed implementation, prioritising suitable prebuilt open source, fast completion of partial work and high-quality UI. Do not restart the repository audit; use the existing checkpoint and inspect only files needed for each integration.

### Reuse pass 1 — imported replay/timing components

- [x] Clone the actual licensed upstream sources to temporary directories and pin revisions.
- [x] Import/adapt racing-game's speed-gauge SVG and Score/Scores/Finished result structure; replace upstream physics/store/auth inputs with our telemetry props.
- [x] Import/adapt f1-dash DriverTag, DriverGap, DriverLapTime and full DriverMiniSectors presentation. Replace its F1 feed/settings dependencies with typed model-data adapters.
- [x] Connect imported components to selected car names, trajectory-derived speed, finish times, gaps and eight actual sector durations.
- [x] Preserve MIT/AGPL notices and record source-to-destination mapping below. TypeScript passes; changed-component lint has no errors (upstream static-index warnings remain). Consolidated visual QA remains.
- [x] uPlot 1.6.32 telemetry renderer connected: native bands/cursor/zoom, retained keyboard/A-B controls, reset and PNG export.
- [x] React Flow 12.12.0 + Dagre 3.1.3 lineage connected to actual evidence references; lazy-loaded graph, search highlighting and record detail selection.

| Upstream revision / original path | Destination | Adaptation |
|---|---|---|
| racing-game `7816a5d`, `src/ui/Speed/Gauge.tsx` | `components/race/upstream/SpeedGauge.tsx` | Original SVG background/foreground paths retained; telemetry props, SI/km/h units, unique SVG IDs and cockpit styling |
| racing-game `7816a5d`, `src/ui/LeaderBoard.tsx` + `src/ui/Finished.tsx` | `components/race/upstream/ReplayResults.tsx` | Score/Scores and finish-result structure; model results replace Supabase/auth/medal assets |
| f1-dash `d21607a`, `dashboard/src/components/driver/DriverTag.tsx` | `components/race/timing/DriverTag.tsx` | Lane tags and cockpit tokens |
| f1-dash `d21607a`, `dashboard/src/components/driver/DriverGap.tsx` | `components/race/timing/DriverGap.tsx` | Typed local feed shape; our trajectory/finish gaps with units |
| f1-dash `d21607a`, `dashboard/src/components/driver/DriverLapTime.tsx` | `components/race/timing/DriverLapTime.tsx` | Current progress/finish and best comparison, without fabricated personal-best history |
| f1-dash `d21607a`, `dashboard/src/components/driver/DriverMiniSectors.tsx` | `components/race/timing/DriverMiniSectors.tsx` | Full sector presentation; eight equal-distance sectors in a compact grid; local adapter replaces settings/data stores |

**Fit decisions:** Racing-game's road-course GLB, Cannon driving physics, keyboard/audio controls and Supabase authentication are not imported: the required product is a straight STEM track replaying TITAN results, not an interactive road-driving game or a foreign score service. The real car, domain-specific track geometry and trajectory interpolation remain. This is component reuse, not a claim that the complete upstream applications were imported.

### Reuse pass 2 — uPlot telemetry and React Flow lineage

- [x] Use actual uPlot 1.6.32 for the telemetry canvas, synchronized cursors, native drag zoom and p5–p95 bands; retain channel ordering, y-zoom, A/B handles and keyboard controls. Add reset and PNG export.
- [x] Use actual @xyflow/react 12.12.0 and @dagrejs/dagre 3.1.3 for the evidence view, automatic layout, pan/zoom, fit and node selection. Graph loads only when selected in the Evidence drawer.
- [x] Add read-only `/v1/evidence/lineage`: actual records and parent-ID links only. No invented nodes; omitted-window and missing references are reported.
- [x] Fresh live check showed four uPlot plots and the existing three evidence records/two stored links. Targeted lineage test covers real references and truncation without placeholders. TypeScript/Ruff/changed-file lint passed.
- [x] Update postprocessing to 6.39.6, whose published peer range supports Three 0.187. Package peer check now passes.
- [x] Stabilize telemetry marker/band props to avoid chart recreation during cursor movement. Allocate title height separately so low-value traces are not clipped.

**Memory constraint:** owner observed a 21 GB figure. A later process snapshot measured the external test renderer at 1,223 MiB resident and Next at 116 MiB resident; this snapshot cannot establish the earlier peak. The owned browser and both dev servers were stopped and exit confirmed. Prefer scripts/static checks, use the available in-app browser for brief necessary UI checks, and close owned checks immediately afterward. Do not leave an external test browser running or treat a dev-browser memory figure as production app usage. No full-memory-profile claim is made.

**References:** TinyFish search/fetch of the official uPlot repository, React Flow theming and Dagre example; licences checked using GitHub metadata before dependency adoption. See THIRD_PARTY.md and `evidence/OSS-02-uplot-lineage.md`.


### Reuse pass 3 — SALib Sobol/Morris sensitivity

- [x] Adopt MIT-licensed SALib 1.6.0 rather than implementing sensitivity estimators here.
- [x] Add `/v1/oracle/sensitivity?method=sobol|morris`, with bounded CPU-only sampling and small result caching: 1,536 Sobol or 320 Morris surrogate evaluations for four variables.
- [x] Connect Pit Wall Sensitivity tab with native chart bars, exact values and 95% confidence intervals. Analyse the GP mean over uniform declared bounds; synthetic observations stay labelled synthetic.
- [x] Run both methods on current observations via script. Two analytic checks passed; focused check took 1.6 s, peaked around 143 MiB resident and recorded zero swaps. This is not a full-app benchmark.
- [x] Rename Pit Wall “CFD runs” to “Observations” so synthetic seeds are not presented as CFD runs.
- [ ] Visual review of the new tab remains; servers/browser were not started for this pass.

Follow scope decision §27: no photo/video/AR/competitor-scraping/base-bleed/community-calibration work; skip BoTorch, OpenMDAO and trame. CalculiX is gated on real material data. Dockview is now connected in reuse pass 4 below.


### Reuse pass 4 — Dockview and task queue

- [x] Connect MIT Dockview React 8.8.3 to real Flow, Car, Sealed prediction, Next run and Rules panels in Overview; lazy load the engine.
- [x] Use native docking, tabs, splits, resizing and serialization rather than rewriting these interactions. Save compact/wide layouts separately; reset restores closed panels. Restrict restored component IDs and disable floating groups.
- [x] Retain the actual distribution MIT licence. TypeScript, focused lint and four default-layout checks pass.
- [x] T23 software UI shipped (`c75b9eb`): editable assumptions, optional thrust CSV, actual information-gain recommendations, explicit uncertainty and physical-validation limits. Uses existing TanStack Query/Zod/Base UI components.
- [ ] ⏳ Dockview and Test Planner visual review; no servers/browser/CFD started for these changes.
- [x] Terra completed T29 single-design limits UI and T16 timestamp submission/verification workflow; parent reviewed sources. Existing ECharts, Query, Zod/Base UI and OpenSSL reused.
- [x] Terra completed T17/T09 ephemeral Bayesian calibration workflow; parent added a single-fit concurrency gate and disabled assumption editing during fits.
- [x] Terra completed T04/T06 wake/Q layers and strict same-mesh ΔCp with source checks and VTP/metadata exports; parent reviewed, serialized native field exports and verified focused tests. vtk.js resource ownership/cleanup extended to base and optional layers.
- [ ] ⏳ Browser/GPU checks, compatible real-source comparison and accepted CFD validation remain; no CFD campaign ran.
- [x] Parent connected the Order 5 real study build path and hardened observation validation/concurrent writes; see `evidence/ORDER-5-study-build.md`. No accepted CFD feedback or legal-car claim.

Checklist score remains 45%: these integrations advance existing partial tasks; they do not establish scientific acceptance or complete all their remaining scope.

### Verification persistence (T16)

- [x] `TimestampVerification` records each OpenSSL check as append-only evidence referencing the prediction, the stored token artifact and the CA-bundle artifact (reused by content hash).
- [x] `GET .../anchor/history` plus `verification_count`/`latest_verification` on the status endpoint; Pit Wall lists each attempt with verdict, TSA time, token, bundle and the reproducing command.
- [x] Failed checks are recorded as failures with the authority's output; a verification is never upgraded by a later session.
- [ ] ⏳ No live trusted TSA response or valid certificate chain has been verified; the tests use a fake runner.

### Saved calibration studies (T17/T09)

- [x] A Bayesian calibration appends a `titan` Model, a `CalibrationStudy` and content-addressed artifacts for the canonical inputs, the posterior/held-out results and each uploaded source file.
- [x] `GET /v1/calibration-studies` and `GET /v1/calibration-studies/{id}` expose saved studies and the exact request used, so a study can be browsed and reopened.
- [x] Race → Calibration lists saved studies; opening restores points, thrust curve, priors and track/SD fields and shows the loaded study ID. Recalculating creates a new study.
- [ ] ⏳ No real measured timing file has been calibrated, the posterior is not applied to the Race model, and no physical validation exists.

### Project twin scorecard (T33)

- [x] The saved plan carries currency, start date, per-task estimate sources, assumptions (with basis and source) and a declared scorecard with points, claim, evidence reference and status.
- [x] `POST /v1/analysis/project/forecast` appends a `ProjectForecast` plus hashed plan and result artifacts; `GET /v1/analysis/project/forecasts` lists them for later comparison with what happened.
- [x] The Project workspace shows assumptions, the scorecard's evidenced/declared points, derived evidence gaps and saved forecasts; gaps are labelled as derived, not an audit.
- [ ] ⏳ Official India NF weights and any validation of the plan against real delivery remain team-supplied.

### Evidence coverage (T12)

- [x] `coverage.py` derives missing next actions in one pass over the stored records and points each at the waiting design, solver run, build, calibration study or prediction.
- [x] `GET /v1/evidence/coverage` returns the gaps and counts; lineage nodes carry their own `gaps`, and a Coverage view lists them grouped by kind with related IDs.
- [x] Successful runs without an observation, failed runs, unbuilt designs, unscored predictions, studies without held-out runs and unverified timestamps are handled separately so the list stays factual.
- [ ] ⏳ The rules are expectations, not adequacy checks; a gap outside the newest 500 lineage records has no node in the graph window.

### Judge pack (T13)

- [x] `GET /v1/report/judge-pack` returns one ZIP built from the existing report, drawing, rule, manifest and evidence outputs; each entry is hashed in `manifest.json`.
- [x] A failed export is omitted and named in `MISSING.txt`; a reference-only rulebook, missing runs/designs, broken hashes and open coverage actions are listed too.
- [x] Pit Wall links the pack next to the report PDF.
- [ ] ⏳ A live Typst/STEP export and a browser download were not run in this pass; public verification remains.

---

## 27. Scope decision (2026-11-02): cut list
**Do NOT build these** (camera/hardware/external-data features, not needed):
- T30 virtual scrutineer from photos
- T31 video test lab (wobble/snag from phone video)
- T32 as-built twin / photogrammetry
- T35 community calibration across teams
- T28 competitor/field intelligence scraping
- T26 exhaust base-bleed study
- AR car view

**This is the 2026-11-02 scope snapshot. TODO.md now additionally removes drawing work, multi-fidelity and listed infrastructure. §28 M tracks current exclusions and unfinished cleanup.** Open source: add SALib (Sobol/Morris sensitivity); CalculiX only with real material data; skip BoTorch, OpenMDAO, trame.

## 28. Live feature checklist by workspace and analysis — 2026-11-03

This is the current checkbox ledger requested by the owner. `TODO.md` supplies the current scope; old target lists in §§1–22 and the old §24 percentage do not override its removals. Code inventory was checked on 2026-11-03, including the local animated-flow draft. Terra checked Race/ORACLE/calibration read-only; Codex checked other areas. No new browser, CFD or physical validation was performed for this inventory.

**Meaning:** `[x] ✅` = implemented and connected software; `[ ] 🟨` = partly implemented; `[ ] ⬜` = not connected/not built; `[ ] 📝` = local uncommitted draft; `[x] ✂` = intentionally out of scope; `[ ] 🧹` = excluded feature still needs code cleanup; `[ ] ⏳` = verification/data gate. A built tick is not scientific acceptance, measured compliance, GPU performance or a complete commercial-quality claim. Do not tick a chart just because an API number exists.

### A. Design Studio — target: one coherent CAD and inspection workflow

- [x] ✅ A01 — Real Chili3D CAD opens named STEP parts, supports editing and exports through the same-origin bridge (`DesignStudio.tsx`, `CadFrame.tsx`, `patches/chili3d.patch`).
- [x] ✅ A02 — Save/import creates immutable geometry, display GLB, CFD surfaces, Design and STEP evidence (`api/cad.py`, `geometry.py`).
- [x] ✅ A03 — Failed/at-risk rules select and frame named CAD parts.
- [x] ✅ A04 — Inspection viewer has named parts, dimensions, section/measurement and comparison controls (`DesignWorkspace.tsx`, `components/viewer/design`).
- [x] ✅ A05 — ORACLE study builds four physical parameters through build123d and the canonical importer, with FORGE and evidence (`design_loop.py`).
- [ ] 🟨 A06 — CAD rule overlay: selection/focus exists; coloured rule states plus measured-value/limit dimension lines inside CAD remain.
- [ ] 🟨 A07 — Two-design comparison exists; signed deviation heat map in mm remains.
- [ ] ⬜ A08 — Four live editable parametric controls with validated regeneration inside Design Studio.
- [ ] ⬜ A09 — Material-aware mass and centre-of-gravity estimate connected to the design.
- [ ] ⬜ A10 — Minimum-wall map, CNC reach and manufacturing checks using canonical geometry.
- [ ] 🟨 A11 — Consolidate overlapping inspection/editor controls without losing measurement tools.
- [ ] ⏳ A12 — Final keyboard/responsive CAD acceptance and actual manufactured-part checks.

### B. Wind Tunnel — target: moving-air view plus trustworthy engineering analysis

- [x] ✅ B01 — Flow / Forces / Convergence / Mesh tabs; static Render tab removed.
- [x] ✅ B02 — Lowest-Cd accepted-run default and honest no-accepted-run empty state (`lib/cfdRuns.ts`). Explicitly selected rejected runs retain their warning.
- [x] ✅ B03 — Compact velocity texture/metadata export with validity mask (`viz/vtkexport.py`, `api/engineering.py`).
- [ ] 📝 B04 — GPU RK2 animated-air scene, Cp car, moving floor, camera presets, density adaptation and hidden-tab pause (`FlowTunnel3D.tsx`): code and recorded browser evidence exist locally but are not committed at this checkpoint.
- [x] ✅ B05 — Surface Cp, streamlines, slice controls and colour legends in the existing field viewer.
- [x] ✅ B06 — Lazy wake planes at x/L = 1, 1.5, 2, VTP download and source labels.
- [x] ✅ B07 — Normalised Q isosurfaces with VTP export; currently coloured by speed, not vorticity.
- [x] ✅ B08 — Strict identical-geometry/indexed-mesh ΔCp with both sources and compatibility rejection; VTP and metadata downloads.
- [x] ✅ B09 — Per-component pressure/friction drag bars and cumulative drag build-up.
- [x] ✅ B10 — Cd/residual histories, acceptance-window shading and rejection explanations.
- [x] ✅ B11 — Grid-study/speed plots and Richardson/GCI values when actual study results exist (`GridStudyPanel.tsx`).
- [x] ✅ B12 — Existing job submission, queue/logs/cancel controls; native field exports serialize and vtk.js resources are explicitly disposed.
- [ ] 🟨 B13 — Exactly one renderer mounts at once in the animated draft; full single-scene integration of advanced field layers remains.
- [ ] ⬜ B14 — Surface LIC/separation lines, probe-line Cp plots, y+ and bad-cell maps.
- [ ] ⬜ B15 — Δwake and Δforces comparison, momentum-deficit drag cross-check.
- [ ] ⬜ B16 — Guided run wizard with residual-linked progress and defensible ETA.
- [ ] ⬜ B17 — Declared yaw/ride-height sweeps and frontal-area/drag trade analysis.
- [ ] ⏳ B18 — Accepted real flow sources, under-3-second initial display, physical-Mac 60 fps and final 1440/1024/375 px review. Software-renderer screenshots do not establish physical GPU performance.

### C. Race replay and full stadium — target: broadcast race engineering

- [x] ✅ C01 — Real CAD-derived car GLB, engineering-frame conversion and trajectory-driven motion.
- [x] ✅ C02 — 20 m two-lane track, tether/start/finish details and model-driven wheel motion.
- [x] ✅ C03 — Director, side/broadcast, chase, onboard, top and finish cameras (`scene/BroadcastRig.tsx`).
- [x] ✅ C04 — Direct racing-game gauge/results and f1-dash timing/mini-sector component adaptations with retained licences.
- [x] ✅ C05 — Scenario ghost inside Replay, eight model sector times, finish slow motion and PNG capture.
- [x] ✅ C06 — Replay adaptive quality and dialog-based trainer with restored browser history, median/spread/false starts, native chart and JSON export; field latency validation pending.
- [x] ✅ C07 — Four-tab consolidation built: Replay / Analysis / Points / Calibration, trainer in Base UI dialog; legacy hashes retained. ⏳ Browser/keyboard verification.
- [ ] ⬜ C08 — Race-day actual time + reaction entry, prediction comparison and explicit instant calibration update.
- [ ] ⬜ C09 — Dedicated stadium/TV mode with projector layout, fullscreen and panel rotation.
- [ ] 🟨 C10 — Replay pair/timing tower exists; session best/last/interval/reaction history is not a complete event timing system.
- [ ] ⬜ C11 — Session peak/finish speed trap, measured event leaderboard with manual/CSV entry and history strip.
- [ ] ⬜ C12 — Sealed prediction scoreboard across race-day runs; day PDF/CSV export.
- [ ] ⏳ C13 — Physical GPU 60 fps, final responsive/performance QA and independent measured replay/correlation validation.

### D. Race analysis — implemented analyses, beyond the replay

- [x] ✅ D01 — uPlot speed/acceleration/thrust/drag channels with shared time cursor, A/B controls, zoom and trajectory uncertainty band.
- [x] ✅ D02 — Scenario Δtime trace; scenario/preset comparison is not automatically the best measured run.
- [x] ✅ D03 — Monte Carlo time histogram, p5/p50/p95 and rank-correlation sensitivity tornado.
- [x] ✅ D04 — Time-budget and ±10% sensitivity metrics, plus ms/g, ms/cm² and Crr exchange-rate metrics (`BreakdownPanel.tsx`).
- [x] ✅ D05 — Model energy metrics and native ECharts Sankey with signed integration residual (`EnergyPanel.tsx`); tether remains unmodelled.
- [x] ✅ D06 — Racing-points scenario, round/head-to-head probabilities and current simulation baseline adoption. Generated scenarios remain synthetic/estimated.
- [ ] 🟨 D07 — Complete launch/burnout/peak/finish annotations, automatic best-run ghost and all chart exports/overlays.
- [ ] ⬜ D08 — Race time-budget stacked chart including editable measured reaction; current breakdown request uses reaction 0.
- [ ] ⬜ D09 — Race-level SALib indices, Monte Carlo convergence plot and full uncertainty variance budget.
- [ ] 🟨 D10 — Native Sankey and closure-error accounting connected; supported tether contribution and physical validation remain.
- [ ] ⬜ D11 — Points distribution and optimal legal mass curve; existing what-if mass sparkline is not that curve.

### E. ORACLE / optimisation — target: explainable, constrained design decisions

- [x] ✅ E01 — NumPy/SciPy GP and expected-improvement recommendation; four-variable study-family filter.
- [x] ✅ E02 — GP mean aero map with observations and next-point marker.
- [x] ✅ E03 — Synthetic GP-vs-LHS mean benchmark, currently five seeds.
- [x] ✅ E04 — Actual SALib Sobol/Morris analysis of the fitted GP, with confidence outputs.
- [x] ✅ E05 — Build selected study → canonical CAD import → FORGE → parameterised Design/evidence → exact-design CAD/rules links and existing CFD dialog.
- [x] ✅ E06 — Observation validation, serialized atomic campaign appends and retained synthetic labels.
- [x] ✅ E07 — Preregistered equal-budget native Optuna TPE/CMA-ES + Sobol/LHS/random benchmark queue, 10–20 seeds and regret confidence bands built. ⏳ Full study/browser review; synthetic only.
- [ ] ⬜ E08 — Accepted-only CFD feedback, STEP-to-mesh hash guard and performance-rule gate in the closed-loop handoff.
- [ ] ⬜ E09 — Separate synthetic and physical/accepted-CFD training; current manual observation interface is not independent acceptance.
- [ ] 🟨 E10 — GP mean/SD, posterior interval, refitted held-out target and residual/coverage charts connected; accepted-candidate campaign evidence and final browser review remain.
- [ ] 🟨 E11 — Fitted length scales/noise/status and benchmark acquisition reasons connected; real-campaign timeline and engineer veto/edit remain.
- [ ] ⬜ E12 — pymoo drag/mass/margin Pareto front and racing-points optimisation objective.
- [ ] 🟨 E13 — Adjoint tooling exists; accepted primal/adjoint, connected map and constrained shape optimisation remain. Multi-fidelity is removed by TODO.

### F. Calibration and physical-test planning

- [x] ✅ F01 — Unit-aware timing CSV/XLSX preview and optional thrust CSV; explicit timing definition, priors, mass, density and uncertainty.
- [x] ✅ F02 — Bounded Bayesian importance-sampling fit, posterior summaries, importance ESS and separate supplied held-out predictions.
- [x] ✅ F03 — Saved calibration inputs/results/source files with hashes; browse/reopen studies.
- [x] ✅ F04 — D-optimal timing/coast-down planner, editable assumptions and expected uncertainty reduction.
- [x] ✅ F05 — Single-fit concurrency gate and disabled input editing while fitting/planning.
- [x] ✅ F06 — Lab-day/Track-day/Custom protocols and Base UI Advanced sections connected; Calibration has six main inputs and Planner four. Hidden invalid settings reveal themselves; priors/uploads are preserved. Brief in-app 1440/375 px, overflow and planner API checks passed (see `evidence/F06-protocol-forms.md`).
- [ ] ⬜ F07 — Prior-vs-posterior plots, across-run error scoreboard and posterior predictive-check plot.
- [ ] 🟨 F08 — Paired CSV, mean CI, prospective power/MDE, declared pairing basis and evidence connected; formal preregistration, required-sample-size solver and field validation remain.
- [ ] ⬜ F09 — Repeat-run control chart and gauge R&R workflow.
- [ ] ⬜ F10 — Explicit application of a saved posterior to Race with a linked model/source record.
- [ ] ⏳ F11 — Team measurements: part masses, dimensions, coast-down, thrust, tether/launch repeatability and independent held-out runs. ArviZ R-hat must remain unavailable for the current importance sampler; do not invent multiple chains.

### G. FORGE / scrutineering — target: honest, risk-ranked compliance

- [x] ✅ G01 — India NF default rulebook, per-rule page/value/limits/state/margin and points at risk; 80 YAML entries counted by current implementation.
- [x] ✅ G02 — Existing wheel/axle/layout, rolling-band, sampled-wing-section, named-notch and rear-wing-plane measures; unsupported geometry remains manual.
- [x] ✅ G03 — Hash-bound CAD remeasurement and rule-to-part focus.
- [x] ✅ G04 — Unit-filtered nearest-limit chart/list with rule/page and CAD focus (`FrontierPanel.tsx`); single-design ranking, not full feasible-space map.
- [x] ✅ G05 — Manufacturing-spread pass-probability API, Rules summary and per-rule probability plot/table (`forge_probability.py`, `LegalPanel.tsx`); independent Normal assumptions and team-entered spread, not measured process capability.
- [x] ✅ G06 — All-rule margin bars with ±1σ bands and percent-of-span margins, rule page and points × failure-probability ordering are connected (`forgeMargin.ts`, `LegalPanel.tsx`, `forge_probability.py`); spread is a team-entered Normal assumption, not measured process capability.
- [ ] ⬜ G07 — Canonical wall thickness, chamber hole detection, full section chord and standard halo/helmet comparison.
- [ ] ⬜ G08 — Who/tool/when inspection log and interactive dimensional what-if.
- [ ] 🟨 G09 — Compact one-page fail/risk/manual/CAD-pass summary connected (`summary.typ`, `/v1/forge/summary.pdf`); fully linked source-PDF evidence archive remains.
- [ ] ⏳ G10 — Word-for-word official PDF coverage reconciliation and physical measurement/load-test acceptance. YAML count alone is not a coverage proof.

### H. Structure

- [x] ✅ H01 — Beam FEM API and Strength panel with part/load presets, deflection/stress/safety-factor metrics and handbook-source warning.
- [ ] 🟨 H02 — Solver nodal deflection/stress plots and a configured-part comparison table (up to four captured cases) connected; browser/material validation and physical load testing pending.
- [ ] ⬜ H03 — Predicted-vs-measured load-test chart and evidence-backed before/after story.
- [ ] ⏳ H04 — Real material measurements before CalculiX 3D halo/wing-mount analysis and mesh convergence.

### I. Project / enterprise

- [x] ✅ I01 — Editable saved plan, estimate sources, currency/start date, assumptions and scorecard/evidence-gap indicators.
- [x] ✅ I02 — Saved Monte Carlo project forecasts with exact plan/result artifacts and history.
- [x] ✅ I03 — Project V&V dossier panel.
- [ ] ⬜ I04 — Actual-evidence planned-vs-actual Gantt, risk matrix and compute/effort chart.
- [ ] ⬜ I05 — Connected decision log, risk register, minutes, receipts/budget and test-day lessons workflow.
- [ ] ⬜ I06 — Sponsor report and sourced tool-cost comparison.
- [ ] ⏳ I07 — Official judging weights and real-delivery validation; declared points are not awarded points.

### J. Evidence, reports and judging

- [x] ✅ J01 — Append-only typed SQLite records, content-addressed artifacts, timeline and hash verification.
- [x] ✅ J02 — React Flow/Dagre lineage and ID-linked missing-action/coverage view.
- [x] ✅ J03 — Sealed prediction/score workflow and persisted RFC3161 verification history tied to exact token and trust-bundle artifacts.
- [x] ✅ J04 — Saved calibration and project forecast evidence; V&V dossier JSON/Markdown with failures and limitations.
- [x] ✅ J05 — Judge ZIP manifest, hashes and missing-material inventory; Typst PDF and data-driven Presenter with notes/timer.
- [ ] 🟨 J06 — Full action linkage and real export/download acceptance; a gap detector does not itself record the missing action.
- [ ] 🟨 J07 — Hash-pinned artifact verification page, Evidence links and native QR SVG/export connected; OpenTimestamps anchor, public deployment and browser/scan verification remain.
- [ ] ⬜ J08 — Register official PDFs, baseline and every CFD run in evidence; signed release/seal tag workflow.
- [ ] 🟨 J09 — Three-minute timed walkthrough script, honest limitations slide and baseline/change/prediction/measurement one-pager written; 60+ judge Q&A bank, timed teammate run and recorded fallback remain.
- [ ] 🟨 J10 — Report, sheet and summary PDFs now carry full rulebook/geometry hashes, code commit/dirty state (captured fresh per export, with capture time) and generation time; run-manifest identity, offline demo and recorded fallback remain.
- [ ] ⬜ J11 — Red-team and post-event regret reports; existing V&V dossier does not implement these.
- [ ] ⏳ J12 — Real trusted timestamp chain, independent measured race scores and accepted CFD evidence.

### K. Analysis/chart catalogue — every TODO §14 target accounted for

These rows track the WHOLE requested chart, so partial rows can contain built components listed above. All require the shared units/provenance/export/hover/uncertainty quality bar and final browser acceptance. No chart gets a full tick from an unconnected API.

| ID | Requested analysis/chart | Build status | Connected portion and exact remainder |
|---|---|---|---|
| W01 | Cd/CdA + grid uncertainty | 🟨 | Grid-study Cd/CI/GCI exists; consistent CdA uncertainty presentation/accepted source remains. |
| W02 | Residual/force convergence + gate | 🟨 | Histories/window shading exist; full explicit gate-line and linked comparison treatment remains. |
| W03 | Component drag waterfall, pressure/friction | ⏳ | Signed waterfall, pressure/friction view and PNG export connected; browser/accepted-CFD review pending. |
| W04 | Centreline Cp + surface Cp | 🟨 | Surface Cp exists; top/bottom centreline plot absent. |
| W05 | ΔCp / Δwake / Δforces | 🟨 | Strict same-mesh ΔCp exists; Δwake/Δforces absent. |
| W06 | Wake planes + momentum drag | 🟨 | Three native planes/velocity ratios exist; deficit contours/drag cross-check incomplete. |
| W07 | Q cores coloured by vorticity | 🟨 | Q surfaces exist; colour is speed, not vorticity. |
| W08 | LIC/separation lines | ⬜ | No connected surface LIC/separation presentation. |
| W09 | Speed / yaw / ride height | 🟨 | Speed-study chart exists; yaw/ride-height automation/plots absent. |
| W10 | Frontal area vs Cd | ⬜ | No connected trade chart. |
| W11 | Mesh/y+ maps + skew histogram | 🟨 | Mesh/acceptance facts exist; spatial maps and histogram absent. |
| R01 | Linked trajectory traces and events | 🟨 | uPlot tracks/cursor/bands exist; complete launch/peak annotations and all overlays/exports remain. |
| R02 | Ghost Δtime vs best run | 🟨 | Scenario Δtime exists; automatic best real-run selection absent. |
| R03 | Time-budget stacked bar | 🟨 | Budget metrics exist, reaction fixed to zero; requested stacked chart absent. |
| R04 | Tornado + SALib race indices | 🟨 | Rank-correlation tornado and perturbation sensitivity exist; race Sobol indices absent. |
| R05 | Exchange rates | ✅ | Connected ms/g, ms/cm² and Crr metrics; final shared quality/browser gate pending. |
| R06 | MC histogram + convergence | 🟨 | Histogram/quantiles exist; sampling-convergence plot absent. |
| R07 | Energy Sankey | 🟨 | Native ECharts Sankey, signed integration residual and PNG export connected; tether remains unmodelled; ⏳ browser review. |
| R08 | Points distribution/round/head-to-head | 🟨 | Scenario expected points/round/head-to-head exists; full distribution absent. |
| R09 | Optimal mass curve | 🟨 | What-if mass sparkline exists; full optimum/legal-mass curve absent. |
| O01 | GP map + uncertainty/next point | ✅ | Mean/posterior-SD toggle and next point connected; ⏳ browser review. |
| O02 | Regret benchmark + 10-seed CIs | ⏳ | Six-method preregistered queue and CIs connected; full numerical study/browser pending. |
| O03 | Predicted vs actual candidates | 🟨 | Held-out predictions vs stored targets connected; accepted campaign data pending. |
| O04 | Predictive interval calibration | ⏳ | Refit LOO coverage/Wilson chart connected; real-data/browser verification pending. |
| O05 | Length scales + Sobol importance | ⏳ | GP length-scale chart/table, fitted noise, optimiser status/bounds and SALib connected; browser/accepted-data review pending. |
| O06 | Pareto front | ⬜ | No connected pymoo/objective front. |
| O07 | Acquisition history | 🟨 | Benchmark trial reasons/table/full export built; real-campaign timeline pending. |
| S01 | Prior/posterior plots | 🟨 | Prior controls/posterior summaries exist; density plots absent. |
| S02 | Error shrinking scoreboard | 🟨 | Saved studies and a comparable held-out MAE/RMSE table exist; a per-run shrinking-error trend over new measurements is absent. |
| S03 | Posterior predictive checks | 🟨 | Held-out numeric intervals exist; PPC chart/appropriate diagnostics absent. |
| S04 | Paired CI / minimum detectable effect | ⏳ | Native SciPy paired t CI, plot, prospective power/MDE and source/result evidence connected; browser/real paired validation pending. |
| S05 | Repeat-run control chart | ⬜ | No connected chart. |
| S06 | Full uncertainty variance budget | 🟨 | Input rank correlations exist; CFD/reaction/timing variance decomposition absent. |
| F01 | Margin bars + tolerance bands | 🟨 | Unit-filtered headroom bars and percent-of-span margins exist; manufacturing band/points ordering incomplete. |
| F02 | Per-rule pass probability | 🟨 | Probability API/overall summary and plotted worst-first table connected; browser review incomplete. |
| F03 | Legal-frontier boundaries | 🟨 | Single-design nearest limits/rule pages and percent-of-span margins exist; sampled feasible frontier absent. |
| F04 | Red/amber/green summary | 🟨 | Rule states/counts and compact one-page summary exist; official source-PDF archive absent. |
| T01 | Deflection/stress plots | ✅ | Solver nodal deflection and bending-stress plots, strength reference, linked cursors and PNG export connected; ⏳ browser/physical material review. |
| T02 | Per-part safety-factor table | 🟨 | Configured-part comparison table for up to four captured cases exists; physical load-test validation and actual-car geometry remain absent. |
| T03 | Predicted vs measured load | ⬜ | No connected chart/data workflow. |
| P01 | Planned vs actual evidence timeline | 🟨 | Editable plan/forecasts exist; evidence Gantt absent. |
| P02 | Risk matrix | ⬜ | No connected matrix. |
| P03 | Effort/CFD-hours | ⬜ | No connected chart. |

### L. App quality and verification

- [x] ✅ L01 — Shared dark tokens, Inter/mono numbers, Base UI controls, command palette, shortcuts and toast foundations.
- [x] ✅ L02 — Native uPlot/ECharts, Dockview and React Flow integrations; loading/empty/error patterns exist across major workspaces.
- [ ] 🟨 L03 — Consistent per-screen provenance, chart exports/linked cursors, all table keyboard interactions and ≤6 main form inputs remain uneven.
- [ ] ⬜ L04 — Screenshot/fix/rescore each workspace at 1440/1024/375; no page accepted at ≥8/10 from source inspection alone.
- [ ] ⬜ L05 — Current shared chart quality checklist passed for all 43 catalogue entries.
- [ ] ⏳ L06 — Physical-Mac rendering/memory profile, full final fast checks and accepted-source review.
- [ ] 🟨 L07 — Existing CI/static/unit tooling exists; coverage targets, targeted Hypothesis properties, OpenAPI-generated types and nightly golden path remain.

### M. Removed scope and cleanup — never silently re-add

- [x] ✂ M01 — AR, photo/video scrutineering, photogrammetry, community calibration, competitor scraping and base-bleed removed from scope (T26/T28/T30/T31/T32/T35).
- [x] ✂ M02 — Multi-fidelity ORACLE and BoTorch cross-check removed; gradient/adjoint targets remain separately conditional.
- [x] ✂ M03 — Windows/Linux matrix, Docker/devcontainer, mutation testing, 8-hour soak, multi-user concurrency and Zenodo/Software Heritage archive removed.
- [x] ✂ M04 — Drawing/render packs and DXF/SVG importer belong to other team work and are removed from innovation scope by TODO.
- [x] ✅ M05 — Wind Tunnel static Render tab removed; report-cover rendering is still allowed.
- [x] ✅ M06 — Removed Drawings tab, PDF API, generator/template and judge-pack drawing hooks/metadata. Saved files remain untouched; competition drawing requirement stays in the team scorecard.
- [ ] 🧹 M07 — Remaining duplicate badges/charts, obsolete target references, long forms and confirmed dead code need focused cleanup.

### Sprint order and tick discipline

1. Finish this complete per-area ledger and scope tags; preserve the active particle draft.
2. Complete and land one bounded software feature at a time, updating its IDs and the relevant chart row in the same commit.
3. Prioritise F06 short preset/Advanced forms, C07 Race tab consolidation, then E07 benchmark/uncertainty work and E08 closed-loop handoff. Keep B04 integration ahead of any competing tunnel implementation.
4. Code ticks require connected source and focused checks. Visual/performance/scientific gates stay unchecked until their evidence exists. The old 45% half-point task score is historical and must not be presented as today's detailed feature completion.

### 2026-11-03 ORACLE / Race code sprint update

C07 and E07 software landed; mean/SD map, held-out target and coverage charts connected with synthetic provenance. Native Optuna/CMA-ES, SciPy qmc and TanStack v9 adopted with licences. Evidence: `evidence/ORACLE-native-benchmark.md`, `evidence/C07-race-navigation.md`. No CFD/full numerical campaign launched; browser/scientific gates remain open. Existing Cd-based early stopping confirmed in generated code, not benchmarked on v2606. This supplements §23 and §28; no completion percentage is inferred.

### CFD stopping controls — 2026-11-03

Existing Cd convergence settings are now auditable through API → durable queue → CLI → case manifest/controlDict: optional tolerance, window, iteration cap and disable switch. Conflicting settings and impossible windows are rejected. Independent mesh/force/averaging acceptance gates are unchanged. No solver launched and no speed-up measured. Evidence: `evidence/CFD-stop-controls.md`.

### Scope cleanup — 2026-11-03 (§23 update)

M06 complete: removed drawing UI/API/generator/template and judge-pack hooks, metadata and false missing-deliverable warnings. Existing output/data untouched. Cut T22/T24/T26/T28/T30/T31/T32/T35 rows removed from active task tables; historical scope score normalised to 27 tasks, not treated as new engineering progress. Competition drawing obligations remain team work. Evidence: `evidence/M06-drawing-cleanup.md`.

### Analysis chart batch — 2026-11-03 (§23 update)

Native ECharts energy Sankey replaces the hand-built share bar, preserving signed numerical closure error and explicit missing tether term. Beam charts now use solver nodal deflection/stress, estimated strength line and PNG export. Zero-load safety factor is JSON-safe null (UI infinity), not non-finite JSON. R07 remains partial for tether; T01 chart software built, browser/material validation pending. Evidence: `evidence/ANALYSIS-energy-structure.md`.

### Signed drag waterfall — 2026-11-03 (§23 update)

ForceBars now has native ECharts floating waterfall bars and retained pressure/friction view, using existing signed component force records. Computed component sum is labelled separately from solver total-force acceptance. Negative contributions/zero crossings preserved; PNG export added. No CFD launched. Evidence: `evidence/W03-component-waterfall.md`.

### Paired timing analysis — 2026-11-03 (§23 update)

Race Calibration has lazy Model / Paired-test subviews. Native SciPy paired t-test CI and noncentral-t planning power/MDE, native ECharts difference plot and TanStack source table connected. Exact CSV/settings and derived result saved as linked estimated-source artifacts; no row filtering or automatic measured claim. Pairing protocol declaration required; formal preregistration and real paired data remain. Evidence: `evidence/S04-paired-timings.md`.

### Artifact verification and QR — 2026-11-03 (§23 update)

Connected `/verify/[artifactId]` from Evidence with recorded/computed/pinned SHA-256 status, native qrcode.react SVG generation/export, source provenance and missing/mismatched states. Single-artifact API exposes metadata only. All evidence hash scans now stream files with hashlib.file_digest, avoiding whole-file memory use. No authorship/time/science validity inferred; localhost links are not publicly hosted. Browser/scan/public-hosting checks remain open. Evidence: `evidence/ATLAS-artifact-verification.md`.

### GP fitted-parameter diagnostics — 2026-11-03 (§23 update)

Sensitivity now displays normalised/physical RBF correlation lengths, optimisation convergence and bound-hit status, fitted CdA noise SD and duplicate-input count. Native ECharts/TanStack and PNG export reused. Noise is explicitly a marginal-likelihood nugget, not a repeat-run measurement; repeat-noise calibration remains open. Evidence: `evidence/O05-gp-parameters.md`.

### Reaction-practice statistics — 2026-11-03 (§23 update)

Trainer restores local history on open and records timestamped reactions/false starts, bounded to 500 attempts, with median/p10/p90/sample SD and native ECharts latest-50 trace/PNG plus full JSON export. Legacy numeric results keep null timestamps and do not invent historical false-start counts. Storage failures preserve a session copy; hidden-tab trials cancel; key-repeat/editable-field shortcuts ignored; immediate phase ref prevents duplicate event records. Browser latency/track validation remains open. Evidence: `evidence/RACE-reaction-statistics.md`.

### Stop checkpoint — 2026-11-04 (§23 update)

Owner requested a stop after the current bug fix. Engineering PDF now handles absent/empty benchmarks, identifies ORACLE observations accurately, names LHS correctly, labels GP one-SD uncertainty, and only chooses accepted cover runs explicitly bound to the selected design. Five report tests and one synthetic PDF render check passed. The FORGE one-page summary was not started. Full remaining-work counts and priority buckets are recorded in PROGRESS.md and `evidence/CHECKPOINT-2026-11-04.md`. All code from this sprint is committed; the pre-existing animated-flow draft remains separate. No CFD or servers started.
