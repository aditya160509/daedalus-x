# T06 — AETHER Wind Tunnel: commercial-grade visuals

**Spec:** Appendix B.1, B.3 (display side), §4.4c, §7.5 · **Lane:** frontend-3d · **Depends:** T04 (T05 layer optional: render it if present) · **Files:** `apps/cockpit/src/components/viewer/flow/*` (new folder; move `FlowViewer.tsx` into it and split it), `src/app/simulate/FlowPanel.tsx`, `src/lib/colormap.ts`, `src/lib/api.ts`

The current viewer works but is basic (`evidence/P3-04-flow-fields.md`). Make it look like a Simcenter / Luminary render at 60 fps.

## Build: one component per layer in `components/viewer/flow/`
1. **Scene** (`FlowScene.tsx`):
   - ACES Filmic tone mapping and an environment from drei `<Environment resolution={256}>` built from `<Lightformer>` panels: no HDR file downloads.
   - Ground: a dark tunnel floor with faint moving-belt lines that scroll at a speed tied to U∞ while animating.
   - `@react-three/postprocessing`: `SMAA` plus `Bloom` (luminanceThreshold 0.85, intensity 0.6, only emissive layers exceed it). Turn the effects off automatically if FPS drops under 45 for 2 s, using a drei `PerformanceMonitor`.
2. **PressureSkin**:
   - Cp on the car with **banded contours**: a fragment shader quantises Cp into 16 bands with thin dark isolines at the band edges, using `fwidth` for anti-aliasing.
   - Toggles: smooth or banded. The material is a physical material with clearcoat 0.3 and roughness 0.45 so the car still reads as a solid object.
3. **SmokeStreams**:
   - Thick lines (`Line2`/`LineMaterial` from three-stdlib, width 1.5 px).
   - Colour by speed, with a pulse shader that keeps the current look but adds depth fade (alpha falls with camera distance) and an emissive head that blooms.
   - A seed-density slider (it subsamples existing lines).
4. **WakeScanner**: a draggable x-plane (drei `PivotControls` constrained to x, or a slider) that scrubs the 24 `xslices`. The active slice is opaque, its neighbours ±1 are ghosted. Scalar switch between Ux/U∞ and Cp0. Show the x position in mm.
5. **FlowArrows**: instanced cones on the active slice, subsampled on a grid and coloured and scaled by in-plane velocity. Use one `InstancedMesh`.
6. **VortexCores**: the Q iso-surface, semi-transparent (opacity 0.35), coloured by speed, with a two-level toggle (Q low/high).
7. **OilFlow**: surface streaklines drawn as thin light lines over a darkened car, like flow-vis paint. Separation points render as small red discs with a legend entry "separation".
8. **SensitivityMap** (when the T05 layer exists): a diverging map on the car with the legend "push out ↑ drag (red) / push out ↓ drag (blue)".
9. **SplitCompare**:
   - Choose a second run, then render both cars side by side, or in **delta** mode as the same car coloured by ΔCp. Delta needs identical surface topology: when the meshes differ, map run B onto run A's vertices by nearest-vertex lookup in a Web Worker and say so in the legend.
   - Sync cameras.
10. **Fly-through**: a scripted camera path (CatmullRom from nose to wake) of 12 s, with play/pause and export via `canvas.captureStream` to WebM (MediaRecorder, all local).
11. **Control rail**: a left vertical rail (icons and tooltips) with layer toggles grouped as *Surface* (Pressure, Oil flow, Sensitivity, Plain), *Volume* (Streams, Vortices, Wake shell) and *Planes* (Wake scanner, Centreline, Arrows). There's one legend stack bottom-right, the probe readout follows the cursor, and the camera presets and FPS go top-right.
12. **Drag build-up chart**: under the viewer, a stacked-area ECharts plot of cumulative ΔCd(x) per group. Hovering x moves a vertical marker plane in 3D (linked selection).

## Performance budget
- Total GPU memory ≤ 600 MB, and frame time ≤ 16 ms with Pressure + Streams + Vortices on.
- Parse `viz.bin` once, build geometries lazily on first toggle, and dispose them on unmount.
- Heavy CPU work (delta mapping, streak subsampling) runs in a Web Worker (`new Worker(new URL(...), {type: 'module'})`).

## Acceptance
- [ ] `pnpm check` is green (TypeScript 7, oxlint, vitest). Unit-test the contour band function, the slice indexing and the nearest-vertex delta mapper (worker logic as a pure function).
- [ ] Respect `prefers-reduced-motion`.
- [ ] Evidence note lists every layer and its source data key. The reviewer does the visual QA.

## References
- drei Lightformer / Environment: https://drei.docs.pmnd.rs/staging/lightformer
- react-postprocessing: https://react-postprocessing.docs.pmnd.rs/
- three-stdlib Line2: https://github.com/pmndrs/three-stdlib
- Simcenter vehicle aero visuals: https://blogs.sw.siemens.com/simcenter/vehicle-aerodynamics-cfd-simulation-in-simcenter-star-ccm/
- STAR-CCM+ streamlines styling: https://volupe.com/simcenter-star-ccm/streamlines-in-simcenter-star-ccm/
