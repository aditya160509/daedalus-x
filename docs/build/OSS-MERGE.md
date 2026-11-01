# Open-source merge plan: final run (2026-11-01)

**Why not before:** the repo was private and closed. GPL/AGPL code (Chili3D) forces the whole app to be open source under the same licence, so I avoided it. The repo is now **AGPL-3.0**, so every licence below is compatible. We just keep their copyright notices and credit them in `THIRD_PARTY.md`.

Licences were checked on GitHub today.

## What we copy in

| # | Repo | Licence | Stars | What we take | Where it lands |
|---|---|---|---|---|---|
| 1 | **Chili3D** (xiangechen/chili3d) | AGPL-3.0 | 5.0k | **Full browser CAD:** the OCCT WASM kernel, sketch, extrude, revolve, fillet, chamfer, booleans, STEP/IGES/BREP import and export, snapping, measure, section, and the history tree | New **Design Studio → Model** tab. It replaces our view-only 3D. |
| 2 | **vtk.js** (Kitware) | BSD-3 | 1.5k | Live CFD in the browser: streamlines, slice planes, clip, iso-surfaces, volume render, LUT presets | **Wind Tunnel → Flow** tab (ParaView-style) |
| 3 | **ParaView Glance** (Kitware) | BSD-3 | 278 | Pipeline browser and colour-map editor UI, built on vtk.js | Wind Tunnel side panel |
| 4 | **F3D** (f3d-app) | BSD-3 | 5.0k | Raytraced/PBR stills and turntable video on the server, better than our PyVista render | `/v1/cfd/runs/{id}/render`, presenter, report |
| 5 | **bitbybit** | MIT | 208 | Parametric car templates (wing, nose, body) on OCCT | Design → "Parametric" panel that feeds ORACLE variables |
| 6 | **CadQuery** | Apache-2.0 | 6.0k | Python parametric CAD on the server, so ORACLE can **generate real geometry** for its next design, not only predict it | `src/daedalus/geometry/` |
| 7 | **dockview** | MIT | 3.5k | Draggable, dockable panels, like VS Code | Pit Wall layout (patch already drafted) |
| 8 | **xyflow** | MIT | 38.9k | Node graph | Evidence lineage graph (design → mesh → run → result) |
| 9 | FreeCAD / OCCT | LGPL-2.1 | 35k / 3k | Algorithms only (the shape-healing reference). We won't embed the full apps. | none |

**Already decided:** FoamPilot (MIT) for the OpenFOAM run wizard and monitor UI.

**Not found or unverified:** OpenCADStudio and Splash. These are layout ideas only until I find their repos.

**AutoCAD / Fusion / SolidWorks:** closed source, so nothing to copy. Chili3D plus OCCT covers the same core modelling.

## Order (each step: copy, wire in, browser check, commit, push)

1. **Chili3D CAD** in Design Studio: Model / Dimensions / Compare / Rules tabs. FORGE rule hotspots are drawn on the CAD model. *(biggest win: Design & Engineering, 180 pts)*
2. **vtk.js and Glance viewer** in the Wind Tunnel Flow tab. The backend exports `.vtp`/`.vti` per run.
3. **F3D render endpoint**, with hero images in Wind Tunnel, Pit Wall, Presenter and the PDF report, plus an optional turntable MP4.
4. **CadQuery and bitbybit parametric loop:** ORACLE's next design → real STEP → mesh → CFD → back to ORACLE (closed loop).
5. **FoamPilot** run wizard and live monitor.
6. **dockview** on Pit Wall, and the **xyflow** evidence lineage.
7. `THIRD_PARTY.md` with licences and credits, then the full `CHECKLIST.md` QA, then long CFD runs L1–L5.

## Costs and risks (honest)

- **Chili3D is a full app** (its own UI framework, about 10 MB of OCCT WASM). It will be lazy-loaded on the Design page only, so other pages stay fast. That breaks the 800 KB page budget **for Design only**.
- vtk.js is heavy too, so it's also lazy-loaded on Wind Tunnel only.
- **Time:** step 1 is the longest. Steps 2–3 are medium. Steps 4–6 are smaller.
- The dev servers stay on throughout so you can watch and comment.
