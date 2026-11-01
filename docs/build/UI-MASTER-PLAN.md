# Daedalus X: commercial-grade UI master plan (open source first)

**Goal.** Make every screen look and feel like T3 Code, Linear or Vercel in the app shell, and like Ansys, SimScale, Fusion or Onshape in the engineering views. Build it from the best maintained open-source parts, then theme and optimise them. Nothing is hand-rolled where a proven component exists.

**Reference bar.** The user's screenshots: T3 Code settings rows, its ⌘K palette and its trays; Ansys Fluent web UI; SimScale; FEATool; Fusion and Onshape CAD; the Dribbble CFD dashboard (AeroSim); and F1 streamline renders.

**Rules.**
- Each library must be MIT, Apache or BSD licensed, work offline, and be actively maintained (released within 6 months).
- The JS bundle budget is 1 MB gzip.
- Everything must work by keyboard and meet WCAG AA contrast.
- Every number on screen carries its provenance.

Each item lists: **ID · what · library · replaces · effort (AI hours) · priority (P0 must, P1 should, P2 nice)**.

Part 1 (sections A–H) is the build list. Part 2 (R1–R8) names the best existing open-source **apps** to copy code or layout from for each spec feature. Read Part 2 before starting any item.

---

## A. Foundation (design system)

| ID | What | Open source | Replaces | Effort | Pri |
|---|---|---|---|---|---|
| A1 ✅ | Component kit on Base UI (T3 Code's exact stack) | **coss ui** (cal.com, MIT) + **@base-ui/react** | Radix-based shadcn primitives | 2 | P0 |
| A2 ✅ | Theme tokens: graphite surfaces, one cyan accent, layered shadows, radii, type scale | coss tokens + **tweakcn** generator | Hand-tuned `globals.css` | 0.5 | P0 |
| A3 | Typography: Inter Display for headings, Geist Mono for numbers, tabular figures everywhere | **Geist** fonts (OFL) via `next/font` | JetBrains Mono | 0.3 | P1 |
| A4 | Icon set, consistent stroke 1.5 | **lucide** (kept) + **@phosphor-icons/react** for engineering glyphs | Mixed icons | 0.3 | P2 |
| A5 | Motion primitives: list and layout transitions | **@formkit/auto-animate**, **motion** (Framer Motion) | Ad-hoc CSS | 0.5 | P1 |
| A6 ✅ | Toasts and notifications (job done, CFD rejected) | coss **Toast** (Base UI) | None today | 0.3 | P0 |
| A7 ✅ | Kbd hints everywhere (`/`, ⌘K, F, R, Space) | coss **Kbd** | Plain text | 0.2 | P1 |
| A8 | Empty, loading and error states | coss **Empty**, **Skeleton**, **Spinner** | Custom `EmptyState` | 0.3 | P0 |

## B. App shell

| ID | What | Open source | Replaces | Effort | Pri |
|---|---|---|---|---|---|
| B1 ✅ | Collapsible sidebar with search (`/`), sections, status dots, project switcher, collapsed icon rail | port **T3 Code** `sidebar.tsx` (coss) | Custom `AppShell` nav | 1 | P0 |
| B2 ✅ | ⌘K command palette: go to workspace, run CFD, open design, switch run, toggle layers, with ↑↓ / Enter / Esc footer | coss **Command** (cmdk-style) | None | 1 | P0 |
| B3 ✅ | Breadcrumb top bar with run picker, units and provenance chips | coss **Breadcrumb / Menu / Badge** | Custom header | 0.5 | P0 |
| B4 ✅ | Settings page in T3-style grouped rows (units, solver presets, CPU limits, theme, data paths) | coss **Field / Switch / Select / NumberField / Group** | None | 1 | P1 |
| B5 ✅ | Global job tray: running CFD jobs, progress, cancel, logs | coss **Popover / Progress** + `@legendapp/list` | "Jobs 5" button | 1 | P0 |
| B6 | Resizable, dockable workspace layout (tabs, split, float, save layout) | **Dockview** (MIT) | Fixed CSS grids | 2 | P0 |
| B7 ✅ (Design) | Split panes inside docks | **react-resizable-panels** | Fixed widths | 0.3 | P1 |
| B8 | Saved layouts per workspace, reset to default | Dockview `toJSON` / `fromJSON` + localStorage | None | 0.5 | P1 |

## C. Design workspace (CAD studio)

| ID | What | Open source | Replaces | Effort | Pri |
|---|---|---|---|---|---|
| C1 ✅ | Clickable view cube (faces, edges, corners) | drei **GizmoHelper + GizmoViewcube** | Text Iso/Front/Side/Top buttons | 0.5 | P0 |
| C2 | Auto-fit framing and smooth camera tweens | drei **Bounds**, **CameraControls** (camera-controls) | Fixed distance | 0.5 | P0 |
| C3 | Fast picking on big meshes | **three-mesh-bvh** (drei `Bvh`) | Raw raycast | 0.3 | P0 |
| C4 ✅ | Selection outline and hover highlight | **postprocessing** `OutlineEffect` / drei `Outlines` | Colour swap | 0.5 | P0 |
| C5 | Model tree with groups, visibility eye, isolate, search, virtual scroll | port **three-cad-viewer** tree (or **@pierre/trees**, as T3 Code uses) | Flat part list | 1 | P0 |
| C6 ✅ | Section / clipping plane with cap fill | port **three-cad-viewer** stencil-capped clipping | None | 1 | P1 |
| C7 | Measure: point-to-point, edge length, angle, with snapping | **three-mesh-bvh** closest-point + custom HUD | Point-only measure | 1 | P1 |
| C8 | Studio lighting: HDRI, contact shadows, AO, reflective floor | drei **Environment** (local HDR), `AccumulativeShadows`, **N8AO** | Basic lights | 0.7 | P1 |
| C9 | Engineering mode: edges, wireframe, x-ray, draft and thickness heatmaps | drei `Edges`, custom shaders | Studio/Engineering only | 1 | P1 |
| C10 | STEP/IGES import in the browser (B-rep → mesh) | **occt-import-js** via **Online3DViewer** importers | GLB only | 1 | P2 |
| C11 | Design compare: side-by-side, overlay ghost, and deviation colour map | Existing compare + three-mesh-bvh distance | Side-by-side | 1 | P2 |
| C12 | Inspector in T3 grouped rows: dims, mass, volume, CoG, rule checks | coss **Group / Field** | Text list | 0.5 | P0 |

## D. Wind tunnel / CFD workspace (AETHER)

| ID | What | Open source | Replaces | Effort | Pri |
|---|---|---|---|---|---|
| D1 ✅ | GPU particle advection through the velocity field (air visibly flowing, smoke and dye) | port **mapbox/webgl-wind** to 3D with three.js `GPUComputationRenderer` | Pulses on static streamlines | 2 | P0 |
| D2 | Streamtubes / ribbons with speed colouring, seed rake you can drag | three `TubeGeometry` + drei `TransformControls` | Fixed seeds | 1 | P1 |
| D3 | Volume rendering of the wake (total-pressure loss, vorticity) | **vtk.js** volume mapper, or a three `Data3DTexture` ray-march | Slice planes | 1.5 | P1 |
| D4 | Q-criterion iso-surfaces, smooth, transparent | Exported meshes (T04) + `MeshTransmissionMaterial` | Existing vortex cores | 0.5 | P1 |
| D5 ✅ | Scientific colormaps (viridis, turbo, cool-warm), legend with ticks | **cmocean / colorcet** LUTs, **d3-scale-chromatic** | Custom map | 0.3 | P0 |
| D6 | Probe tooltip and line probe chart (Cp along the centreline) | ECharts linked to the 3D cursor | Point probe | 0.7 | P1 |
| D7 | Live solver monitor: residuals and Cd streaming as the job runs | **SSE** from FastAPI + ECharts `appendData` | Poll after run | 1 | P0 |
| D8 | Run compare: delta Cp map, split slider before/after | Existing delta + **react-compare-slider** | Toggle | 0.5 | P1 |
| D9 | Turntable / fly-through video export (MP4/WebM) | **mediabunny** / WebCodecs | PNG only | 1 | P2 |
| D10 | Server-side heavy viz when needed (iso-volumes, LIC) | **PyVista** (already) → glTF export | n/a | 1 | P2 |
| D11 | Mesh-quality viewer: show skewed faces in red (T01b) | PyVista `checkMesh` set → overlay | Log text only | 0.7 | P0 |
| D12 | Setup wizard for a new run: geometry → mesh → physics → run | coss **Wizard / Stepper** | "New run" button | 1 | P1 |

## E. Race workspace (TITAN)

| ID | What | Open source | Replaces | Effort | Pri |
|---|---|---|---|---|---|
| E1 | F1-style telemetry wall with synced cursors and zoom | **uPlot** lanes in a **PlotJuggler**-style layout | ECharts lanes | 1 | P1 |
| E2 ✅ | Replay with timeline scrubber, markers and keyboard | coss **Slider** + existing R3F scene | Buttons | 0.5 | P0 |
| E3 | Broadcast-style 3D replay: motion blur, track lights, ghost trail | **postprocessing** `MotionBlur`, drei `Trail` | Basic scene | 1 | P1 |
| E4 ✅ | 3D labels without DOM roots (fixes drei Html warning) | drei **Text** (troika) with local font | drei `Html` | 0.3 | P0 |
| E5 | Monte Carlo distribution plus tornado sensitivity chart | ECharts | Histogram only | 0.5 | P1 |

## F. Optimise (ORACLE), Inspect (FORGE) and Evidence (ATLAS)

| ID | What | Open source | Replaces | Effort | Pri |
|---|---|---|---|---|---|
| F1 | Design-of-experiments table, Pareto front chart, parallel coordinates | port **optuna-dashboard** charts + TanStack Table | Placeholder | 2 | P1 |
| F2 | Optimiser backend | **Optuna** (MIT) + **BoTorch** (MIT) | n/a (T10) | 3 | P1 |
| F3 | Rules checklist with pass/fail, evidence links and 3D highlight of failing parts | coss **Table / Badge** + Design viewer | Placeholder (T11) | 2 | P1 |
| F4 | Evidence locker: files, runs and photos with provenance, search and timeline | TanStack Table + **@legendapp/list** | Placeholder (T12) | 2 | P1 |
| F5 | PDF engineering report: charts, renders, tables | **@react-pdf/renderer** or **Typst** (Apache) | None (T13) | 2 | P1 |
| F6 | AR view of the car on a table | **@react-three/xr** / `<model-viewer>` | None (T13) | 1 | P2 |

## G. Data and performance

| ID | What | Open source | Replaces | Effort | Pri |
|---|---|---|---|---|---|
| G1 | Tables: sort, filter, column resize, virtual rows | **TanStack Table** + **TanStack Virtual** | Hand lists | 1 | P0 |
| G2 | Long lists at 60 fps | **@legendapp/list** | `.map` | 0.3 | P1 |
| G3 | URL-synced state (run, layers, camera) so views are shareable | **nuqs** | `useState` | 0.7 | P1 |
| G4 | Client state store for viewer/layout | **zustand** | Prop drilling | 0.7 | P1 |
| G5 | Live updates | **SSE** (FastAPI `StreamingResponse`) + TanStack Query | Polling | 0.7 | P0 |
| G6 | Heavy maths off the main thread | **Comlink** workers (kept) | Raw postMessage | 0.3 | P2 |
| G7 | 3D perf: instancing, LOD, adaptive DPR, frame budget HUD | drei `Detailed`, `AdaptiveDpr`, `PerformanceMonitor` | Partial | 0.5 | P1 |

## H. Quality gates (run per batch)

| ID | What | Tool |
|---|---|---|
| H1 | Visual regression screenshots per workspace | **Playwright** `toHaveScreenshot` |
| H2 | Accessibility | **axe-core** via Playwright |
| H3 | Performance budget | **Lighthouse CI**, size-limit (kept) |
| H4 | React health | **react-doctor** ≥ 80, React Compiler 100% |
| H5 | Component catalogue for review | **Ladle** (fast Storybook alternative) |

---

## Part 2: reference apps per spec feature (copy before you build)

**Licence rule.**
- **MIT / BSD / ISC / Apache:** we may copy code. Keep the licence header.
- **GPL / AGPL / LGPL apps:** reference only (layout, UX, algorithms we re-implement). Never copy their code. LGPL is fine when used as an unmodified library.
- Licences marked *check* must be confirmed in the repo's LICENSE before any code is copied.

**Reuse modes.**
- **Drop-in:** install as a package.
- **Port:** copy or adapt the code into our app.
- **Pattern:** copy the layout and UX only.

---

### R1. App shell (spec §7.2) — the T3 Code look

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **T3 Code** `pingdotgg/t3code` | MIT | The exact look you showed: settings rows grouped in cards, ⌘K palette with key-hint footer, sidebar search with `/`, trays with switches. Stack: Base UI + Tailwind 4 + lucide + React Compiler | **Port** its `components/ui` (sidebar, command, kbd, group, number-field, toast, switch, select) and its settings layout |
| **coss ui** (cal.com) | MIT | The component kit T3's files match one-for-one, on Base UI | **Drop-in** via the shadcn registry |
| **Dockview** demo apps | MIT | IDE-style docking: tabs, split, float, popout, save layout | **Drop-in** for workspace layouts |
| **Linear / Vercel dashboard** (closed) | n/a | Density, typography, motion | **Pattern** only |

### R2. AETHER Design (spec B.2)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **three-cad-viewer** `bernhard-42/three-cad-viewer` | MIT | Built for CAD on three.js: hierarchical part tree with visibility toggles, **3 clipping planes with stencil caps**, measure tools, edges, explode, view presets. Used by ocp_vscode / build123d, which is our CAD kernel | **Port**: the best fit. Take the tree, clipping and measure code into R3F |
| **Online 3D Viewer** (3dviewer.net) `kovacsv/Online3DViewer` | MIT | Loads STEP, IGES, OBJ, glTF and 20+ formats in the browser via occt-import-js. Clean model tree, measure, section, export | **Port** the importers (STEP → mesh) and the tree UX; **drop-in** `online-3d-viewer` for file import |
| **Chili3D** `xiangechen/chili3d` | AGPL-3.0 | A full parametric CAD in the browser: OpenCascade WASM + three.js, ribbon UI, sketching | **Pattern** only (AGPL) |
| **CADCraft**, **SolidCraft**, **OpenCADStudio** | Rust / egui (*check*) | Modern, uncluttered CAD layouts: dockable palettes, ribbon, command line | **Pattern** (native Rust, not web) |
| **Materializr** | *check* | SketchUp-style inference snapping on OpenCascade | **Pattern** for measure snapping |
| **xeokit-bim-viewer** | AGPL-3.0 | Huge-model performance, section planes, NavCube | **Pattern** only |
| **FreeCAD** | LGPL | Engineering inspector (mass properties, check geometry) | **Pattern** |

### R3. AETHER Wind Tunnel + flow insight (spec B.1, B.3)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **mapbox/webgl-wind** | ISC | GPU particle advection: **1 M particles at 60 fps** through a velocity texture, with fading trails. This is the "air flowing" look | **Port** the shader approach into three.js and extend it from 2D to a 3D velocity volume |
| **cesium-wind-layer** `hongfaqiu/cesium-wind-layer` | MIT (*check*) | Modern 3D-globe version of the same: colour by speed, particle lifetime controls | **Port** the controls and UX |
| **ParaView Glance / vtk.js** `Kitware/vtk-js` | BSD-3 | Real scientific viz in the browser: volume rendering, iso-surfaces, slices, scalar bars, VTK file readers | **Drop-in** `@kitware/vtk.js` for volume rendering and wake iso-surfaces; or keep three.js and **port** its colormaps |
| **trame** (Kitware) | Apache-2.0 | Python-driven web viz on top of ParaView/VTK; server-side rendering of huge OpenFOAM cases | **Drop-in** later for very large meshes (Python backend already uses PyVista) |
| **ParaView** | BSD-3 | The reference CFD post-processor: pipeline browser, colour-map editor, probe-over-line | **Pattern** for the layer panel and colormap editor |
| **HELYX-OS** (ENGYS) | GPL | Open-source OpenFOAM GUI: case setup wizard, mesh-quality view | **Pattern** for the run-setup wizard and mesh checker |
| **SimScale / Ansys Fluent web UI** (closed) | n/a | The look you showed: left setup tree, centre viewport, right properties, live residuals | **Pattern** |

### R4. TITAN Race (spec B.4)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **FastF1** `theOehrly/Fast-F1` | MIT | Telemetry data model and analysis standards for F1 (speed and time traces, delta, corner markers) | **Pattern** for channel naming and delta-time maths |
| **F1 Race Replay** (Python, ~5.6k stars) | *check* | Top-down replay with a synced telemetry and leaderboard sidebar | **Pattern** for the replay UX |
| **F1 Replay Timing** | *check* | Web live-timing tower, track map, telemetry panels | **Pattern** for the timing tower and layout |
| **Slipstream** (FastF1 + Reflex + Plotly) | *check* | Driver-comparison dashboard | **Pattern** |
| **PlotJuggler** | MPL-2.0 | The best telemetry-plotting UX: drag channels into stacked plots, linked cursors, splits | **Pattern** for the telemetry wall |
| **uPlot** `leeoniya/uPlot` | MIT | 100k+ points at 60 fps, tiny (~45 kB) | **Drop-in** for telemetry lanes |

### R5. ORACLE (spec B.5)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **optuna-dashboard** `optuna/optuna-dashboard` | MIT | Real-time study dashboard: history, **Pareto front**, parallel coordinates, parameter importance, trial table, human-in-the-loop notes | **Drop-in** Optuna backend; **port** its React charts into our ORACLE screen |
| **Ax / BoTorch** (Meta) | MIT | Bayesian optimisation for expensive CFD runs; Ax has plots for response surfaces | **Drop-in** backend |
| **HiPlot** (Meta) | MIT | The best parallel-coordinates explorer | **Port** the parallel-coordinates interaction |

### R6. FORGE (spec B.5)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **three-cad-viewer** (again) | MIT | Highlight failing parts in 3D with clipping | **Port** |
| **SonarQube / GitHub checks UI** | LGPL / closed | Clear pass/fail checklists with severity and drill-down | **Pattern** (like the "All checks passed" tray in your screenshot) |

### R7. ATLAS and report (spec B.5)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **Paperless-ngx** | GPL-3.0 | Document locker: tags, full-text search, timeline, previews | **Pattern** only |
| **Immich** | AGPL-3.0 | Photo timeline and grid at scale | **Pattern** only |
| **Typst** | Apache-2.0 | Fast, beautiful PDF engineering reports from templates | **Drop-in** (CLI or WASM) |
| **@react-pdf/renderer** | MIT | PDF from React components | **Drop-in** alternative |

### R8. AR and presentation (spec B.5)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **Google `<model-viewer>`** | Apache-2.0 | One tag gives AR on iOS (Quick Look) and Android (Scene Viewer) | **Drop-in** |
| **@react-three/xr** (pmndrs) | MIT | WebXR in R3F | **Drop-in** |

**Order of borrowing:**
- Shell: T3 Code + coss ui.
- CAD: three-cad-viewer (tree, clipping caps, measure) + Online3DViewer (STEP import).
- Air: webgl-wind shader taken to 3D, plus vtk.js for volumes.
- Race: PlotJuggler layout with uPlot.
- ORACLE: optuna-dashboard charts.
- Report: Typst.

---

## Suggested batches (pick how many)

1. **Shell:** A1, A2, A6, A7, A8, B1, B2, B3, B5. The whole app looks like T3 Code. About 6 h.
2. **Layout:** B6, B7, B8, G4. Dockview workspaces, resizable and saveable. About 3.5 h.
3. **CAD studio:** C1–C5, C8, C12, E4. Fusion/Onshape feel. About 4.5 h.
4. **Wind tunnel:** D1, D5, D7, D11, D2, D6. Air visibly flowing, live solver. About 6 h.
5. **Race polish:** E1–E3, E5. About 3 h.
6. **New workspaces:** F1–F5 (with T10–T13 backends). About 13 h.
7. **Data, perf and gates:** G1–G3, G5–G7, H1–H5. About 5 h.

**Total ≈ 41 AI hours.** The P0 items alone ≈ 15 h.
