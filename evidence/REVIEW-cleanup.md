# Cleanup and production-readiness review

**Date:** 2026-11-01 · **Scope:** all completed work (T01-T08, P0-P3 steps), `src/daedalus`, `api`, `cli`, `tests`, `apps/cockpit`, CI, docs. No CFD, dev server or browser was run. The checkout held another session's uncommitted T09 work (importers, calibration, `api/data.py`, `montecarlo.py` `dt_s`, `pyproject`/`uv.lock` edits for them); none of it was staged or touched. Python gates for my commits were run on a clean `git archive HEAD` copy for that reason.

## Before / after

| Metric | Before | After |
|---|---|---|
| Cockpit TS/TSX lines (src) | 11,997 | 11,527 (shadcn: 18 -> 11 files) |
| Client JS, gzip over all chunks | not measured | 985 kB (budget 1 MB, `pnpm size`) |
| `.next/static` | 3.4 MB | 3.4 MB (the race page no longer ships three.js/R3F in its first-load chunk; the replay is lazy) |
| `pnpm build` wall / Turbopack compile | 3.7 s / 1.7 s | 6.9 s / 3.6 s (React Compiler on) |
| `pnpm check` (format, tsrs, oxlint, knip, jscpd, vitest) | about 1 s | about 3 s |
| Vitest | 37 tests | 37 tests |
| pytest | 121 passed, 94 s wall for the full gate | 121 passed, 13.5 s warm gate |
| knip | 7 unused files, 30 unused exports, 4 unused types | 0 |
| jscpd duplication | not measured | 0.52 % (3 clones, threshold 1 %) |
| React Compiler | off | on, 115/115 components compile |
| react-doctor | 47 / 100 | 49 / 100 (see below) |
| deptry / vulture (>=80) | not run | clean / clean |
| pip-audit, `pnpm audit --prod` | not run | 0 known vulnerabilities |
| gitleaks (44 commits) | not run | no leaks |

## Changes by file

Commit 1, cockpit dead code and structure
- Deleted unused shadcn files: `ui/{badge,card,dropdown-menu,scroll-area,separator,switch,tabs}.tsx`.
- Removed unused exports/functions: `api.ts` (`getJob`, `getStudy`, `TrajectoryBand`, unexported helper schemas), `studio.ts` (`disposeMaterial`, material constants made private), `button.tsx` (`buttonVariants`), `useECharts.token`, `presets.PRESET_STORAGE_KEY`, `whatIf.sweepValues`, `SweepSparkline.sweepSummary`, `AppShell.SECTIONS`, `gltf.sha256Hex`, `TelemetrySeries`.
- `primitives.tsx`: new `Skeleton` and `ViewerFallback`; replaces four copy-pasted loading blocks in `DesignWorkspace`, `FlowPanel`.
- `RaceWorkspace.tsx`: `RaceReplay` (R3F) is `next/dynamic`, `ssr: false`.
- 25 files: `../../../lib/x` imports -> `@/lib/x`; `vitest.config.mts` adds the alias for tests.
- `apps/cockpit/README.md`: create-next-app boilerplate (npm/yarn) replaced by the real pnpm commands.

Commit 2
- `lib/colormap.ts`: `SERIES` / `SERIES_CYCLE`, replacing the same six hex values repeated in `SimulateWorkspace`, `DragBuildupChart`, `ForceBars`, `RaceWorkspace`.
- `AppShell.tsx`: keys 1-6 switch workspace (UI bar), `aria-keyshortcuts`, status dot `role="img"`, unreachable "Unknown" API state removed.

Commit 3, Python
- `api/engineering.py`: `_series` caught every `Exception`; now `(CfdError, OSError, ValueError, IndexError)`.

Commit 4, tooling and react-doctor fixes
- `useECharts.ts`: refs no longer mutated during render (sync effect). `RaceTrackScene.tsx`, `FlyThrough.tsx`: no per-frame `Vector3` allocation, lazy `useState` init. `api.ts`: `getFlowField` fetches `viz.json` and `viz.bin` in parallel. `toggle-group.tsx` memoised context, `progress.tsx` `transition-all` -> `transition-transform`, `jobMath.ts` Set lookup.
- `race/raceTracks.ts`, `race/MetricsRow.tsx` split out of `RaceWorkspace.tsx` (562 -> about 430 lines).
- `next.config.ts` `reactCompiler: true`; new `knip.json`, `.jscpd.json`, `.size-limit.json`; scripts `knip`, `dup`, `compiler:check`, `size`; `pnpm check` now includes knip and jscpd.

Commit 5, Python tooling
- `pyproject.toml`: ruff `S` and `C901` (max 20), `S603` ignored (argument lists only), `S105` ignored in `contracts.py` (enum values), `S101` in tests, `C901` in `jobs.py`; deptry config; dev deps deptry, vulture. `jobs.py list()` uses two constant queries instead of string concatenation (S608).

Commit 6, repo tooling and docs
- `lefthook.yml` (not installed in this checkout, so it cannot interfere with the other session), `ci/github-actions-ci.yml` (deptry, vulture, pip-audit, gitleaks job, compiler check, size, audit), `docs/build/02-STACK.md`, `01`, `03` (stale `viz.py`, test count, missing modules).

## Libraries considered
- Adopted: React Compiler (builds clean, 115/115), knip, jscpd, size-limit, deptry, vulture, pip-audit, gitleaks, lefthook, react-doctor (advisory).
- Not adopted: Biome (already rejected in 02-STACK), eslint-plugin-react-hooks for compiler lint (would reintroduce ESLint; the healthcheck and react-doctor's `react-hooks-js` rules cover it), osv-scanner in CI (kept as a manual cross-check; it reports the same two dev-only npm advisories).

## react-doctor
47 -> 52 after fixes, 49 after enabling the compiler, because it then reports compiler bail-outs. What remains is judged not worth changing blind (no browser allowed):
- Giant/complex components (`DesignWorkspace` 590 lines, `FlowPanel`, `TelemetryChart`, `RaceWorkspace` main function): breaking these up without visual QA risks regressions. Violates the 300-line rule; follow-up for the T14 polish pass.
- "Effect never cleaned up" x3 (`FlyThrough`/`SmokeStreams`/`useDeltaSurface`): false positives; the Worker is `terminate()`d in cleanup. `SourceStamp` browser global: only mounted inside `ssr: false` dynamic scenes. `api.ts:23` status check: `res.ok` is checked right after the body read.
- Compiler bail-outs on `try/finally` in `DesignWorkspace`/`SnapshotBridge` and ref reads in `TelemetryChart` handlers: those functions simply stay uncompiled.

## Per-task verdicts (acceptance criteria checked against tests and evidence)

| Task | Verdict |
|---|---|
| T01 CFD accuracy | Criteria 1 and 3 met: axle split, omega sign, meshQualityDict parse, AR(1) batch means, legacy fallback and fail-closed averaged gate all have tests; evidence has the v1/v2 table. Criterion 2 (0 checkMesh failures) NOT met: the v2 quick mesh has 51 highly skewed faces (v1: 9) and no v2 Cd exists. The evidence says so plainly. Meshing, not code, is the open item. |
| T02 Job runner | Met. Tests cover state machine, atomic claim (threads) plus CFD lock, real process-group cancel, restart recovery, log offsets; API tests cover validation, list, log, cancel. A worker run was not exercised against OpenFOAM by design. |
| T03 Grid study | Code criteria met (Celik/NASA worked example to 3 s.f., unequal refinement, oscillatory/divergent). The five jobs are queued, not run; the evidence says so, and the study depends on the unresolved T01 mesh. |
| T04 Flow insight | Met: Rankine Q sign test, flat-plate streak test, separation sign-flip test, drag build-up conservation test; v2 `VizMeta` in `api.ts` with its own test. Exported from the rejected run; the rejection banner must stay (T06 does keep it). |
| T05 Adjoint | In progress, as the board says. Preparation, dict parsing and field discovery are tested; runtime is correctly gated on an accepted primal. Not accepted. |
| T06 Wind tunnel | Unit-testable parts met (contour bands, slice indexing, KD-tree delta mapper vs brute force); reduced-motion is globally honoured. Visual QA outstanding. |
| T07 Design studio | Met in code: explode, snapping, measure and dimension tests; materials/lights are named constants in `studio.ts`. Visual QA outstanding. |
| T08 TITAN race | Met: band-at-zero-uncertainty test, 1000-sample runtime test, cursor and delta math tests. Visual QA and screenshots outstanding. |
| P0-P3 steps in STATUS | Consistent with code; the P3-02 rejected-run status is accurately recorded. Stale doc facts fixed (test count, `viz/` package). |

## Risks for the reviewer
- Run the browser pass for the lazy-loaded race replay, the 1-6 shortcuts, and React-Compiler-compiled screens (compiler is on by default now; `reactCompiler: false` is the fallback).
- Two moderate dev-only advisories remain (minimatch 10.2.6 via the shadcn CLI, deepmerge 4.3.1 with no patch). Production dependencies are clean.
- The T09 session's uncommitted files fail the new ruff `S` rules and the line-length rule; they need a fix before their commit.
- `uv.lock` in the working tree now contains both my dev deps and the T09 `openpyxl` change; only my part was committed.
