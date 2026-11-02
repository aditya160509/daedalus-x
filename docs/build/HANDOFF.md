# Handoff for a new contributor (or their Claude)

Read this first, then `MASTER-PLAN.md` (what to build next), `RATINGS.md` (what's weak), `CHECKLIST.md` (how we verify) and `docs/innovation.md` (the pitch).

## Project in one paragraph
Daedalus X is a race-engineering app for our STEM Racing (F1 in Schools) team, Veloira:
- **Backend:** Python FastAPI in `src/daedalus/`, run with `uv`. Data lives on disk in `data/`, and the evidence log is SQLite.
- **Frontend:** Next 16 + React 19 (React Compiler) + Tailwind 4 + Base UI in `apps/cockpit/`, run with `pnpm`.
- **CFD:** OpenFOAM `simpleFoam` cases in `data/runs/<run_id>/`.
- **Licence:** AGPL-3.0, so copying GPL/AGPL/MIT/BSD code is allowed. Credit it in `THIRD_PARTY.md`.

## Run it
```bash
uv sync && pnpm --dir apps/cockpit install
uv run daedalus-api                      # API on :8000
pnpm --dir apps/cockpit dev              # UI on :3000 (proxies /api -> :8000)
uv run pytest -q                         # tests (add -m slow for the heavy ones)
pnpm --dir apps/cockpit exec tsc --noEmit && pnpm --dir apps/cockpit exec oxlint src
```
**The API does not auto-reload.** Restart it after any Python change, or you'll test stale code.

## Layout of the app
- Left rail = workspaces: **Pit Wall** `/`, **Wind Tunnel** `/simulate`, **Design Studio** `/design`, **Race** `/race`.
- Each workspace has top tabs from `components/shell/WorkspaceTabs.tsx` (`useTab` keeps the tab in the URL hash) and a `StatusBar` at the bottom.
- Global: header run picker; **E** opens the Evidence drawer; **P** opens Presenter mode.
- API client and contracts: `apps/cockpit/src/lib/api.ts`. Every response is checked with zod.

---

## Features (newest first)

### 1. Design Studio CAD: Chili3D merged and connected
**What it is:** full browser CAD (OCCT kernel compiled to WASM): sketch, extrude, loft, fillet, booleans, STEP import/export.
- **Where:**
  - Built app: `apps/cockpit/public/cad/` (committed build output).
  - Our changes to Chili3D: `patches/chili3d.patch`.
  - Page: `apps/cockpit/src/app/design/DesignStudio.tsx` (tabs CAD / Inspect / Rules).
- **Our patch does:**
  - Removes the Chili3D branding, the AI assistant and API-key form, and the Microsoft Clarity tracking.
  - Opens straight into a document (no welcome page), in dark theme.
  - Fixes plugin URLs when the page has a query string.
  - Adds `packages/web/src/daedalusBridge.ts`.
- **How the connection works:**
  1. The page loads the iframe at `/cad/index.html?name=<design>&url=/api/v1/designs/<design>/source.step`, so the CAD opens our car with its real part names.
  2. "Save as design" posts `{type:"daedalus:export"}` to the iframe. The bridge exports **one STEP per part** (the OCCT STEP writer drops names) and replies `{name, parts:[{name, blob}]}`.
  3. The cockpit sends them to `POST /v1/designs/import` (field `files`, repeated).
- **Backend:** `src/daedalus/api/cad.py`. Import does four things:
  1. Rebuilds a named assembly with build123d (labels are set on each solid).
  2. Runs `geometry.import_car` (axes default `-Y` forward, `+Z` up — the team CAD convention).
  3. Runs FORGE.
  4. Writes a `Project` + `Design` record and a STEP artifact to the evidence store.
- **Rebuild Chili3D:** see `THIRD_PARTY.md` (clone at the pinned commit, `git apply patches/chili3d.patch`, `npm ci && npm run build && node scripts/build-plugins.mjs`, copy `dist/` to `public/cad`). `vendor/` is gitignored.
- **Tests:** `tests/test_api_cad.py`. The round trip is verified: same dimensions, groups and rule results as the original.

### 2. Wind Tunnel Flow tab: vtk.js viewer
- **What it is:** a ParaView-style 3D viewer. Layers: car surface coloured by Cp, streamlines coloured by U/U∞, a slice plane (x/y/z + slider, field U/U∞, Ux/U∞ or Cp), colour-map presets and legends.
- **Where:**
  - Viewer: `apps/cockpit/src/app/simulate/FlowViewer3D.tsx`, lazy-loaded with `next/dynamic` so other pages stay light.
  - Export code: `src/daedalus/viz/vtkexport.py`.
  - Endpoint: `GET /v1/cfd/runs/{id}/vtk/{surface.vtp|streamlines.vtp|volume.vti}` in `src/daedalus/api/engineering.py`, cached in `data/runs/<id>/viz/vtk/`.
- **Gotchas:**
  - Array names must be **ASCII** (`U_Uinf`, `Ux_Uinf`, `Cp`), because vtk.js doesn't match names containing `∞`.
  - Bump `EXPORT_VERSION` when the export format changes.
  - The old R3F Flow view (`FlowPanel.tsx`) was deleted.
- **Tests:** `tests/test_vtk_export.py`.

### 3. Hero renders: photo-style CFD stills
- **What it is:** offscreen PyVista PBR renders: car by Cp, speed-coloured streamtubes, shadows, SSAO, SSAA, 2400×1350, views iso/side/top/front.
- **Where:**
  - Renderer: `src/daedalus/viz/render.py` (`render`, `cached_render`).
  - Endpoint: `GET /v1/cfd/runs/{id}/render?view=` — one render at a time (lock), cached in `data/runs/<id>/render/`.
  - UI: `apps/cockpit/src/components/render/HeroRender.tsx` (`useHeroRun` picks the lowest-Cd solved run; `HeroImage`; `RenderPanel`).
- **Used in:** Wind Tunnel → Render tab, the Pit Wall hero, the Presenter "The flow" slide, and the PDF report cover (`src/daedalus/api/report.py`, `report.typ`).

### 4. ORACLE: Bayesian optimiser
- **What it is:** a Gaussian process (RBF kernel) over 4 variables: `front_wing_aoa`, `body_taper`, `nose_height`, `rear_wing_chord`. Expected improvement picks the next design, and a benchmark compares it against random testing with the same budget.
- **Where:**
  - Core: `src/daedalus/oracle.py`.
  - API: `GET /v1/oracle/state`, `POST /v1/oracle/observations` (`src/daedalus/api/oracle.py`).
  - UI: Pit Wall → ORACLE tab (`components/pitwall/PitCharts.tsx`).
- **Honest note:** until `data/oracle/observations.json` exists it uses a **synthetic** seed, and the UI shows a synthetic badge.
- **Next step (planned, not built):** ORACLE's next point → build123d parametric car → FORGE → CFD → observation.

### 5. FORGE: rule checks
- **What it is:** a YAML rulebook (`rulebooks/stem-racing-development-2026-27.yaml`, 10 rules with page numbers) checked against the design's `geometry.json`.
- **States:** pass / at_risk (within 1 mm) / fail / manual_review (mass and tether guide never show green).
- **Where:** `src/daedalus/forge.py`; endpoint `GET /v1/forge/checks?design=`; UI `components/pitwall/LegalPanel.tsx` (takes an optional `design` prop).
- **Known issue:** we compete under the **India NF 2025-26** regulations. Those PDFs are in Aditya's Downloads, and the rulebook must be replaced (`MASTER-PLAN.md` §1).

### 6. Sealed prediction
- **What it is:** the predicted race time ± interval is hashed (SHA-256) before racing. After the race you enter the real time to get ✓/✗.
- **Where:** `components/pitwall/SealedReveal.tsx`, predictions API in `src/daedalus/predictions.py`.

### 7. Evidence trail
- **What it is:** an SQLite store of typed records (`src/daedalus/contracts.py`) plus content-hashed artifacts.
- **Where:** `src/daedalus/store.py`; endpoints `GET /v1/evidence/records` and `/v1/evidence/verify`; UI `components/evidence/EvidenceDrawer.tsx` (key **E**).
- **Rule:** `store.add` refuses records whose `*_id` fields point at missing records. Create parents first (see `_record_design` in `api/cad.py`).

### 8. Report and Presenter
- **PDF:** `GET /v1/report/pdf` (Typst, `src/daedalus/report/report.typ`). Contents: ORACLE + FORGE tables, a data hash and the hero image.
- **Presenter:** `components/present/Presenter.tsx` (key **P**). Slides, notes (N), timer and fullscreen.

### 9. Race workspace
- **Tabs:** Replay (3D + timing tower) / Telemetry / Spread (Monte Carlo) / Ghost / Start (F1 five-light reaction trainer, key R).
- **Physics:** SciPy `solve_ivp`. M1 = thrust only, M2 = thrust + drag + rolling.
- **What-if panel:** shows mass, CdA and Crr; the sweep sparklines, thrust scale, track and air density are behind **Advanced**.
- **Where:** `app/race/`, `components/race/`, `components/race/raceMath.ts` (with tests).
- **Rated weak:** Replay has blocky cars and an empty track. A rebuild is planned (`RATINGS.md`).

### 10. Recent UI cuts (2026-11-02)
- Removed:
  - the made-up "aero score" gauge (Pit Wall and Presenter)
  - the duplicate Pit Wall Legal tab
  - the old Flow view
- Changed:
  - the Present button is now quiet (outline)
  - the what-if extras moved behind Advanced

---

## Conventions (please follow)
- **UI bar:** T3 Code / Linear / shadcn. One main view per tab, quiet greys plus one accent, shadcn/Base UI components only, units on every number, status badge shown once (`MASTER-PLAN.md` §9).
- **Honesty:** never present synthetic or estimated numbers as measured. Use `ProvenanceBadge`.
- **Open source first:** look for an existing project before hand-rolling, check its licence, and credit it in `THIRD_PARTY.md`.
- **Every merged OSS piece must be connected to our data** (`CHECKLIST.md` §0b).
- **Lint and format:** Python with `ruff check` + `ruff format` (line length 100); TS with `oxlint` + `oxfmt`. Run `tsc --noEmit` before pushing.
- **Commits:** small and descriptive, pushed to `main`. Never commit `data/`, `vendor/`, `.claude/` or secrets.
- **Mac is resource-limited:** don't run CFD, both dev servers and heavy builds all at once.

## Gotchas we hit
- Stale API: restart after Python edits.
- Browser pane: navigating to the same URL with only a different `#hash` doesn't reload the page. Change the query string (`?v=2`) to force a reload.
- vtk.js: use ASCII array names; set the mapper with `setScalarModeToUsePointFieldData()` + `setColorByArrayName()`, not via `newInstance` options.
- build123d: don't name a FastAPI endpoint `import_step` in a module that also imports build123d's `import_step`.
- troika/drei `Html` 3D labels crash on three 0.187. Use `components/scene/SceneLabel.tsx` (canvas sprites).

## Where to start
`MASTER-PLAN.md` §8 build order. **Next up:** India NF rulebook in FORGE plus click-a-failed-rule → CAD part focus (a bridge message `daedalus:focus`).
