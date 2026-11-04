# Wind Tunnel: GPU particle flow view

## What changed

- `FlowTunnel3D.tsx` is now the default **Flow** layer in the Wind Tunnel. It renders the car
  surface with Cp colouring, a moving-ground floor, camera presets (Side · Top · Wake · Chase),
  and a GPU particle field advected with RK2 through the exported velocity texture.
- **Field layers** keeps the existing vtk.js viewer (wake planes, Q surfaces, slices) one click
  away. Only one renderer mounts at a time, so the heavy vtk.js bundle is not loaded for the
  default view.
- Particles use a float ping-pong render target. Density is selectable at 16k / 65k / 262k and
  automatically drops to 16k if the measured frame rate stays below 50 fps for two seconds. The
  drop is shown as a badge, not hidden.
- Every overlay labels the run, `simulated`, and its acceptance (`rejected` here). Rejected runs
  are still excluded from the default selection and carry the persistent banner.

## Bugs fixed during validation

- The particle shaders used GLSL1 syntax (`varying`, `attribute`, `texture2D`, `gl_FragColor`)
  while the materials requested `THREE.GLSL3`; every particle program failed to compile. Shaders
  are now pure GLSL3.
- The flow-export reader treated `length` as bytes. `viz/binary.py` writes `offset` in bytes and
  `length` in elements, so each layer was truncated to a quarter and the surface rendered as
  stray triangles. The reader lives in `src/lib/vizBinary.ts` with a regression test.
- The 3D container had no resolved height, so the canvas mounted at 150 px tall. It now fills the
  Flow pane (1182×626 at 1440×900; 308×501 at 390×844).
- Particles respawned only at the inlet and never expired (life advanced with the scaled
  advection step), leaving a dense sheet and starving the wake. Respawns are now spread across the
  domain and use a wall-time lifespan, so the field stays even.
- The route could hydrate after the run query resolved, producing a server/client hydration
  mismatch on the workspace branch. The first client pass now renders the server's loading shell.

## Checks

- `pnpm typecheck`, focused `oxlint`, `oxfmt --check`, `pnpm test` → pass (12 files, 47 tests).
- Playwright against the live dev server at 1440×900 and 390×844: 0 console errors, 0 page
  errors, exactly one canvas in particles and one in field layers, `scrollWidth = 390` on mobile.
- Empty-selection path shows **No accepted run** because the only local run is rejected.
- Particle motion confirmed by frame diff (≈5% of canvas pixels changed over 1.5 s).
- Screenshots (local, not tracked): `output/playwright/wind-tunnel-particles-1440.png`,
  `output/playwright/wind-tunnel-particles-390.png`,
  `output/playwright/wind-tunnel-layers-1440.png`.

## Limits

- The only local run with flow data is `orbit_baseline_20ms`, which is **rejected**
  (`checkMesh` skewness and Cd stability). The particle layer is a visualisation of simulated
  data, not accepted CFD evidence.
- The browser checks ran on a software WebGL rasteriser (SwiftShader), which triggered the
  automatic density drop to 16k. **No 60 fps claim is made on the physical GPU.**
- The 64×23×15 velocity grid is coarse; particle paths are illustrative and are not streamtracers
  or a substitute for the accepted-campaign analysis still pending.
