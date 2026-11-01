# Final check list

Every feature, what "working" means, and how to check it. This runs **once, at the end** (Q1 in TASK-BOARD). Tick each box with the date and a screenshot or log path.

Legend: 🧪 automated test · 🌐 browser check · 🖥 command/log · 👁 visual judgement

## 0. Setup
- [ ] 🖥 `uv sync` and `pnpm install` from a clean clone
- [ ] 🖥 API starts (`uv run daedalus-api`), `/health` returns ok
- [ ] 🖥 Cockpit starts (`pnpm dev`), with no console errors on any page
- [ ] 🧪 Full Python suite including `-m slow` passes; record the time
- [ ] 🧪 Vitest passes · `tsc --noEmit` 0 errors · Pyrefly 0 errors · ruff/oxlint clean
- [ ] 🖥 size-limit: every page is ≤ 800 KB gzip

## 1. Pit Wall (home `/`)
- [ ] 🌐 Every panel loads real data; skeletons while loading, no blank panels
- [ ] 🌐 Score gauge: the number matches the best CdA's position in the aero map's range
- [ ] 🌐 Aero map: heatmap, tested runs (dots) and the next-run ★ line up with the ORACLE card values
- [ ] 🌐 "Synthetic" label is shown while the data is synthetic and disappears once CFD runs are added
- [ ] 🌐 ORACLE vs random: the ORACLE line ends at or below random
- [ ] 🌐 Sealed prediction: shows the hash and value ± interval. Typing a time and pressing Reveal gives ✓/✗ matching the interval.
- [ ] 🌐 Legal panel: fail/risk/measure/pass sorted, margins with units, rule note on hover
- [ ] 🌐 Deep-page links work
- [ ] 🌐 Layout works at 1440, 1024 and 375 px wide, with no zero-height panels and no horizontal scroll
- [ ] 🌐 Dockview (if added): drag, tab and saved layout survive a reload

## 2. Wind Tunnel (`/simulate`) · T01, T03, T04, T06
- [ ] 🖥 T01: rotating wheels and moving ground in the case. checkMesh shows 0 failures (T01b: max skew < 4).
- [ ] 🖥 T03: grid study gives GCI and an observed order; the mesh-verified chip matches
- [ ] 🌐 Run picker switches runs; provenance is shown
- [ ] 🌐 Layers: smoke, pressure skin, wake scanner and sensitivity map each toggle, with a legend and units
- [ ] 🌐 Airflow animates; reduced motion freezes it **and** the Animate toggle shows off
- [ ] 🌐 Drag build-up chart: hovering moves the 3D marker plane
- [ ] 🌐 Force bars add up to the total (force-sum check is green)
- [ ] 🌐 A rejected run shows the rejection banner, never as valid
- [ ] 👁 60 fps on the demo laptop with all layers on

## 3. Design Studio (`/design`) · T07
- [ ] 🌐 Model loads; viewcube, camera presets tween smoothly (C2)
- [ ] 🌐 Click picks parts quickly (C3) with an outline (C4); the model tree's search, eye toggles and isolate work
- [ ] 🌐 Section plane with a cap (C6); explode slider; turntable
- [ ] 🌐 Measure point-to-point; dimension labels use HTML (no troika crash)
- [ ] 🌐 Compare two designs; PNG snapshot downloads
- [ ] 🌐 Inspector rows show dims, volume and parts
- [ ] 🌐 Resizable panels remember their size

## 4. Race (`/race`) · T08, T09
- [ ] 🌐 Telemetry lanes with a synced cursor; the replay scrubber works and Space plays
- [ ] 🌐 Cursor table isn't clipped; metric labels aren't truncated
- [ ] 🌐 Monte Carlo spread plus the tornado chart (E5)
- [ ] 🌐 Ghost car plus the delta-time trace
- [ ] 🌐 What-if sliders update the time
- [ ] 🌐 Reaction trainer: lights 1–5, random hold, GO, ms result. An early press shows JUMP. Best, average and trend survive a reload.
- [ ] 🧪 T09 import: CSV with unit headers (`time [ms]`, `force_n`) gives a preview and then commits
- [ ] 🧪 T09 calibration recovers CdA within 10% on synthetic data; bootstrap CIs cover the truth (slow test)
- [ ] 🌐 T09 seal → score round trip from the UI

## 5. ORACLE · T10
- [ ] 🧪 The GP reproduces the training points; EI suggestions stay inside the parameter ranges
- [ ] 🧪 The budget-matched benchmark beats LHS
- [ ] 🖥 POST an observation: run count goes up, provenance becomes "mixed"
- [ ] 👁 Once real CFD exists: replace the synthetic seed and re-check the aero map

## 6. FORGE · T11
- [ ] 🧪 States, margins, cartridge excluded, bounding-box estimates are never "fail", mass stays manual
- [ ] 🖥 Every rule's page number opens the right clause in the PDF
- [ ] 👁 Rear wing D8.5 (34.4 mm < 35) is confirmed on the real car or CAD; fix the design if real
- [ ] 🌐 Inspections (when built): measured readings move a rule to measured pass/fail

## 7. Evidence · T12 (when built)
- [ ] 🌐 Timeline drawer opens from the Pit Wall; filter and search work
- [ ] 🖥 `verify` reports every record hash Verified ✓; a tampered file shows Broken ✗

## 8. Competition Mode, report and AR · T13 (when built)
- [ ] 🌐 Presenter mode: ←/→ to move, Esc to exit, P for notes, timer. Works offline (network off).
- [ ] 🖥 Typst PDF builds; each figure shows its source ID, hash and units
- [ ] 🌐 AR opens on a phone (if built)

## 9. App-wide
- [ ] 🌐 ⌘K palette opens every page and action; keys 1–4 switch pages
- [ ] 🌐 Toasts on job start and finish; jobs popover lists runs
- [ ] 🌐 Sidebar collapses and the state is remembered
- [ ] 🌐 axe: 0 serious issues on each page. Lighthouse performance ≥ 80 and accessibility ≥ 95.
- [ ] 👁 Every number has a unit and a provenance dot; no placeholder text; no lorem
- [ ] 👁 Dark theme is consistent: one cyan accent, tabular numbers

## 10. Long runs (L1–L5, overnight)
- [ ] 🖥 Final mesh CFD converges; Cd is stable
- [ ] 🖥 Grid study (3 meshes), speed study (4 speeds)
- [ ] 🖥 About 30-run ORACLE campaign with a 5-run holdout; the benchmark is re-run on real data
