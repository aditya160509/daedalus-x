# TODO: everything left, and exactly how to do it (2026-11-03)

This is the single to-do list for the next Claude or Codex. It replaces the "what's next" parts of `MASTER-PLAN.md`, `BUILD-ORDERS.md` and `NOW.md`.

- `NOW.md` is the test checklist; tick its items as you go.
- We have about one year, so build everything here properly. Nothing is "nice to have".

## Rules (apply to every task)

**Git**
- Work only on `main`; no branches and no PRs.
- Run `git pull --rebase origin main` first.
- Make small commits and push after each task.
- At the end of each task, update `MASTER-PLAN.md` §23 in the same commit.

**Checks before every push**
```
uv run ruff check src tests && uv run ruff format --check src tests
uv run pytest -q -p no:cacheprovider tests/<files you touched>
pnpm --dir apps/cockpit exec tsc --noEmit
pnpm --dir apps/cockpit exec oxlint src
pnpm --dir apps/cockpit exec vitest run
```

**Browser check**
1. Start the API with `uv run daedalus-api` and **restart it after every Python edit**.
2. Start the UI with `pnpm --dir apps/cockpit dev`.
3. Open the page with `?v=N` to force a reload.
4. Take screenshots at 1440 px and 375 px.
5. Confirm the console shows zero errors.

**Mac limits**
- Never run CFD, both servers and heavy builds at the same time.
- Stop the servers when you finish.

**Open source**
- Check the licence first: `gh api repos/OWNER/REPO --jq .license.spdx_id`.
- MIT, BSD, Apache, ISC, Zlib, GPL or AGPL: copy it and credit it in `THIRD_PARTY.md` (upstream revision, original path, licence).
- No licence: read it, write notes, close it, then write our own code. Never translate line by line.
- Strip foreign branding and tracking.

**Honesty**
- Every number shows exactly one label: measured, simulated or synthetic.
- Never show a synthetic number as measured.

---

## Removed for good (do not build, and delete anything that exists)

**Features**
- AR car view
- Photo scrutineer
- Video test lab
- Photogrammetry as-built twin
- Community calibration
- Competitor or field scraping
- Exhaust base-bleed study

**Testing and infrastructure**
- Windows and Linux OS matrix
- Docker or devcontainer
- Mutation testing
- 8-hour soak test
- Multi-user concurrency
- Zenodo or Software Heritage archive
- Multi-fidelity ORACLE
- BoTorch cross-check

**Not ours (other team work, not innovation)**
- Drawing pack generator, render pack, DXF/SVG importer, finish/assembly pages

**UI and data clean-up**
- Static hero renders inside the Wind Tunnel (see task 1)
- Duplicate badges and charts
- Rejected runs used as a default
- Long slider stacks
- Dead code that `knip` reports

---

## 1. Wind Tunnel: ONE animated 3D flow, nothing static (top priority)

**Goal:** a single, premium 3D view. The real car sits in the tunnel and air **visibly moves** past it: particles stream from the inlet, bend around the car and roll into the wake vortices. No PNG renders and no second viewer, and nothing on the page is a still image.

**How**
1. **Remove**
   - In `app/simulate/SimulateWorkspace.tsx`, delete the Render tab.
   - Stop showing `HeroImage` and `RenderPanel` in the Wind Tunnel.
   - Keep `/render` only for the PDF report cover; it is not a UI element.
   - Tabs become: **Flow** (the one 3D view) · Forces · Convergence · Mesh.
2. **Data**
   - Use the existing `volume.vti`, which holds the velocity field (`Ux_Uinf` etc.) from `viz/vtkexport.py`.
   - Add a compact export: `GET /v1/cfd/runs/{id}/vtk/velocity.bin`. It is a Float32 3D texture (U, V, W) on the 64³ grid plus its bounds JSON. Bump `EXPORT_VERSION`.
3. **Animation: GPU particle advection**
   - Reference: **mapbox/webgl-wind** (ISC; 2D GPU particle technique) and **Deltares/webgl-streamline-visualizer** (check the licence).
   - Port the technique to 3D in three.js. We already have `@react-three/drei` and `postprocessing`.
   - Pipeline:
     - Particle positions live in a float texture (64k–256k particles).
     - Every frame, a ping-pong shader samples the velocity 3D texture with RK2 to move each particle.
     - Particles respawn at the inlet plane when they leave the domain or pass a lifetime limit.
     - Draw them as additive points or short trails (keep the last N positions).
     - Colour by |U|/U∞, with a legend.
   - Use RK2 in the shader; do not move particles on the CPU.
   - Add a car occlusion test: skip any sample inside the car SDF, or rely on near-zero velocity cells.
4. **Look (match the best CFD visuals)**
   - Car surface coloured by Cp (diverging blue–white–red), PBR material, soft ambient occlusion.
   - Dark tunnel floor with a moving-ground stripe texture that scrolls at the car speed.
   - Bloom only on the particles, kept subtle; tone mapping ACES.
5. **Controls (one small panel)**
   - Play/pause, flow speed, particle density.
   - Colour field (|U|, Cp-on-surface on/off).
   - Slice plane on/off. The slice shows the **animated** particles crossing it.
   - Camera presets: side, top, rear wake, chase.
6. **Engine**
   - Move the useful parts of `FlowViewer3D.tsx` (vtk.js: surface Cp, colour legends) into the three.js scene, or keep vtk.js only to *parse* the files.
   - Only one renderer may remain on the page.
7. **Performance**
   - Target 60 fps at 1440 px on the Mac.
   - Automatically drop the particle count if fps falls below 50.
   - Pause when the tab is hidden.
8. **Default run:** the best *accepted* run (lowest Cd with status accepted), never a rejected one.

**Done when**
- The page opens to moving air around the car in under 3 s.
- No still images are on the page.
- 60 fps, and no console errors.
- Screenshots and a short screen recording are saved in `evidence/`.

## 2. Race replay rebuild (game / broadcast quality)

1. **Copy, crediting each in `THIRD_PARTY.md`**
   - **pmndrs/racing-game** (MIT): scene set-up, lighting, environment, postprocessing chain, camera rigs.
   - **slowlydev/f1-dash** (AGPL): timing tower layout, sector colours with a legend explaining them, gap display.
2. **Build**
   - Our real car GLB, exported from the CAD STEP.
   - A real 20 m track: two lanes, tether line, start gate with lights, finish gate and timing beams.
   - Cameras: broadcast, chase, onboard, top, finish; plus a director mode that cuts between them automatically.
   - Photo finish with slow motion and a PNG export.
   - Ghost delta overlaid inside Replay (merge the old Ghost tab).
   - 60 fps, with adaptive quality.
3. **Tabs:** cut Race from 8 tabs to 4:
   - **Replay** (with ghost and the start-light trainer as a small tool)
   - **Analysis** (Telemetry + Spread + Breakdown + Energy)
   - **Points**
   - **Calibration**
4. **Race day mode:** big numbers, a box to enter the real time and reaction time, actual vs predicted, and an instant calibration update.
5. **Stadium/TV mode** for the projector: timing tower, speed trap, leaderboard, history strip.

## 3. FORGE India rules (scrutineering 160 pts)

1. Fix honesty first:
   - Replace the UK "D8.5 rear wing 34.4 mm vs 35 mm" example everywhere: `docs/innovation.md`, `CHECKLIST.md`, the Presenter and the report. Use the real India finding, the T7.2.1 front-wheel gap of 33.00 mm against a 38.00 mm minimum.
   - Replace 60 g with 50 g wherever it appears.
2. **Rule → CAD focus**
   - Clicking a failed or at-risk rule in `LegalPanel` posts `{type:"daedalus:focus", part, rule}` to the iframe.
   - In `patches/chili3d.patch` → `daedalusBridge.ts`, select that part and zoom to it. Draw a dimension line with the limit and the measured value.
   - Rebuild Chili3D following `THIRD_PARTY.md`.
3. **Missing measures**
   - Wall thickness: ray casting.
   - Wheel diameter: cylinder fit.
   - Cartridge chamber: hole detection.
   - Wing chord: section-based.
   - Halo pocket and helmet unmodified: compare against the standard part geometry.
   - Use build123d/OCCT for all of these.
4. Recount the rules: the YAML has 79, but `NOW.md` says 80. Check against the PDF word for word.
5. Show the margin in mm and in % on every rule. Sort by points at risk × chance of failing.
6. Add a one-page red/amber/green summary.
7. Add an inspection log (who, tool, when) and a what-if mode that drags a dimension and updates margins live.
8. Add a tolerance stack-up that reports pass probability. Finish the uncommitted `forge_probability.py` work first.

## 5. Closed loop: finish the CFD hand-off

- `design_loop.py` currently runs ORACLE → CAD → FORGE. Add the remaining steps:
  1. If every performance rule passes, queue a CFD job.
  2. Refuse to start if the design's STEP hash changed since meshing.
  3. On an accepted result, post an ORACLE observation.
  4. A rejected run never reaches ORACLE or TITAN.
- Pit Wall buttons: "Build next design" → "Run CFD" → status.

## 6. ORACLE benchmark (the key proof for judges)

- Use **Optuna** (TPE, CMA-ES) and **scipy.stats.qmc** (Sobol, LHS) plus random search, all at the same CFD budget.
- Run at least 10 seeds.
- Pre-register the protocol in the evidence store before running.
- Plot regret curves with confidence bands.
- Add a noise (nugget) term estimated from repeated runs.
- Add an acquisition history: why each run was chosen, in one plain sentence.
- Add a **pymoo** Pareto front of drag vs mass vs rule margin.
- Add an "engineer veto/edit" mode that is recorded in the evidence store.

## 7. CFD campaign (real data, the biggest gap)

1. Run overnight, one job at a time:
   - The baseline car on 3 mesh levels, with Richardson extrapolation and GCI to give Cd ± numerical uncertainty.
   - A speed sweep from 15 to 25 m/s.
   - Two turbulence treatments.
2. Write a one-page acceptance rule saying exactly which numbers must pass.
3. Add to the UI:
   - drag by part (waterfall), pressure vs friction
   - mesh quality and y+ maps
   - a Cd convergence chart with the acceptance gate line
   - a run wizard with live residuals and ETA, following the **FoamPilot** patterns
4. Pin the OpenFOAM version and store the case-directory hash with every run.

## 8. Calibration and physical tests

**Calibration UI**
- Replace the 15-input wall with **presets** (Lab day, Track day) and put the rest behind Advanced.
- Show the error shrinking over runs.
- Add posterior diagnostics with **ArviZ**: R-hat, effective sample size, posterior predictive checks.

**Test planner**
- Same pattern: presets plus Advanced.

**Paired-test protocol**
- Alternate baseline and candidate runs.
- Report a confidence interval on the difference.
- Add a power analysis to set the number of runs.

**Physical tests (team does these, the app records them)**
- mass of every part
- caliper dimensions vs CAD, with a gauge R&R check
- coast-down
- cartridge thrust at 21 °C
- tether friction
- launch repeatability
- the rule load tests

**Sealed prediction**
- Seal → test → compare → diagnose a miss.

## 9. Structure

- Validate the beam FEM against closed-form solutions.
- Add **CalculiX** 3D for the halo and wing mounts once real material data exists, with a mesh convergence check.
- Show the safety factor per part.
- Tell a before/after improvement story backed by a physical load test.

## 10. Evidence and judge experience

**Evidence and timestamps**
- Add **OpenTimestamps** as a second anchor next to RFC 3161.
- Add a public verify page with a QR code on the final slide.
- Sign the git tag on the commit that contains the sealed prediction.
- Register the rule PDFs, the baseline car and every CFD run in the store.

**Judge materials**
- Judge walkthrough: someone new must be able to inspect the full chain in under 3 minutes.
- Speaker notes, a judge Q&A bank of 60+ questions, and an honest limitations slide.
- A one-page innovation summary: baseline → change → predicted → measured.

**Report and demo**
- Every PDF embeds the commit hash, rulebook hash and run id.
- Offline demo mode, plus a recorded fallback video in the Presenter.

## 11. UI to the T3 Code / Linear level (inspect every screen and max it)

**Stack and libraries**
- Base stack: **shadcn/ui** (it uses Base UI by default now) with Tailwind 4.
- Theme with **tweakcn**.
- Allowed sources for blocks and polish:
  - **shadcn blocks** (ui.shadcn.com/blocks): dashboard, sidebar, data-table
  - **Origin UI / coss.com/ui** (MIT): inputs, number fields, segmented controls
  - **Kibo UI** (MIT): Gantt for the project page, status, kanban
  - **Magic UI** (MIT): only number ticker and border beam, used *sparingly* (one or two places), no flashy effects
  - **Tremor** (Apache): reference for KPI cards and charts
  - **cmdk** for the command palette
  - **sonner** for toasts
  - **vaul** for drawers
  - **@tanstack/react-table** for every table
- Copy their **patterns** into `components/ui` and keep one style across everything.

**Rules**
- Typography:
  - Inter for text, JetBrains Mono with tabular figures for numbers.
  - Type scale 12/13/14/16/20/24 only.
- Colour and depth:
  - Neutral greys plus **one** accent for active states.
  - Hairline borders (1 px, about 8% white), no glow, no gradients on chrome.
  - Radius 6–8 px everywhere; shadows only on popovers.
- Spacing on a 4 px grid. Cards use 16 px padding with a header row of title, unit and source badge.
- Buttons:
  - primary (one per screen), secondary, ghost, outline
  - heights 28/32/36
  - a visible focus ring
  - loading state with a spinner, never a layout shift
- Every panel has skeleton, empty and error states. Errors say what happened and what to do next.
- Motion is 150 ms ease-out only, and respects reduced motion.
- Tables: sticky header, right-aligned numbers, units in the header, row hover, keyboard navigation.
- Forms: short labels, units inside the field, presets first and the rest behind Advanced. Never more than 6 visible inputs.
- Charts:
  - One ECharts/uPlot theme: dark plot, hairline grid, units on every axis, a source badge, PNG/SVG export.
  - Use a diverging colour map for Cp; never rainbow for diverging data.
- The badge appears once per screen, in the header.
- Responsive at 1440, 1024 and 375 px with no horizontal scroll.
- Keyboard: command palette (⌘K), shortcuts dialog (?), visible focus everywhere.

**Process for each page**
Do Pit Wall, Wind Tunnel, Design Studio, Race, Project, Evidence, Presenter and Settings, in that order:
1. Screenshot it.
2. List every deviation from the rules above.
3. Fix them.
4. Screenshot again.
5. Score it from 1 to 10 in `RATINGS.md`.

**Done when** no page is below 8/10.

## 12. Engineering quality (once tasks 1–11 are done)

- CI on every push: ruff, pytest (fast set), tsc, oxlint, vitest, knip, gitleaks. The badge on main must be green.
- Coverage of at least 80% on physics, FORGE, ORACLE, calibration and evidence.
- **Hypothesis** property tests on FORGE and the race physics.
- Golden-file regression tests for the baseline car.
- Generate the OpenAPI schema → frontend types (`openapi-typescript`).
- A Playwright golden-path test, run nightly.
- Analytic benchmark tests for the physics. Use **pint** for unit checking.
- `pip-audit`, `pnpm audit` and a licence scan that regenerates `THIRD_PARTY.md`.

## 13. Project management and enterprise evidence

- A timeline drawn from the real evidence log, planned vs actual (Kibo Gantt).
- A decision log, risk register, meeting minutes, budget with receipts, and a lessons-learned entry after every test day.
- A sponsor report template, and the cost of the tool compared with commercial alternatives.

---

## Open source list (adopt / keep)

| Status | Libraries |
|---|---|
| **Adopt now** | mapbox/webgl-wind technique (ISC), Optuna (MIT), scipy.stats.qmc, pymoo (Apache), ArviZ (Apache), OpenTimestamps (LGPL client), Hypothesis (MPL), pint (BSD), openapi-typescript (MIT), cmdk/sonner/vaul (MIT), @tanstack/react-table (MIT), Kibo UI (MIT), Origin UI (MIT), tweakcn |
| **Copy from** | pmndrs/racing-game (MIT), slowlydev/f1-dash (AGPL), FoamPilot (MIT, patterns) |
| **Keep** | OpenFOAM, build123d, Chili3D, vtk.js (parsing), PyVista (report cover only), Typst, ECharts, uPlot, React Flow, dockview, SALib, drei, postprocessing |
| **Only with real data** | CalculiX |

## Order of work

1 → 3 (honesty fix + rule→CAD) → 2 → 14 (analysis, alongside every task) → 5 → 6 → 7 (start the CFD runs overnight from day one) → 8 → 11 → 9 → 10 → 12 → 13.

## 14. Analysis and charts: every type, highest quality (build these as part of the tasks above)

**Quality bar for every chart**
- One shared theme (ECharts for rich charts, uPlot for long time series): dark plot, hairline grid, units on every axis, a source badge (measured / simulated / synthetic), uncertainty bands wherever we have them, hover read-out, PNG/SVG export, and a one-line plain-English "what this means" caption.
- Linked cursors between charts on the same page.
- Compare mode: overlay two runs or designs on any chart.

**Wind Tunnel (aero)**
1. Cd and CdA with the grid-uncertainty bar (Richardson/GCI)
2. Convergence: residuals plus force history with the acceptance gate line
3. Drag waterfall by part, split into pressure and friction
4. Cp along the centre line (top and bottom), plus Cp on the surface
5. Run vs run: ΔCp on the surface, Δ wake, Δ forces table
6. Wake planes at x/L = 1, 1.5 and 2, with velocity-deficit contours and a momentum-deficit drag check
7. Q-criterion vortex cores coloured by vorticity
8. Surface streaks (LIC) and separation lines
9. Speed sweep (Cd vs speed) and yaw/ride-height sensitivity
10. Frontal area vs Cd trade chart
11. Mesh quality and y+ maps, with a skewness histogram

**Race (TITAN)**
1. Speed, acceleration, thrust and drag traces with linked cursors and annotations (launch, burnout, peak, finish)
2. Ghost delta-time trace vs the best run
3. Time budget stacked bar: drag, rolling, mass, reaction
4. Tornado chart plus SALib Sobol indices
5. Exchange rates: ms per gram, per cm² of CdA, per 0.001 Crr
6. Monte Carlo histogram with p5/p50/p95, and a convergence plot
7. Energy Sankey: thrust → drag, rolling, tether, kinetic
8. Points: expected points distribution, knock-out round probability, head-to-head win chance
9. Optimal mass curve

**ORACLE**
1. Aero map heat map with uncertainty and the next point marked
2. Regret curves vs Optuna, Sobol, LHS and random, with confidence bands over 10+ seeds
3. Predicted vs actual for every candidate
4. Calibration of predictive intervals (do the 90% bands hold 90%?)
5. Length-scale and Sobol variable importance
6. Pareto front (pymoo): drag vs mass vs rule margin
7. Acquisition history timeline

**Calibration and statistics**
1. Prior vs posterior plots for CdA, Crr and thrust scale
2. Error shrinking over runs (prediction scoreboard)
3. Posterior predictive check (ArviZ)
4. Paired-test difference with its confidence interval, and a minimum detectable effect
5. Control chart of repeat runs (drift in the track or cartridges)
6. Uncertainty budget: share of race-time variance from CFD, thrust, mass, friction, reaction and timing

**FORGE (rules)**
1. Margin bars with the tolerance band shaded, sorted by points at risk
2. Pass probability per rule from the manufacturing spread
3. Legal-frontier map with rule and page on every boundary
4. Red/amber/green summary

**Structure**
1. Deflection and stress plots
2. Safety factor table
3. Predicted vs measured load test

**Project**
1. Planned vs actual timeline from the evidence log
2. Risk matrix
3. Effort and CFD-hours chart

**Done when** every chart above exists, is connected to real data (or labelled synthetic), passes the quality bar, and is checked in the browser with screenshots in `evidence/`.
