# UI-REDO: premium UI, real outputs, moving air (2026-11-04)

The owner reviewed the Wind Tunnel, Inspect and Strength screens on 2026-11-04. This is the brief that came out of it. Do it **before** more features. Tests come after the visuals are right.

**Bar:** Linear, Vercel dashboard, T3 Code, Onshape/SimScale results panels. Quiet, dense, precise. No "AI slop": no glow, no gradient cards, no emoji, no filler text, no decorative icons, no generic copy.

## 0. What is wrong right now (from the screenshots)

**1. Wind Tunnel shows "No accepted run", so you never see the air moving.**
- Every solved run failed the acceptance gate, so the viewer refuses to draw.
- The particle code (`FlowTunnel3D.tsx`, `vizBinary.ts`) is also still an uncommitted draft.

**2. Inspect is a low-poly grey car with three cyan dimension lines.**
- There are no engineering outputs: no rule state, no mass or centre of gravity, no section, no drag.
- The right panel is a long column of buttons and a table.

**3. Strength has four plain cards and two thin line charts.**
- No part picture showing where the load is.
- No legal-limit or safety-factor band.
- The cards repeat the chart.

**4. App-wide problems**
- The green sidebar status dots look like glowing LEDs.
- The cyan accent is used for too many things.
- Card padding and spacing are inconsistent.
- The "Present" button is still in the header (being removed).
- A Next.js "1 Issue" badge is showing, which means a runtime error. **Fix it first.**

**5. "Where are the graphs and outputs?"**
- Analyses are scattered across many tabs (Pit Wall Sensitivity and Test planner, Race Breakdown, Energy, Points, Calibration).
- Nothing shows "the results of this design" in one place.

## 1. Moving air: make it always visible (top priority)

1. **Never show an empty Wind Tunnel.**
   - If there is no accepted run, load the latest *solved* run anyway.
   - Show one quiet amber badge: "Not accepted — preview only, not evidence".
   - Keep the gate for numbers: Cd and forces are shown greyed, with the reason.
2. **Commit and finish the particle view** following `TODO.md` §1:
   - GPU particles advected through `velocity.bin`
   - short trails, coloured by |U|/U∞
   - the car surface coloured by Cp
   - faint wireframe tunnel walls
   - a moving-floor stripe
   - pause when the tab is hidden
   - adaptive particle count to hold 60 fps
3. **References, technique only**
   - mapbox/webgl-wind (ISC): ping-pong particle textures.
   - dgreenheck/threejs-particle-fluids (check its licence): WebGPU compute particles.
   - three.js forum "wind simulation prototype": streaklines with 2 render targets.
   - MeshLine: animated line trails.
4. **Delete the old field viewer from the page** so only one 3D engine is mounted.
5. **Make an accepted run exist.**
   - Fix the gate failures on `orbit_baseline_20ms`: read its acceptance reason, mesh and y+.
   - Re-run overnight with the speed-ups (warm start, convergence stop).

## 2. One results view per design ("Outputs")

Add an **Outputs** tab in Design Studio. Inspect stays as a measurement tool. Outputs shows everything about the selected design on one screen.
- **Top strip** of 6 KPI tiles: CdA (cm²) ± GCI, Cd, predicted race time (s) p50 with p5–p95, mass vs 50.0 g, rules (fail / at-risk / pass counts), points at risk.
- **Grid of result cards**, each one chart with a one-line caption:
  - drag waterfall by part
  - race-time budget
  - tornado chart
  - rule margin bars
  - safety factors per part
  - calibration error over runs
- Clicking a card opens the full analysis in its tab.
- Every number carries one provenance tag (measured / simulated / estimated / synthetic). Use plain text, not a coloured blob.

## 3. Inspect redo

- **Viewer**
  - Smooth shading (computed normals), studio HDRI (drei `Environment`), contact shadows, SSAO.
  - Rule colours on parts: fail = red, at-risk = amber, pass = no tint.
  - Dimension lines drawn in thin white/neutral, with labels in monospace on a dark chip.
- **Right panel tabs:** View · Measure · Section · Compare. Show only the active tab's controls.
- **Model table** rows: Length, Width, Height, Frontal area, Mass (est.), CG (x, z), Parts. Right-aligned mono values with units in a muted column.
- Remove the "Triangles" and SHA rows from the main table. Move them into a "Source" disclosure.

## 4. Strength redo

- **Left:** a small 3D or 2D sketch of the selected part with the load arrow and the fixed root.
- **Right:** inputs in one compact row (material, length, diameter, mass), with presets taken from the rule load (T6.3, T4.4 etc.).
- **Results**
  - One deflection chart with the allowable line dashed.
  - One stress chart with the yield stress / safety factor band shaded.
  - Replace the 4 big cards with a single summary row: `SF 2.0 · σmax 20.0 MPa · δtip 0.194 mm · M 15.7 N·mm`.
  - Add a table with all 4 parts at once (SF per part).

## 5. Visual system (apply everywhere)

**Colour**
- Background `#0B0B0C`.
- Surfaces `#111113` and `#161618`.
- Borders `rgba(255,255,255,0.08)`, hairline 1 px.
- Text: primary `#EDEDEF`, secondary `#A0A0A8`, tertiary `#6B6B73`.
- **One accent** (keep the current cyan, but desaturate it slightly), used only for: the selected tab underline, the focused input, the primary data series.
- Status colours are **text or 6 px flat dots with no glow or blur**:
  - pass `#3FB68B`, at-risk `#D9A441`, fail `#E5484D`
  - Remove every `box-shadow` / `filter: blur` / `drop-shadow` on status dots.
  - Sidebar dots show only when not OK.

**Type**
- Inter 13 px for UI, 12 px for labels, 20 px for page titles, 24–28 px for KPI values.
- JetBrains Mono with tabular numbers for every number. Units in a muted colour.

**Spacing**
- 4 px grid.
- Cards: 16 px padding; 12 px between the header and the body.
- 16 px gap between cards and 24 px page gutter.

**Cards**
- Radius 8, no shadow, 1 px border.
- Header row: title, unit, source tag, overflow menu.
- One chart or one table per card.

**Buttons**
- Heights 28 and 32. Primary is white-on-dark, used once per screen. Secondary is a bordered ghost.
- Focus ring 2 px accent. No coloured filled buttons other than the primary.

**Charts**
- ECharts/uPlot shared theme: hairline grid at 6% opacity, no chart border, monospace ticks.
- Axis titles with units, crosshair tooltip, dashed limit lines, uncertainty bands at 15% opacity.
- Export icon shown on hover only.

**Motion:** 150 ms ease-out on hover and tab change only.

**Loading:** skeletons sized like the final content. Empty states: one line plus one action, no big icon circles.

**Sources to copy patterns from**
- shadcn blocks (dashboard-01, sidebar-07)
- Vercel / Geist design tokens (greys, mono numbers)
- Linear's dense lists
- Tremor KPI cards (Apache)
- Origin UI number inputs (MIT)

Build all of these as components in `components/ui`, so every page uses the same pieces.

## 6. Performance

- Lazy-load every 3D view and the CAD iframe. Keep one WebGL context per page.
- Dispose geometries and textures on unmount.
- Use `frameloop="demand"` when nothing animates; pause the particles off-screen.
- React Query `staleTime` for static design data. Keep the API responses compact: binary for fields, no giant JSON.
- Run the Next bundle analyser: no chart/3D library in the shell bundle.
- Target: first meaningful paint under 1.5 s per page.

## 7. Order

1. Fix the "1 Issue" error.
2. §1 moving air.
3. §5 visual system (tokens + `components/ui`).
4. §2 Outputs.
5. §3 Inspect.
6. §4 Strength.
7. Apply §5 to Pit Wall, Race and Project.
8. §6 performance.
9. Then tests and checks.

After each step:
1. Screenshot it at 1440 px.
2. Compare it with Linear/Vercel side by side.
3. Fix anything that looks louder or more cluttered than they do.

## 8. Research results (TinyFish + GitHub licence checks, 2026-11-04): copy these

| Source | Licence | What to take, exactly |
|---|---|---|
| **pingdotgg/t3code** (45k ★) | **MIT: copy directly** | Its web UI primitives (button, dialog, command palette, tooltip, form controls, sidebar, tabs) and its rules in `docs/internals/web-ui.md`: one design system, compose components instead of copying classes. Port them into `components/ui` as **the** base and replace our ad-hoc versions. Keep the MIT notice. |
| **Vercel Geist** (design system + `geist-font`, OFL) | font OFL, tokens public | Geist Sans/Mono fonts, near-black surfaces, grey scale `gray-100…1000`, restrained accent, dense cards. Use it as our token reference, and swap Inter/JetBrains Mono for Geist if it looks better. |
| **Dashboard pattern 2026** (Linear/Stripe/Vercel) | — | 256 px sidebar, **4–6 KPI cards max** on top, 12-column grid, dark as default, one primary action. Use this for the Outputs tab and Pit Wall. |
| **adn8naiagent/F1ReplayTiming** (940 ★) | **MIT** | Timing tower, track-position map, telemetry panels, session replay controls. Use it for the stadium/TV mode and the Race timing (better than f1-dash for replay). |
| **matteocelani/f1-telemetry** | MIT | Telemetry chart layout and driver comparison panels. |
| **TracingInsights.com** | site, no repo | Reference only: F1 analytics chart styles (lap delta, speed trace, sector comparison). |
| **mapbox/webgl-wind** | ISC | GPU particle advection (ping-pong textures): the moving-air core. |
| **dgreenheck/threejs-particle-fluids** | **MIT** | WebGPU compute particles and trail rendering. Use it to upgrade the air particles to WebGPU when the browser supports it, and fall back to WebGL. |
| **Simcenter STAR-CCM+ 2506 / Siemens CFD-visualisation blog** | commercial | The look to match: ray-traced car, Q-criterion vortices coloured by velocity, surface LIC, wake planes. Our target style for the Wind Tunnel. |
| **Synopsys + NVIDIA Omniverse STEM Racing digital-twin racetrack** | commercial | The benchmark for the race track: real track dimensions, start box, tether, finish gate, studio lighting. Match its realism in the Race replay, and tell judges we built the same idea openly. |
| **Free F1-in-Schools track CAD** (shared publicly by a team; find the source and licence) | check | If the licence allows, use their track model instead of our hand-built geometry. |

**Order to apply:**
1. Port the t3code primitives + Geist tokens.
2. Apply them to every page.
3. Outputs tab.
4. Wind Tunnel look (STAR-CCM+ style).
5. Race track (Omniverse benchmark) + F1ReplayTiming timing.
