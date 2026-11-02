# Third-party code

Daedalus X is AGPL-3.0-or-later. Bundled third-party code keeps its own licence and copyright.

| Component | Source | Licence | Where |
|---|---|---|---|
| Chili3D v0.8.0 (commit e35a8ee) | https://github.com/xiangechen/chili3d | AGPL-3.0 | `apps/cockpit/public/cad` (built; Microsoft Clarity tracking removed) |
| pmndrs/racing-game (7816a5d) | https://github.com/pmndrs/racing-game | MIT | Camera/light setup adapted in `components/race/scene/BroadcastRig.tsx`; licence in `docs/licenses/pmndrs-racing-game-MIT.txt` |
| slowlydev/f1-dash (d21607a) | https://github.com/slowlydev/f1-dash | AGPL-3.0 | Mini-sector status display adapted in `components/race/timing/MiniSectors.tsx`; timing layout informed by LeaderBoard/DriverGap; licence in `docs/licenses/f1-dash-AGPL-3.0.txt` |
| pmndrs/postprocessing | https://github.com/pmndrs/postprocessing | Zlib | npm dependency via `@react-three/postprocessing`: SMAA and restrained bloom in the replay |
| vtk.js 34.18 | https://github.com/Kitware/vtk-js | BSD-3-Clause | `apps/cockpit/src/app/simulate/FlowViewer3D.tsx` (npm `@kitware/vtk.js`; Glance-style layer panel) |

Rebuild Chili3D: clone it into `vendor/chili3d` at the commit above, `git apply ../../patches/chili3d.patch` (our changes: no branding, no AI assistant or API key, no tracking, opens straight into a design, dark theme, same-origin named-part focus with selection and camera fit), `npm ci && npm run build && node scripts/build-plugins.mjs`, then copy `dist/` to `apps/cockpit/public/cad`. Preserve the upstream `LICENSE` in that destination (the build does not copy it).


## Scope of reuse (2026-11-02)

- **Full upstream application:** Chili3D is a patched, rebuilt upstream CAD app connected to our designs.
- **Small code adaptation:** the f1-dash MiniSector status mapping/styling was adapted. Its full dashboard was not imported; our timing arithmetic uses our own trajectories.
- **Reference/pattern adaptation:** racing-game App/Cameras informed camera/light setup. Our straight-track scene, camera controller, HUD, wheel pivots and photo-finish integration are custom; the complete racing-game scene/HUD was not ported.
- **Actual library dependencies:** React Three Fiber, drei, postprocessing, vtk.js, build123d/OpenCascade, PyVista, OpenFOAM and Typst provide the rendering, geometry, solver and document machinery. Using these APIs is different from copying an upstream application.
- **Not adopted in this pass:** trame, FoamPilot, F3D, uPlot, FastF1, dockview, xyflow, SU2, Ax/BoTorch/Optuna. Current charts use ECharts; the current GP uses NumPy/SciPy. Their presence in a planning table does not mean they are connected.

The complete progress ledger and scoring method are in `docs/build/MASTER-PLAN.md` §§24–25.


## Additional direct component adaptations — reuse pass 1

Pinned racing-game `7816a5d954b75e6ad853ae4e4f0cbbd628072643` (MIT): `src/ui/Speed/Gauge.tsx` → `components/race/upstream/SpeedGauge.tsx`; `src/ui/LeaderBoard.tsx` Score/Scores and `src/ui/Finished.tsx` result structure → `components/race/upstream/ReplayResults.tsx`.

Pinned f1-dash `d21607afbbab44a97863a605bad174d3c92367f2` (AGPL-3.0): `dashboard/src/components/driver/{DriverTag,DriverGap,DriverLapTime,DriverMiniSectors}.tsx` → corresponding files in `components/race/timing/`. Original rendering logic retained where applicable; source stores/feed types replaced with typed adapters to our model results; layout and units restyled. Full mapping and exclusions: MASTER-PLAN §26. Existing retained licence texts apply. Earlier scope notes describe the first pass before these additional imports.


## Additional library integrations — reuse pass 2

| Library | Licence | Actual use |
|---|---|---|
| [uPlot 1.6.32](https://github.com/leeoniya/uPlot) | MIT | TelemetryChart: native canvas rendering, synchronized cursors, zoom and percentile bands; replaces the telemetry ECharts renderer |
| [React Flow 12.12.0](https://github.com/xyflow/xyflow) | MIT | Lazy-loaded EvidenceLineage: nodes/edges, pan/zoom/fit and record selection, connected to stored evidence |
| [Dagre 3.1.3](https://github.com/dagrejs/dagre) | MIT | Graph layout through React Flow's documented Dagre integration pattern |

Retained distribution licence texts: `docs/licenses/uplot-LICENSE.txt`, `docs/licenses/xyflow-react-LICENSE.txt`, `docs/licenses/dagrejs-dagre-LICENSE.txt`. React Flow/Dagre example reference: https://reactflow.dev/examples/layout/dagre. Earlier “not adopted” notes are historical and superseded for uPlot/xyflow by this section. Postprocessing is now pinned to 6.39.6 to support the installed Three.js version.
