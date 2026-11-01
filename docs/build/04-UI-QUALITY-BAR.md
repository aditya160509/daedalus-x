# UI quality bar: commercial grade

Target feel: **McLaren / Motion Applied ATLAS** for telemetry density, **Siemens Simcenter STAR-CCM+, Ansys and Luminary** for flow visuals, and **Linear / Vercel / fintrack-style dark UI** for the app chrome. Calm, dense and precise. Nothing cartoonish, no gradients-for-decoration, no emoji.

## Existing design system (use it, don't fork it)
- Always dark. Tokens live in `apps/cockpit/src/app/globals.css`: background `#0b0b0c`, card `#141416`, border `#242428`, brand cyan `#3dd6f0`, plus `risk`, `danger` and `ok`, and the provenance colours `prov-*`.
- Type: Inter for UI, JetBrains Mono for numbers. Numbers are `tabular` (tabular-nums) and right-aligned in tables.
- Labels are sentence case. Units are always shown: a value plus a muted unit (`0.370 N`).
- Radii `rounded-xl` for panels and `rounded-lg` for controls. 1px borders, no heavy shadows.
- Spacing on a 4 px grid. Panels have 16 px padding and workspaces 20 px.

## Interaction standards
- Every async view has three states: skeleton (`animate-pulse bg-surface-2` with the final layout shape), error (an EmptyState that says what to do), and empty (an EmptyState naming the producing step).
- Hover gives instant feedback (≤100 ms). Transitions run 150–220 ms ease-out, and none on data.
- Keyboard: `1–6` switch workspaces, `F` for full-screen viewer, `R` to reset camera, `Space` to play/pause animation, `?` for the shortcut sheet.
- Linked selection: hovering a component in a chart highlights it in 3D, and the reverse (spec §7.4).
- Every 3D viewer has camera presets (Iso/Front/Side/Top), a gizmo, full screen, a legend for any colour mapping and a probe readout.

## 3D visual standards
- Physically based materials (`meshPhysicalMaterial` with clearcoat for the car body), an HDR-like studio environment from drei `Environment` + `Lightformer` (no external HDR files, since bundling is required), and soft contact shadows.
- Tone mapping is ACES Filmic with sRGB output. Post-processing uses SMAA, plus subtle bloom only on emissive flow layers.
- Colormaps: diverging `coolwarm` centred on 0 for signed fields (Cp), and sequential `turbo` or `viridis` for magnitudes. Legends always show min, mid, max and units.
- Motion: streamline pulses ≤1.2 Hz and a turntable at 6°/s. Everything stops under `prefers-reduced-motion`.
- Performance: 60 fps on an M-series Mac at 1440p with all layers on. Measure with r3f-perf in dev only.

## Reference images to study (collect more with TinyFish, see `05`)
- ATLAS telemetry: https://www.motionapplied.com/products/atlas/
- Simcenter vehicle aero visuals: https://blogs.sw.siemens.com/simcenter/vehicle-aerodynamics-cfd-simulation-in-simcenter-star-ccm/
- STAR-CCM+ 2506 photoreal rendering: https://blogs.sw.siemens.com/simcenter/simcenter-star-ccm-2506-released/
- Q-criterion vortex visuals: https://www.m4-engineering.com/whats-new/q-criterion-for-vortex-visualization
- F1 flow-vis paint (what surface oil flow should look like): https://www.formula1.com/en/latest/article/testing-explained-rob-smedley-on-flow-vis.7nU2VePGlVrhIGa8wgCoLE
- F1 wake study figures: https://www.mdpi.com/1996-1073/13/19/5183
- OpenFOAM adjoint drag sensitivity maps: https://www.openfoam.com/news/main-news/openfoam-v2312/numerics
- drei Lightformer (studio lighting): https://drei.docs.pmnd.rs/staging/lightformer
- R3F examples gallery: https://r3f.docs.pmnd.rs/getting-started/examples

When a task says "match reference X", fetch that page, describe in your evidence note the three visual traits you copied (layout, colour use, typography), and link it.
