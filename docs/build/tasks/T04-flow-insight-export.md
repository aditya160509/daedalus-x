# T04 — Flow insight export (commercial CFD staples)

**Spec:** Appendix B.3 items 1–6 · **Lane:** backend-viz · **Files:** `src/daedalus/viz.py` (extend; split into a `viz/` package if it passes ~400 lines), `tests/test_viz.py`, `cli.py`, `api/engineering.py`, `apps/cockpit/src/lib/api.ts` (schemas only)

Develop against `data/runs/orbit_baseline_20ms` (already solved, no CFD needed).

## Build: new layers in the export (bump `VIZ_VERSION` to 2, and keep the reader backward compatible)
1. **Q-criterion vortex cores**:
   - `internal.compute_derivative(scalars="U", qcriterion=True)` on point data, then `contour` at Q = c·(U∞/L)² with c chosen so the iso-surface is visible but not cluttered. Default c = 50, and also export c = 200 as a second level.
   - Colour by |U|/U∞. Mirror. Decimate to ≤ 150k triangles (`decimate_pro`). Layer `vortices`.
2. **Wake iso-surface**: the contour of Ux/U∞ = 0.5 (total-pressure-loss shell), coloured by Cp_total. Mirror and decimate. Layer `wake_shell`.
3. **Surface oil flow (wall-shear streaks)**:
   - Add the `wallShearStress` function object to the case template, and for existing runs compute it post-hoc with `openfoam -c "simpleFoam -postProcess -func wallShearStress -latestTime"` (cheap).
   - Export τ_w per surface vertex. Then **integrate surface streaklines** along τ_w projected onto the surface: seed about 3000 points by area-weighted sampling, and run RK2 on the triangle mesh with edge-crossing projection. Max 300 steps.
   - Export as polylines with `|τ_w|` as scalar. Layer `oilflow`.
4. **Separation / reattachment**: mark surface vertices where `τ_w · x̂` changes sign (zero-crossing of streamwise shear) and |τ_w| is below the 10th percentile. Export the points plus a per-vertex `separation` flag. Layer `separation`.
5. **Total-pressure coefficient** on the existing wake and centreline slices: `Cp0 = (p + 0.5|U|²)/(0.5 U∞²)`. Add it as a second scalar so the UI can switch between Ux/U∞ and Cp0.
6. **Drag build-up curve**:
   - Integrate the x-force on surface faces (pressure plus viscous from wallShearStress) in 100 x-bins from nose to tail, and write the cumulative ΔCd(x) per group.
   - Write it to `viz/buildup.json` (small JSON, not binary).
   - Cross-check that the final cumulative value equals the force-coefficient Cd within 2%, and record the check.
7. **Scrubbable wake planes**: export 24 x-normal slices from nose − 0.02 m to tail + 0.25 m, each decimated to ≤ 8k triangles, as one layer `xslices` with per-slice offsets. The UI scrubs through them.

## Contracts
- Extend `viz.json` `layers` with the keys above, using the same `{positions, indices|offsets, scalar(s), range, scalar_name}` shape. Multiple scalars go in `scalars: {name: BufRef}`.
- The total `viz.bin` stays ≤ 40 MB for a 1M-cell case. Log sizes in the evidence note.
- Export wall time stays ≤ 60 s for the existing run on this Mac.

## Acceptance
- [ ] Tests on analytic fields:
  - Q of a Rankine/Burgers vortex on a small grid is positive in the core and negative outside.
  - Oil-flow integration on a flat plate with uniform τ gives straight streaks.
  - The separation detector on a synthetic τ with a known sign flip.
  - Build-up sums to the total.
- [ ] Zod schemas added to `api.ts` (`VizMeta` v2 with optional new layers) without breaking current `FlowPanel`.

## References
- PyVista `compute_derivative` (Q-criterion): https://docs.pyvista.org/api/core/_autosummary/pyvista.DataSetFilters.compute_derivative.html
- Q-criterion visual reference: https://www.m4-engineering.com/whats-new/q-criterion-for-vortex-visualization
- F1 flow-vis paint (what oil flow should look like): https://www.formula1.com/en/latest/article/testing-explained-rob-smedley-on-flow-vis.7nU2VePGlVrhIGa8wgCoLE
- OpenFOAM wallShearStress function object: https://doc.openfoam.com/2312/tools/post-processing/function-objects/field/wallShearStress/
