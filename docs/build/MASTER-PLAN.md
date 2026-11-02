# Master plan: final form (2026-11-02)

The goal: every screen at commercial quality, every rule checked, every feature connected, and innovation the judges can't miss. **Plan only. Build in this order when usage allows.**

---

## 0. Status
- Jainam (`Jainamsomething25`) has **accepted** and is a collaborator.
- Done: CAD (Chili3D) connected, vtk.js 3D Flow, hero renders, sealed prediction, ORACLE, FORGE (10 rules), evidence trail, report PDF, presenter.
- **Critical gap:** FORGE uses the *Development 2026/27 reference* rulebook. We compete under the **STEM Racing India NF 2025-26 Technical + Competition Regulations** (now in `~/Downloads`). Replace it.

## 1. Legal: maximise every point (highest priority)
1. Copy both PDFs into `data/reference/rules/india_nf_2025_26/`, hash them, and record them as evidence.
2. Extract **every** measurable T-rule into a new YAML: length, width, height, wheel diameter and width, ground clearance, wing spans, chords and thickness, nose cone, cartridge chamber depth and diameter and height, tether guides, body "virtual cargo", decals, mass, wall thickness, no-go zones. Each rule gets page, measure, min, max, penalty and tolerance.
3. New FORGE measures beyond bounding boxes: wall thickness (ray casting), wheel diameter (cylinder fit), chamber position (hole detection), and section-based chord. Cover every rule a CAD model can check; the rest are flagged "physical check" with a printable inspection sheet.
4. **Rule → CAD jump:** click a failed rule → the CAD opens that part, selects and zooms it, and shows the measured dimension and the limit. (Bridge message `daedalus:focus {parts, dimension}`.) Penalty points add up live into "points at risk".
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
Later: Race replay rebuild, Ghost merged into Replay, Inspect merged into the CAD side panel.

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
