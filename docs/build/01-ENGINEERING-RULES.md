# Engineering rules (non-negotiable)

## General
- **Read before you write.** Open every file you will change and the modules it imports. Match the surrounding style, naming and comment density.
- **Small, complete units.** Each function does one thing, is fully implemented, and is typed. No `TODO`, `pass`, `NotImplementedError` or commented-out code in commits.
- **Fail loudly and early.** Validate inputs at boundaries (API models, CLI, file readers). Raise specific exceptions with actionable messages. Never swallow errors, except where an optional step must not mask a primary result; then log a warning, as `cli.py` does around `viz.export`.
- **No hidden state.** Pure functions where possible. File outputs go only under the case or design directory passed in. Never overwrite a case (`write_case` refuses, and keep it that way).
- **Performance by default.** Vectorise with NumPy, and never loop per cell in Python. Stream or downsample large arrays before JSON (≤2000 points for charts). Binary typed arrays for 3D data (see `viz.py` `_Buffer`). Cache expensive reads.
- **Units.** SI internally (m, s, kg, N, Pa). Convert only at the UI edge. Pint is available for parsing user units.

## Python (src/daedalus)
- Python 3.12, `from __future__ import annotations`, `ruff` (configured), `mypy --strict` must pass. Type third-party gaps narrowly (cast or isinstance), never with a blanket `Any`.
- Data records are frozen Pydantic v2 models in `contracts.py`, and API request/response models live next to their router.
- Heavy imports (pyvista/vtk, torch, botorch) are imported lazily inside the function or CLI branch that needs them, so the API boots fast.
- Tests in `tests/test_<module>.py` with pytest. Test real behaviour on small real inputs (tiny meshes, synthetic fields with known answers), not mocks of our own code. Each test runs in under 2 s, apart from one integration test per pipeline, which is marked `@pytest.mark.slow`.
- OpenFOAM: all dictionaries are generated from code in `cfd.py` (template version string bumps on any change). Parse outputs with `read_dat` and foamlib. Every assumption goes into the manifest's `assumptions` list.

## TypeScript / React (apps/cockpit)
- Next.js 15 App Router, React 19, TypeScript strict. `"use client"` only where needed.
- Server data goes through `src/lib/api.ts`: one Zod schema per response, parsed and never trusted raw, plus TanStack Query hooks. No `fetch` in components.
- Components: `src/components/<area>/<Name>.tsx`, and workspaces in `src/app/<route>/<Name>Workspace.tsx`. A component file holds about 300 lines at most; split beyond that.
- Styling: Tailwind 4 with the tokens in `globals.css` and shadcn/ui primitives (`src/components/ui`). **No raw hex colours in components**, except data colormaps (`src/lib/colormap.ts`) and three.js material constants.
- 3D: React Three Fiber plus drei. Dispose geometries and materials on unmount. Use `dpr={[1, 1.5]}`, keep the context-loss recovery (see `FlowViewer.tsx`), and keep draw calls under 200 by merging static meshes.
- Charts: ECharts through `useECharts` (tree-shaken registration in `useECharts.ts`; register new components there).
- Accessibility: every interactive element is keyboard-reachable with a visible focus ring, and `aria-label`s go on icon buttons and charts. Respect `prefers-reduced-motion`: animations pause.
- Formatting: `npm run format` (prettier) before committing.

## Honesty rules (from spec §1.1, §9.3)
- A UI number shows its provenance badge. CFD numbers show the run's acceptance state.
- Never round away uncertainty. Show intervals where they exist.
- "Pending" capabilities render an honest empty state naming the step that produces the data. Never fake output.
