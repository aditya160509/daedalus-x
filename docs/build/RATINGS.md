# Honest ratings, cuts, analysis to add, open source to use (2026-11-02)

Scale: **10** = could ship in a commercial tool · **7** = good, needs polish · **5** = works but looks amateur · **3** = confusing or misleading · **0** = remove.
These are my honest views from the screenshots and the code, not marketing.

## 1. Rate every page

### Pit Wall (home)
| Part | Score | Verdict | Why |
|---|---|---|---|
| Flow hero image | 7 | Keep | Looks real; needs a caption saying which run and the date |
| Aero score gauge "97" | **3** | **Remove or redefine** | A made-up 0–100 score on synthetic data. Judges will ask "97 of what?" Replace it with *CdA vs the best possible in the design space, in cm²* |
| Drag area / race time / runs / next gain | 6 | Keep | Useful; needs uncertainty (±) and a source badge |
| Sealed prediction | 8 | Keep, make it the star | Our best innovation; give it a bigger, dedicated place |
| Next run · ORACLE | 6 | Keep | Needs a "Build design → Run CFD" button (the closed loop) |
| Legal · FORGE | 5 | Fix | Wrong rulebook (2026/27 reference, not **India NF 2025-26**); no link to the part in CAD |
| ORACLE tab: aero map + benchmark | 7 | Keep | Strong. Label "synthetic" more clearly until real runs exist |
| Legal tab | 4 | Merge | It duplicates the Overview panel; move it into Design → Rules |

### Wind Tunnel
| Tab | Score | Verdict | Why |
|---|---|---|---|
| Flow (old R3F view) | **3** | **Replace** | Spaghetti streamlines, cluttered toolbar, and it opens a *rejected* run by default (screenshot). Looks amateur next to 3D Flow |
| 3D Flow (vtk.js) | 6 | Keep, becomes the main Flow | The right engine; needs lighting, tubes, Q-criterion vortices, wake planes |
| Render | 7 | Keep | Photo stills; add a compare-two-runs side-by-side |
| Forces | 6 | Keep | Build-up chart is good; needs one chart theme and units on every axis |
| Convergence | 5 | Fix | Show the acceptance gate clearly: why a run is *rejected* |
| Mesh | 4 | Fix | Needs a y+ map, skewed-cell overlay and a Richardson grid-independence result |
| "New run" + "Jobs 5" | 5 | Fix | Turn it into a wizard (FoamPilot pattern) with live residuals |

### Design Studio
| Tab | Score | Verdict | Why |
|---|---|---|---|
| CAD (Chili3D) | 7 | Keep | Real CAD, connected; ribbon is crowded on small screens |
| Inspect (old 3D viewer) | 5 | Merge | Overlaps with CAD; keep only its measurements and part table as a CAD side panel |
| Rules | 5 | Fix | Same as FORGE: India rules + click to jump to the part |

### Race
| Tab | Score | Verdict | Why |
|---|---|---|---|
| Replay | **4** | **Rebuild** | Grey blocky cars, empty track, a START gate floating mid-view (screenshot). Needs our real car model, a real 20 m track, and broadcast cameras |
| Timing tower | 6 | Keep | Nice idea; the purple/yellow blocks don't explain what they mean |
| Telemetry | 5 | Fix | Needs linked cursors and fast charts (uPlot) |
| Spread (Monte Carlo) | 6 | Keep | Good analysis; needs a histogram plus a tornado chart showing which input matters |
| Ghost | 5 | Merge into Replay | A separate tab for one delta line is too thin |
| Start (reaction trainer) | 6 | Keep, move | Fun and useful; belongs as a small tool, not a main tab |
| What-if inputs (left column) | **3** | **Collapse** | A tall stack of sliders with "commit to sweep" labels nobody understands. Use presets plus an advanced drawer |

### App-wide
| Part | Score | Verdict | Why |
|---|---|---|---|
| Shell (left rail, header, run picker) | 7 | Keep | Clean and Linear-like |
| Present button (bright cyan) | 4 | Restyle | Loudest thing on screen; it should be quiet |
| "Simulated" badge repeated 3× per screen | 3 | Remove repeats | Show it once, in the header |
| Evidence drawer (E) | 6 | Keep | Add the lineage graph (xyflow) |
| Presenter (P) | 6 | Keep | Add the QR verify page for the sealed prediction |
| PDF report | 6 | Keep | Add India-rules compliance pages and the run gallery |
| Settings | ? | Check | Not reviewed yet |

**Overall today: about 5.5/10.** The engineering underneath is strong (CFD, GP optimiser, rules, evidence). The **UI quality is uneven**: some screens are 7, some are 3, and judges remember the 3s.

## 2. Remove or merge (do these first; quick wins)
1. Aero score "97" gauge → replace with real CdA vs the best possible
2. Old Flow tab → 3D Flow becomes Flow
3. Pit Wall Legal tab → move into Design → Rules
4. Design Inspect tab → becomes a CAD side panel
5. Race Ghost tab → becomes a Replay overlay
6. Race What-if stack → presets plus an advanced drawer
7. Duplicate "Simulated" badges, loud cyan Present button, rejected runs as defaults

## 3. More analysis worth adding (ranked by points ÷ effort)
1. **India NF compliance report:** every rule, measured value, margin and penalty risk, with a printable scrutineering sheet. *(Scrutineering 160 pts)*
2. **Drag breakdown by part:** body, wings, wheels, % of total; pressure vs friction drag. *(we have the data)*
3. **Run comparison:** two runs side by side, ΔCp on the surface, Δ wake, Δ forces.
4. **Grid independence (Richardson):** proves the CFD numbers are trustworthy. *(Judges love this.)*
5. **Sensitivity (tornado):** which of mass, CdA, thrust and rolling resistance changes race time most. Answers "what should we work on?".
6. **Adjoint drag map:** colour the car by "push this surface in or out to cut drag". *(`adjoint.py` exists)*
7. **Prediction vs reality:** after each physical race, the calibration curve and error shrinking over time. *(`calibration.py` exists)*
8. **Wheel and wake analysis:** wheel drag share; vortex cores (Q-criterion).
9. **Mass budget:** part masses vs the minimum mass rule, with where to add or remove material.
10. **Cost of each design change:** ms gained per mm changed, for the verbal presentation.

## 4. Open source to use (major search: what already exists)
| Area | Best existing project | Licence | Use it for | Honest note |
|---|---|---|---|---|
| CFD viewer | **trame** (Kitware) + PyVista | Apache-2.0 | Full ParaView-grade web viewer driven from Python: clip, slice, contours, Q-criterion, server rendering | Strongest option: replaces most hand-written viewer code. Needs a server render process. |
| CFD viewer (client) | vtk.js + ParaView Glance | BSD-3 | What we have now | Good for light layers |
| ParaView Web | Kitware/paraviewweb | BSD-3 | Older framework | trame supersedes it; skip |
| Renders | F3D | BSD-3 | Turntables, PBR stills | PyVista is already good enough; optional |
| CFD setup | OpenFOAM motorBike / DrivAer tutorials | GPL | Mesh and turbulence settings, validated | Use as reference settings |
| Run wizard | FoamPilot | MIT | Wizard and monitor UX | Copy patterns |
| Race/vehicle sim | TUMFTM race-simulation / laptime-simulation | check (LGPL/GPL) | Validation of our race model structure | Reference only |
| Vehicle dynamics | fastest-lap | check | Reference | Overkill for a 20 m straight |
| Telemetry UI | f1-dash, F1 Replay Timing, matteocelani/f1-telemetry | check | Broadcast timing tower, speed traces, track map layouts | Copy layout patterns, check each licence |
| Telemetry data style | FastF1 / OpenF1 | MIT | Chart conventions (speed trace, delta) | Patterns only |
| Charts | uPlot (fast), ECharts (rich) | MIT / Apache | One chart theme | Already have ECharts |
| Dashboard UI kit | shadcn/ui templates (Tailwind v4 + Base UI) | MIT | Page layouts, tables, cards | We already use the same stack; take patterns for density |
| Dock panels | dockview | MIT | Pit Wall | Patch drafted |
| Graph | xyflow | MIT | Evidence lineage | |
| Parametric CAD | build123d / CadQuery | Apache | ORACLE builds the geometry | build123d is already installed |
| Industry benchmark | Synopsys/Ansys "STEM Racing digital twin racetrack" | commercial | What top teams use | We match the idea for free: say this to judges |

**Biggest single upgrade:** **trame + PyVista** for the Wind Tunnel. It gives ParaView-level analysis (clip, slice, contours, vortices, probes) in the browser from code we already write in Python, instead of hand-building every layer in vtk.js.

## 5. Order of work
1. Quick cuts (§2), about 1 session
2. India NF rules + rule→CAD jump
3. Wind Tunnel on trame (or vtk.js+) with clean defaults; compare runs; grid independence
4. Race replay rebuild (real car, track, broadcast HUD)
5. Analyses §3.1–3.5
6. Closed loop, adjoint map, calibration (§3.6–3.7)
7. Full QA with CHECKLIST.md
