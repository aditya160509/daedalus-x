# Wind Tunnel: accepted-run default and velocity texture

## What changed

- The Wind Tunnel's **Render** tab and its server-rendered still image are gone. Tabs are now
  Flow · Forces · Convergence · Mesh. `/render` remains only for the report cover.
- The default run is the **lowest-Cd accepted run with flow data**, then the best solved run.
  Rejected runs are excluded from the default; a manually selected rejected run shows a
  persistent banner and is never treated as evidence.
- `GET /v1/cfd/runs/{id}/vtk/velocity.json` and `.bin` export the sampled velocity field as an
  RGBA Float32 texture (`u/U∞`, `v/U∞`, `w/U∞`, validity) on the existing ≤64³ grid. The half
  model is mirrored by flipping the lateral component about `y = 0`. This is the data source for
  the planned GPU particle advection and is not yet rendered.

## Checks

- `uv run pytest tests/test_vtk_export.py -q` → 5 passed, including texture size, component
  order, validity mask and cache reuse against `orbit_baseline_20ms`.
- `uv run ruff check` and `ruff format --check` on the changed Python files → pass.
- `tsc --noEmit`, focused `oxlint`, `oxfmt`, and `vitest run src/lib/cfdRuns.test.ts` → pass.

## Limits

- The texture is simulated RANS data from a **rejected** reference run; it is not accepted CFD
  evidence.
- Particles, surface Cp in three.js, slice controls and the 60 fps budget are not built yet.
- No browser or GPU validation was performed in this step.
