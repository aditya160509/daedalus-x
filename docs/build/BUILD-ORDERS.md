# Build orders: exact instructions for the next Claude

You (the Claude reading this) have plenty of usage. **Build these in order.** Each order says what to make, what to copy, which files to touch, the quality bar, and how to prove it works. Don't stop after planning: build, check, commit, push, then start the next order.

First, read `docs/build/HANDOFF.md` (architecture and gotchas), `MASTER-PLAN.md` §9 (UI bar) and §19 (analysis catalogue).

---

## Standing rules (apply to every order)

**Quality bar (T3 Code / Linear / shadcn):**
- One main view per tab and at most one side panel.
- Neutral greys plus one accent used only for the active state, 1px borders, no glow.
- Inter for UI, JetBrains Mono tabular numbers for values; a unit on every number.
- Base UI/shadcn components only (`apps/cockpit/src/components/ui/`).
- Skeletons while loading; a real empty state and error state on every panel.
- Works at 1440 / 1024 / 375 px with no squashed panels and no horizontal scroll.
- The provenance badge (measured / simulated / synthetic) shows once per panel, never duplicated.
- Charts follow `MASTER-PLAN.md` §14 (source badge, uncertainty band, crosshair, export, linked cursors).

**Open source:**
- Check the licence before copying: `gh api repos/<owner>/<repo> --jq .license.spdx_id`.
- AGPL/GPL/MIT/BSD/Apache/ISC/Zlib are OK. No licence = ideas only.
- Add a row to `THIRD_PARTY.md` and keep the original copyright headers.
- Remove foreign branding, analytics and API-key prompts.

**Connected:** every feature reads and writes our real data (designs, runs, ORACLE, FORGE, evidence). No demo data unless it's labelled `synthetic`.

**Check commands (run before every commit):**
```bash
cd daedalus-x
uv run ruff check src tests && uv run ruff format --check src tests
uv run pytest -q <your new/changed test files>           # add -m "slow or not slow" for heavy ones
pnpm --dir apps/cockpit exec tsc --noEmit
pnpm --dir apps/cockpit exec oxlint src
pnpm --dir apps/cockpit exec vitest run <changed .test.ts files>
```

**Browser check:**
1. Start the servers: `uv run daedalus-api` (port 8000; **restart it after every Python edit**) and `pnpm --dir apps/cockpit dev` (port 3000).
2. Open the page with a changing query string (`?v=N`), so a hash-only navigation doesn't reuse the old page.
3. Take a screenshot at 1440 and 375 px and check the console for errors.
4. Tick the matching boxes in `CHECKLIST.md`.

**Commit:** small, descriptive, ending with a `Co-Authored-By:` line for the model; push to `main`.

**Mac limits:** never run CFD, both dev servers and a heavy build all at the same time.

---

## ORDER 1: India NF 2025-26 rulebook in FORGE (+ rule → CAD jump)
**Why:** we're checking against the wrong rulebook. Scrutineering is worth 160 points.

**Inputs:** `~/Downloads/STEM Racing India_NF_2025-26_TechnicalRegulations (1).pdf` and `..._Competition Regulations (1).pdf`. Ask Aditya if they're missing.

**Do:**
1. Copy both PDFs to `data/reference/rules/india_nf_2025_26/` and record their sha256 in the rulebook header.
2. Create `rulebooks/stem-racing-india-nf-2025-26.yaml` in the same schema as `rulebooks/stem-racing-development-2026-27.yaml`. Include **every** dimensional rule: id, page, name, measure, unit, min/max, penalty, class, `approx`, note. Quote the rule text in `note`.
3. Extend `src/daedalus/forge.py` measures with:
   - wheel diameter and width (fit to the wheel solids)
   - ground clearance
   - nose and body height
   - cartridge chamber depth, diameter and centre height
   - wing thickness
   - tether guide position, if it's in the CAD
   A rule that can't be measured stays `manual_review`; never mark it green.
4. Make the India rulebook the default (`src/daedalus/api/forge.py` `RULEBOOK`), keeping the 2026/27 file as an option (`?rulebook=`).
5. **Rule → CAD jump:**
   - Add a message `{type:"daedalus:focus", parts:[...]}` to `vendor/chili3d/packages/web/src/daedalusBridge.ts`: select the nodes by name and zoom to fit.
   - Rebuild Chili3D (see `THIRD_PARTY.md`) and update `patches/chili3d.patch`.
   - In `components/pitwall/LegalPanel.tsx`, clicking a failed or at-risk rule opens `/design#cad` and sends the focus message (with `parts` from the check).
6. Show **points at risk** (the sum of penalties for failing rules) in the LegalPanel header.
7. Add a printable scrutineering sheet: `GET /v1/forge/sheet.pdf` (Typst, like `src/daedalus/report/`).

**Tests:** `tests/test_forge_india.py`. Every rule parses, the baseline design gets a state for every rule, and the points-at-risk sum is correct. Also a bridge round trip: by hand, in the browser.

**Done when:**
- The Rules tab lists every India rule with page numbers.
- Clicking a failing rule highlights that part in the CAD.
- The sheet PDF downloads.

**Status 2026-11-02 (Jainam's session, branch `next-wave`, evidence `evidence/ORDER-1-india-forge.md`):**
- Done: steps 1, 2, 4 (`?rulebook=`), 6 (`points_at_risk` in `/v1/forge/checks`) and 7 (`/v1/forge/sheet.pdf`), and the measures in step 3 that the part boxes and axles allow (19 of 80 rules computable). `tests/test_forge_india.py` passes.
- Not done: step 3 measures that need mesh work (chamber, wall thickness, wing thickness, halo notch, visibility volumes), step 5 (the Chili3D `daedalus:focus` bridge and the LegalPanel click), and showing points at risk in the LegalPanel header. Run the checks on `orbit_baseline` once and compare six values by hand.

## ORDER 2: Wind Tunnel analysis (Aero A1–A3, A4, A5)
**Copy from:** PyVista (MIT) filters for computation. Use **trame** (Kitware, check its licence; NOASSERTION on GitHub, it's Apache in its files) only as the UX reference.

**Do:**
1. **Drag by part (A1):**
   - Backend: `GET /v1/cfd/runs/{id}/drag-breakdown`. Integrate pressure and wall-shear forces per patch (the patches are the car groups in the case) and return the pressure vs friction split per part.
   - Reuse `drag-buildup` if it already exists (`src/daedalus/api/engineering.py`).
   - UI: a waterfall chart in the Forces tab (ECharts).
2. **Run compare (A2):**
   - Backend: `GET /v1/cfd/compare?a=&b=` returns Δ per-part drag, and exports `delta.vtp` (Cp_b − Cp_a mapped onto a's surface with a nearest-point probe).
   - UI: a "Compare" toggle in the Flow tab with a second run picker. Diverging colour map centred at 0.
3. **Grid independence (A3):**
   - `src/daedalus/gridstudy.py` exists, so extend it with Richardson extrapolation + GCI (Roache).
   - UI: in the Mesh tab, a Cd vs cells chart with the extrapolated value and an error bar. Show a "trust" badge on Cd everywhere.
4. **Wake planes and Q-criterion (A4–A5):**
   - Extend `src/daedalus/viz/vtkexport.py` with `wake.vtp` (slices at x/L = 0.5, 1, 2, coloured by U/U∞) and `vortex.vtp` (Q-criterion iso-surface via PyVista `compute_derivative(qcriterion=True)`, then `contour`). Bump `EXPORT_VERSION`.
   - Add both as layers in `FlowViewer3D.tsx`.
5. **Acceptance reason:** the Convergence tab explains why a run is ACCEPTED or REJECTED (residual level, Cd window drift), from `daedalus_result.json`.

**Tests:** endpoint tests on `orbit_baseline_20ms` (skip if absent), like `tests/test_vtk_export.py`.

**Done when:** the waterfall, compare, GCI and wake/vortex layers all show real data, and screenshots look like ParaView output, not spaghetti.

## ORDER 3: Race replay rebuild (game / broadcast quality)
**Copy from:**
- **pmndrs/racing-game** (MIT): scene setup, environment and lighting, chase camera, HUD structure, post-processing. Clone it to `/tmp` and copy the relevant components into `apps/cockpit/src/components/race/scene/`.
- **slowlydev/f1-dash** (AGPL-3.0): timing tower, mini-sector and gap components. Copy them into `components/race/timing/` and restyle with our tokens.
- **pmndrs/postprocessing** (Zlib), via `@react-three/postprocessing`: bloom, SMAA, motion blur, tone mapping.

**Do:**
1. Car: load the selected design's `GET /v1/designs/{id}/display.glb`. PBR paint material (team colour); wheels spin at v/r; a CO₂ puff particle effect at launch.
2. Track: a 20 m lane with a tether line, start gate with 5 lights, finish gate, timing beams at the 8 mini-sector marks, barriers, and a reflective studio floor (drei `MeshReflectorMaterial`).
3. Cameras: broadcast (side dolly), chase, onboard, top, and an automatic director that cuts between them. Keep the existing Side/Chase/Top buttons.
4. HUD (f1-dash style): speed (km/h), time, gap to the ghost, mini-sector colours **with a legend**, reaction time, and a PREDICTED/MEASURED tag.
5. Ghost: the second design or predicted vs measured, drawn translucent. Merge the old Ghost tab into Replay.
6. Photo finish: slow-mo of the last 0.2 s plus a finish-line still.
7. `PerformanceMonitor` lowers effects on slow GPUs. Target 60 fps at 1440 px.

**Files:** `apps/cockpit/src/app/race/RaceWorkspace.tsx`, `components/race/*`. Keep `raceMath.ts` as the source of the motion data.

**Done when:**
- A screenshot looks like a game, not grey blocks.
- No console errors.
- 60 fps on the MacBook (show the drei `Stats` panel during the check).

## ORDER 4: Race analysis (C19–C24) and "full stadium" timing (§20)
**Do:**
1. **Race-time budget (C19):** a stacked bar of ms lost to drag, rolling, mass and reaction. Compute it in `src/daedalus/dynamics.py` (or `raceMath.ts`) by switching each loss off in turn.
2. **Tornado (C20):** ±10% on each input → Δ time, as a horizontal bar chart.
3. **ms-per-unit table (C21):** ms per gram, per cm² of CdA, per 0.001 Crr.
4. **Monte Carlo histogram (C22):** p5/p50/p95 markers; this feeds the sealed prediction band.
5. **Force traces (C23):** thrust, drag and rolling vs time on **uPlot** (`uplot`, MIT) with linked cursors.
6. **Stadium timing page:**
   - New route `/race/timing`, plus a full-screen TV mode (`?tv=1`).
   - Contents: timing tower (purple/green/yellow + legend), 8 mini-sectors, reaction column, speed trap, two-lane race pair with winner banner, event leaderboard (CSV import of all teams), prediction scoreboard with ✓/✗.

**Done when:** all charts use real model output, the TV mode is readable on a projector (large type), and the CSV import works.

## ORDER 5: Closed design loop (ORACLE → CAD → FORGE → CFD)
**Copy from:** build123d (Apache, already installed); bitbybit (MIT) for parametric car part ideas.

**Do:**
1. `src/daedalus/parametric.py` builds a legal car from ORACLE's 4 variables, plus fixed team dimensions (length, width and height from `data/designs/orbit_baseline/geometry.json`). Part labels must match `GROUP_RULES` in `src/daedalus/geometry.py`: "Main Body", "Front Wing", "Rear Wing", "f1_wheel …", "CO2 Cartridge".
2. `POST /v1/oracle/build-next` builds the STEP, imports it with `geometry.import_car` (forward `-X` if built nose-at-−X), runs FORGE and records a Design with `parameters` set.
3. FORGE as a constraint: ORACLE drops candidates that the parametric model says are illegal.
4. When a CFD run of an ORACLE design succeeds, append the observation automatically (`oracle.Campaign.add`).
5. UI: Pit Wall "Next run · ORACLE" gets **Build design** → **Open in CAD** → **Run CFD** (uses the existing jobs API, `NewRunDialog`).

**Tests:** the built car is a valid solid, FORGE passes on default params, and the endpoint works.

## ORDER 6: Optimisation and calibration analysis (B13–B18, D27–D31)
1. GP mean and uncertainty maps per variable pair; variable importance (length-scales); leave-one-out validation plot.
2. Bayesian calibration: measured race times → CdA and Crr posteriors (`src/daedalus/calibration.py` exists). Show predicted vs measured with shrinking error bars.
3. Reaction-time statistics and lane/cartridge t-tests from imported race CSVs (`src/daedalus/importers.py`).

## ORDER 7: Remaining items
- FoamPilot-style run wizard + live residuals (uPlot)
- dockview Pit Wall (patch at `/private/tmp/.../scratchpad/dockview-attempt.patch` may be gone; rebuild from the dockview docs)
- xyflow evidence lineage graph
- Merge Inspect into a CAD side panel
- Hide model M1 under Advanced
- The judge outputs in `MASTER-PLAN.md` §21 (portfolio PDF chapters, race-day report)

## Final: full QA
Run every box in `CHECKLIST.md`, including §0b "connected". Fix what fails. Then update `RATINGS.md` with new honest scores. **Target: no page below 7/10.**
