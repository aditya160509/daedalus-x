# Cut and Add (2026-11-01)

The aim is the most points and the Innovation award at Nationals. Every item maps to the official scoring (STEM Racing Platform C, Professional class, 1,000 pts):

| Category | Points | Daedalus X feature |
|---|---|---|
| Racing (time trials 105, reaction 105, knock-out 30, fastest 10) | 250 | TITAN + **reaction trainer (new)** |
| Design & Engineering portfolio (9 criteria) | 180 | AETHER + ORACLE + auto-report (T13) |
| Enterprise + pit display | 180 | Competition Mode on the pit screen |
| Spec & Scrutineering (spec 100, drawings 20, renders 20, finish 20) | 160 | FORGE (T11) + Design Studio renders |
| Verbal presentation | 140 | Competition Mode (T13) |
| Project management | 90 | Evidence timeline (T12) |

Innovation is an award, not a points category. Judges reward one clear claim that is proven live, so the headline is: **"We predicted our race time before racing, sealed it with a hash, and scored it in front of you."** Everything below either feeds that claim or earns points.

## 1. Remove (do now)

| # | Cut | Why | Saves |
|---|---|---|---|
| R1 | **T05 adjoint UI and further adjoint work.** Keep the code that exists and freeze it. | The spec itself lists adjoints as Tier 2. It earns no points and isn't needed for the headline claim. | ~4 h |
| R2 | **Ax/BoTorch in T10.** Use Optuna `GPSampler` and optuna-dashboard. | Same Gaussian-process search in one library we already have. No custom charts. | ~1.5 h |
| R3 | **Hand-built ORACLE charts** (Pareto, parallel coordinates, importance). | optuna-dashboard ships them (MIT). Link or embed it. | ~1 h |
| R4 | **T11 line-level PDF validator** (pdfplumber page:line resolution). | Page references are enough for judges. Rules are hand-encoded YAML anyway. | ~45 min |
| R5 | **T13 Jinja2 layer.** Pass JSON to Typst with `sys.inputs`. | One templating system instead of two. | ~20 min |
| R6 | **Dockview.** Keep react-resizable-panels. | Over the bundle budget. Resizable panels already work. | done |
| R7 | **Spec §13.4 calendar, §17 team model, §18 intake checklist, §13.3 Tier 2 roadmap.** Move them to `docs/ROADMAP.md`. | Planning prose, not build instructions. It makes SPEC.md about 25% shorter. | reading time |
| R8 | **Neural operators, multi-fidelity, DrivAerNet transfer, Z3 formal rules.** | Large models need thousands of CFD cases; we will have about 30. A GP is the honest choice. | n/a, never start |

## 2. Add (highest innovation and points per hour)

Each row says what open source already provides, so we copy rather than build.

| # | Add | Points / innovation | Already made (copy) | Ours | Time |
|---|---|---|---|---|---|
| A1 | **Sealed-prediction live scoreboard.** On race day, enter the measured time and the sealed prediction is revealed and scored with its interval. Shown full screen in Competition Mode. | Headline innovation, racing, verbal | Sealing and scoring API is done (T09). `motion` for the reveal. | One screen | 1 h |
| A2 | **Reaction-time trainer.** Start-light sequence (keyboard or a USB button), logs every reaction to Evidence and shows the distribution and the trend. | Reaction racing = **105 pts** | Web Audio API and Gamepad API (browser built-ins) | Lights UI and logging | 1 h |
| A3 | **Scrutineering pre-check scored in points.** Each failed FORGE check shows the expected penalty against the 100-pt spec score. | Spec & Scrutineering 160 | Rules come from the SRWF26 Technical Regulations (YAML). three-cad-viewer-style highlighting already exists in the Design viewer. | Rule content | inside T11 |
| A4 | **Phone video speed trace.** Upload a race video. OpenCV tracks the car, a scale is set from track marks, and the result is position/velocity, imported straight into calibration. | The spec needs this (Tier 0). Strong evidence for TITAN. | OpenCV `TrackerCSRT` (Apache-2.0), ffmpeg | Scale-setting dialog | 2 h |
| A5 | **Live thrust stand.** HX711 load cell → Arduino → browser over Web Serial. The thrust curve streams into calibration. | Measured-not-assumed physics. Very visual on the pit display. | HX711 Arduino library (MIT), Web Serial API | Plot and import | 1.5 h (plus about £15 of hardware) |
| A6 | **Portfolio auto-report mapped to the 9 D&E criteria.** One Typst section per criterion, with figures carrying source IDs and hashes. | D&E 180 | Typst plus an existing report template (`isc-hei-student-templates`, MIT) | Section content | inside T13 |
| A7 | **Budget-matched benchmark card.** "ORACLE reached X with 10 runs; random search needed Y." This is already in T10. Make it the hero card. | Proof of the innovation claim | optuna `RandomSampler` vs `GPSampler`, same budget | Card | inside T10 |

Total added: about 6.5 h. Total removed: about 7.5 h. **Net: about 1 hour less than now, with more points.**

## 3. Revised order

1. T10 ORACLE, slimmed (R2, R3, A7): ~1.5 h
2. A1 scoreboard and A2 reaction trainer: ~2 h
3. T11 FORGE with A3: ~2 h
4. A4 video speed trace: ~2 h
5. T12 Evidence: ~2 h
6. T13 Competition Mode, report and AR (A6, R5): ~2 h
7. A5 thrust stand (once the hardware arrives)
8. Remaining UI (Haiku leftovers), T14 polish, then final QA and long runs L1–L5

## Sources
- Scoring points: STEM Racing Scoring Platform C spec (stemracing.com, Squarespace PDF), §2.3.
- Regulations: SRWF26 Competition and Technical Regulations; "Understanding the technical regulations" (stemracing.com, Feb 2026).
- optuna-dashboard: github.com/optuna/optuna-dashboard (MIT).
- DrivAerNet++ (8,000 cars): considered for R8 and rejected. The domain differs (road cars, not 1:20 CO₂ cars) and the dataset is far too large for us to use.

---

# Round 2: F1-grade, one dashboard, no physical add-ons (2026-11-01)

## In simple words
We looked at what real F1 teams and F1 TV use and copied the best ideas:
- McLaren/Motion Applied **ATLAS**: synced charts with one cursor.
- **AWS F1 Insights**: one performance score and "what if we'd done X".
- **Aero maps**: how drag changes as each shape setting changes.
- **f1-dash**: timing tower and mini-sector colours.

We drop anything that needs extra hardware or filming. We also drop most of the explanatory text and the many small labels. Everything goes on **one Pit Wall dashboard**: the old pages become panels you can expand, not separate screens.

## Cut (round 2)

| # | Cut | Why |
|---|---|---|
| C1 | **A4 video speed trace** | Needs filming. Use timing-gate times instead. |
| C2 | **A5 live thrust stand** | Needs hardware. Use the supplied thrust curve. |
| C3 | **6 pages → 4. No feature is removed; features are merged.** Home is the **Pit Wall** overview (score, sealed prediction, ORACLE next run with the aero map, FORGE legal ✓ and its rule list, Evidence timeline drawer, small 3D car, telemetry strip, timing tower). Deep pages: **Wind Tunnel**, **Design Studio**, **Race**. Optimize, Inspect and Evidence become Pit Wall panels and a drawer. | Several full 3D scenes on one page are slow and too small to use. Three nearly empty pages look unfinished. F1 tools use an overview plus detail screens. |
| C4 | **`PendingWorkspace` placeholder pages** and their "needs P1-02…" prose | Placeholder text in front of judges reads as unfinished. |
| C5 | **Most badges and tags.** One coloured source dot per number (green measured, blue CFD, grey assumed), with details on hover. | Too many chips looks AI-made. |
| C6 | **Long summaries and helper paragraphs in the UI.** Keep a title, a number and a unit; explanations go in tooltips. | F1 tools show numbers, not paragraphs. |
| C7 | **Settings page.** Move the 3 settings into the command palette. | Not needed as a whole page. |
| C8 | **GridStudyPanel as its own panel.** Reduce it to one "mesh verified ✓ (GCI x%)" chip that opens the details. | Judges need to see that the mesh was verified, not the whole study. |
| C9 | **Spec prose.** SPEC.md keeps rules and contracts only. Narrative and storyboard (§14), risk table (§16), source register (§20) and pitch (§21) move to `docs/ROADMAP.md`. | Spec length roughly halves. |
| C10 | **Flow layers nobody reads:** vortex cores, flythrough and the oil flow duplicate. Keep smoke, pressure skin, wake scanner and the sensitivity map. | Fewer toggles, faster frames. |

## Add (round 2): F1 commercial features, already made

| # | Feature (what F1 uses) | What it looks like for us | Copy from | Time |
|---|---|---|---|---|
| F1 | **Pit Wall dashboard** (ATLAS / f1-dash) | One page: 3D car with live airflow (centre), telemetry strip (bottom), timing tower (left), ORACLE next-run card, FORGE legal ✓, sealed prediction (right). Each panel can be maximised. | `react-resizable-panels` (already installed); f1-dash layout as a pattern | 2 h |
| F2 | **Synced cursor across everything** (ATLAS) | Scrub the time and the car moves on the 3D track, every chart's cursor moves, and speed/drag readouts update. | Ours already works on the Race page; lift it to a shared store | 45 min |
| F3 | **Mini-sector colours** (F1 TV) | The 20 m track is split into 8 mini-sectors, coloured purple (best ever), green (personal best) and yellow, on the track map and in the timing tower. | Pattern from f1-dash; ECharts `visualMap` | 45 min |
| F4 | **Aero map** (every F1 aero dept) | Heatmap of CdA across two design variables from the ORACLE GP, with tested points as dots and the "next run" star. | ECharts heatmap; GP `predict` from Optuna/sklearn | 1 h |
| F5 | **Car Performance Score** (AWS F1 Insights) | One 0–100 gauge each for aero, launch and legality, combined into one score shown big on the dashboard. | ECharts `gauge` | 30 min |
| F6 | **"Alternative strategy" what-if** (AWS) | Drag a slider (wing angle, mass) and the predicted race time and ghost car update instantly from the GP plus TITAN. | `whatIf.ts` exists; wire it to the GP | 45 min |
| F7 | **Delta-time trace** (every team) | A line showing ±ms against the best car along the track. | `raceMath.ts` already has delta; one ECharts series | 20 min |
| F8 | **Reaction trainer** (keeps A2: keyboard, no hardware) | F1-style 5-light start, ms result, best/avg/histogram | Web Audio API | 1 h |
| F9 | **Sealed-prediction reveal** (keeps A1) | Race-day card: "predicted 1.042 s ± 0.012 → actual 1.047 s ✓ inside" | API done (T09) | 1 h |
| F10 | **Race engineer voice** (team radio) | Optional: the dashboard speaks key events, e.g. "Prediction inside interval" or "Next run: wing +2°". | Web Speech API (built-in) | 20 min |

**Round 2 totals:** about 8.5 h added, about 6 h removed (C1, C2 and the routes/placeholders), so a net of about +2.5 h. Running total with round 1: **about +1.5 h** over the original plan, with far more F1 polish.

## Final build order
1. **F1 Pit Wall shell** (C3–C7): every later feature lands in it.
2. T10 ORACLE slim + F4 aero map + F5 score + A7 benchmark card
3. F2 synced cursor, F3 mini-sectors, F7 delta, F6 what-if
4. F8 reaction trainer, F9 sealed reveal, F10 voice
5. T11 FORGE (rules from the SRWF26 regs) → "Legal ✓" panel
6. T12 Evidence becomes a timeline drawer, not a page
7. T13 Competition Mode = the Pit Wall in presenter mode + Typst report + AR
8. Polish, then QA and long runs

## Sources (round 2)
- Motion Applied ATLAS product page: live/post-run telemetry, computed channels, multi-client.
- AWS F1 Insights: Car Performance Scores, Alternative Strategy (aws.amazon.com/sports/f1).
- Racecar Engineering, "Why F1 teams would be lost without aero maps" (Mar 2026).
- awesome-f1 (github.com/subinium/awesome-f1): f1-dash (Next.js), F1 Race Replay, Open Pit Wall (MIT).
- react-grid-layout was considered and rejected. react-resizable-panels is already installed and fits the bundle budget.
