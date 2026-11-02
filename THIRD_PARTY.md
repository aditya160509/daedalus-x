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
