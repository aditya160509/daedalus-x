# T33 project twin, analysis API, and removal of the old flow viewer
**Model:** Claude Opus 5.5 (Jainam's session, branch `next-wave`) · **Date:** 2026-11-02 · **Status:** review

## Built
- `src/daedalus/project.py` (T33): three-point estimates (PERT-beta), critical path with slack on the most likely durations, Monte Carlo finish-time forecast (p50, p80, p95, chance of meeting a deadline), criticality index per task, and the same for cost against a budget. Aimed at the 90-point project management scorecard, whose top band asks for critical path analysis and predictions of future performance. 6 tests.
- `src/daedalus/api/analysis.py`, registered in `create_app`: `POST /v1/analysis/energy`, `/test-plan`, `/beam`, `/racing-points`, `/predictions/{id}/anchor`, and `GET /v1/analysis/beam/materials`. 6 tests mount the router on its own app.

## Removed
- The old React Three Fiber flow viewer: 23 files in `apps/cockpit/src/components/viewer/flow/` (2,356 lines). Nothing could reach them since the Flow tab moved to vtk.js, and `MASTER-PLAN.md` section 2.1 says to delete it. `knip` listed the same files.
- `getFlowField`, `decodeFlowField` and the `Flow*` types in `apps/cockpit/src/lib/api.ts` (140 lines), used only by that viewer. The `VizMeta` schema stays because `vizSchema.test.ts` uses it.
- Kept on purpose: `DragBuildupChart.tsx` (ORDER 2 asks for the drag chart) and `@react-three/postprocessing` (ORDER 3 needs it).

## Checks (Windows, Node 24, pnpm 12)
- `pnpm typecheck`: passes. `pnpm test`: 33 passed. `pnpm dup`: 0 clones.
- `pnpm knip`: unused source files down from 22 to 1 (`DragBuildupChart.tsx`). It still fails on 6 exports in `api.ts` and `colormap.ts` that were already unused before this change, and lists the Chili3D bundle in `public/cad`, which is loaded by URL.
- `pnpm lint`: three existing warnings in `FlowViewer3D.tsx`, unrelated to this change.
- `pnpm format:check` reports 103 files on this machine; that is Windows line endings from checkout, not content.
- Python: `ruff` clean, `pyrefly` strict 0 errors, the new tests pass. The analysis API tests were run locally with stub modules for build123d, trimesh, pyvista, foamlib and fcntl, which this Windows machine lacks; they need no stubs on the Mac.

## Known gaps
- No UI for the new endpoints yet.
- Run the API tests and `pnpm check` on the Mac once to confirm.
