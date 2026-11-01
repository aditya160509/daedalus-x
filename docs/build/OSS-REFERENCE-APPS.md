# Open-source reference apps, per feature

For every Daedalus X feature, this file lists the best existing open-source **apps** (not just libraries) that already do it well, and what we take from each.

**Licence rule.**
- **MIT / BSD / ISC / Apache:** we may copy code. Keep the licence header.
- **GPL / AGPL / LGPL apps:** reference only (layout, UX, algorithms we re-implement). Never copy their code. LGPL is fine when used as an unmodified library.
- Licences marked *check* must be confirmed in the repo's LICENSE before any code is copied.

**Reuse modes.**
- **Drop-in:** install as a package.
- **Port:** copy or adapt the code into our app.
- **Pattern:** copy the layout and UX only.

---

## 1. App shell, settings, command palette (the T3 Code look)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **T3 Code** `pingdotgg/t3code` | MIT | The exact look you showed: settings rows grouped in cards, ⌘K palette with key-hint footer, sidebar search with `/`, trays with switches. Stack: Base UI + Tailwind 4 + lucide + React Compiler | **Port** its `components/ui` (sidebar, command, kbd, group, number-field, toast, switch, select) and its settings layout |
| **coss ui** (cal.com) | MIT | The component kit T3's files match one-for-one, on Base UI | **Drop-in** via the shadcn registry |
| **Dockview** demo apps | MIT | IDE-style docking: tabs, split, float, popout, save layout | **Drop-in** for workspace layouts |
| **Linear / Vercel dashboard** (closed) | n/a | Density, typography, motion | **Pattern** only |

## 2. Design workspace (CAD studio)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **three-cad-viewer** `bernhard-42/three-cad-viewer` | MIT | Built for CAD on three.js: hierarchical part tree with visibility toggles, **3 clipping planes with stencil caps**, measure tools, edges, explode, view presets. Used by ocp_vscode / build123d, which is our CAD kernel | **Port**: the best fit. Take the tree, clipping and measure code into R3F |
| **Online 3D Viewer** (3dviewer.net) `kovacsv/Online3DViewer` | MIT | Loads STEP, IGES, OBJ, glTF and 20+ formats in the browser via occt-import-js. Clean model tree, measure, section, export | **Port** the importers (STEP → mesh) and the tree UX; **drop-in** `online-3d-viewer` for file import |
| **Chili3D** `xiangechen/chili3d` | AGPL-3.0 | A full parametric CAD in the browser: OpenCascade WASM + three.js, ribbon UI, sketching | **Pattern** only (AGPL) |
| **CADCraft**, **SolidCraft**, **OpenCADStudio** | Rust / egui (*check*) | Modern, uncluttered CAD layouts: dockable palettes, ribbon, command line | **Pattern** (native Rust, not web) |
| **Materializr** | *check* | SketchUp-style inference snapping on OpenCascade | **Pattern** for measure snapping |
| **xeokit-bim-viewer** | AGPL-3.0 | Huge-model performance, section planes, NavCube | **Pattern** only |
| **FreeCAD** | LGPL | Engineering inspector (mass properties, check geometry) | **Pattern** |

## 3. Wind tunnel / CFD workspace (AETHER)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **mapbox/webgl-wind** | ISC | GPU particle advection: **1 M particles at 60 fps** through a velocity texture, with fading trails. This is the "air flowing" look | **Port** the shader approach into three.js and extend it from 2D to a 3D velocity volume |
| **cesium-wind-layer** `hongfaqiu/cesium-wind-layer` | MIT (*check*) | Modern 3D-globe version of the same: colour by speed, particle lifetime controls | **Port** the controls and UX |
| **ParaView Glance / vtk.js** `Kitware/vtk-js` | BSD-3 | Real scientific viz in the browser: volume rendering, iso-surfaces, slices, scalar bars, VTK file readers | **Drop-in** `@kitware/vtk.js` for volume rendering and wake iso-surfaces; or keep three.js and **port** its colormaps |
| **trame** (Kitware) | Apache-2.0 | Python-driven web viz on top of ParaView/VTK; server-side rendering of huge OpenFOAM cases | **Drop-in** later for very large meshes (Python backend already uses PyVista) |
| **ParaView** | BSD-3 | The reference CFD post-processor: pipeline browser, colour-map editor, probe-over-line | **Pattern** for the layer panel and colormap editor |
| **HELYX-OS** (ENGYS) | GPL | Open-source OpenFOAM GUI: case setup wizard, mesh-quality view | **Pattern** for the run-setup wizard and mesh checker |
| **SimScale / Ansys Fluent web UI** (closed) | n/a | The look you showed: left setup tree, centre viewport, right properties, live residuals | **Pattern** |

## 4. Race workspace (TITAN)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **FastF1** `theOehrly/Fast-F1` | MIT | Telemetry data model and analysis standards for F1 (speed and time traces, delta, corner markers) | **Pattern** for channel naming and delta-time maths |
| **F1 Race Replay** (Python, ~5.6k stars) | *check* | Top-down replay with a synced telemetry and leaderboard sidebar | **Pattern** for the replay UX |
| **F1 Replay Timing** | *check* | Web live-timing tower, track map, telemetry panels | **Pattern** for the timing tower and layout |
| **Slipstream** (FastF1 + Reflex + Plotly) | *check* | Driver-comparison dashboard | **Pattern** |
| **PlotJuggler** | MPL-2.0 | The best telemetry-plotting UX: drag channels into stacked plots, linked cursors, splits | **Pattern** for the telemetry wall |
| **uPlot** `leeoniya/uPlot` | MIT | 100k+ points at 60 fps, tiny (~45 kB) | **Drop-in** for telemetry lanes |

## 5. Optimise (ORACLE)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **optuna-dashboard** `optuna/optuna-dashboard` | MIT | Real-time study dashboard: history, **Pareto front**, parallel coordinates, parameter importance, trial table, human-in-the-loop notes | **Drop-in** Optuna backend; **port** its React charts into our ORACLE screen |
| **Ax / BoTorch** (Meta) | MIT | Bayesian optimisation for expensive CFD runs; Ax has plots for response surfaces | **Drop-in** backend |
| **HiPlot** (Meta) | MIT | The best parallel-coordinates explorer | **Port** the parallel-coordinates interaction |

## 6. Inspect (FORGE: rules and scrutineering)

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **three-cad-viewer** (again) | MIT | Highlight failing parts in 3D with clipping | **Port** |
| **SonarQube / GitHub checks UI** | LGPL / closed | Clear pass/fail checklists with severity and drill-down | **Pattern** (like the "All checks passed" tray in your screenshot) |

## 7. Evidence (ATLAS) and Report

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **Paperless-ngx** | GPL-3.0 | Document locker: tags, full-text search, timeline, previews | **Pattern** only |
| **Immich** | AGPL-3.0 | Photo timeline and grid at scale | **Pattern** only |
| **Typst** | Apache-2.0 | Fast, beautiful PDF engineering reports from templates | **Drop-in** (CLI or WASM) |
| **@react-pdf/renderer** | MIT | PDF from React components | **Drop-in** alternative |

## 8. AR and showcase

| App | Licence | What is best about it | Reuse |
|---|---|---|---|
| **Google `<model-viewer>`** | Apache-2.0 | One tag gives AR on iOS (Quick Look) and Android (Scene Viewer) | **Drop-in** |
| **@react-three/xr** (pmndrs) | MIT | WebXR in R3F | **Drop-in** |

---

## What to do with this

1. **Shell:** port T3 Code's components and install coss ui. That gives the exact look you showed.
2. **CAD studio:** port three-cad-viewer's tree, clipping caps and measure, and Online3DViewer's STEP import.
3. **Wind tunnel:** port the webgl-wind particle shader into 3D for flowing air. Use vtk.js for volumes and iso-surfaces.
4. **Race:** follow PlotJuggler's layout with uPlot lanes, and the F1 Replay Timing UX.
5. **Optimise:** use the Optuna backend and port optuna-dashboard's Pareto and parallel-coordinate charts.
6. **Report:** Typst templates.

Each step maps to batches in [UI-MASTER-PLAN.md](UI-MASTER-PLAN.md).
