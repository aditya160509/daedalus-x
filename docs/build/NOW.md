# NOW: the one plan (2026-11-01)

This file replaces the confusion. Other docs (UI-MASTER-PLAN, CUT-AND-ADD, TASK-BOARD) stay as references; **this is what is being done right now.**

Two lanes run at the same time and never touch the same files.

---

## Lane 1: Claude (most of the work). The "merge" (Part 2)

**Goal:** 6 pages → 4. No feature lost.

| Page | What's on it |
|---|---|
| **Pit Wall** `/` (new home) | Score gauges (F5), sealed prediction (F9), ORACLE next run + aero map (F4), FORGE legal ✓ + rule list, small 3D car, telemetry strip with delta (F7), timing tower with mini-sectors (F3), Evidence timeline drawer |
| **Wind Tunnel** `/simulate` | Kept as is, minus the cut layers (C10) |
| **Design Studio** `/design` | Kept as is |
| **Race** `/race` | Kept, plus the synced cursor (F2), what-if (F6) and the reaction trainer (F8) |

Order:
1. **Pit Wall shell.** Remove the Optimize, Inspect, Evidence and Settings pages (C3, C4, C7). Fewer tags and less prose (C5, C6). Mesh-verified chip (C8).
2. **T10 ORACLE, slim:** Optuna GP + optuna-dashboard, plus the aero map, score and benchmark card on the Pit Wall.
3. **Race:** synced cursor, mini-sectors, delta, what-if.
4. **Reaction trainer, sealed-prediction reveal, voice.**
5. **T11 FORGE:** SRWF26 rules as YAML, then the legal panel.
6. **T12 Evidence:** timeline drawer.
7. **T13 Competition Mode:** the Pit Wall in presenter mode, with the Typst report and AR.

## Lane 2: Haiku (low effort). Finish the UI master plan inside existing pages

Only files under `components/ui`, `components/viewer/*` and `app/{design,simulate}`. **No new pages, no Pit Wall, no `app/page.tsx`, no `AppShell.tsx`.**

Do (P0/P1 only):
- **A2** theme tokens · **A3** Geist fonts · **A7** keyboard hints · **A8** empty, loading and error states
- **C2** auto-fit camera · **C3** `Bvh` picking · **C5** model tree finish · **C8** studio lighting · **C9** engineering edges and x-ray · **C12** inspector rows
- **D6** line probe chart · **D8** before/after compare slider · **D11** skewed faces overlay
- **E5** tornado chart (Race `SpreadPanel` only)
- No new dependencies. Use only what is already installed.

Dropped from the master plan (bloat, or over the bundle budget):
- **B6/B8** Dockview
- **C10** STEP import in the browser, **C11** deviation map, **D3** volume rendering, **D9** video export, **D10** server-side viz, **D12** run wizard
- **E1** uPlot (ECharts is enough), **E3** motion blur, **A4** a second icon set, **A5** auto-animate, **G2** legendapp list, **G3** nuqs

Moved into Lane 1: F1–F6 (ORACLE, FORGE, Evidence, report, AR) and D7 (live solver monitor).

Rules for Haiku: commit after each item, run only the affected tests plus `tsc`, no browser QA (Claude does that once at the end), and don't touch Lane 1 files.

## Lean tech (agreed)

**Bundle budget:** measure **per page**, ≤ 800 KB each, instead of 1.1 MB summed across all pages. Change `.size-limit.json` in the Pit Wall shell step.

**Don't add:**
- Ax/BoTorch/PyTorch → use **Optuna GPSampler** only.
- optuna-dashboard server → draw the charts with **ECharts**.
- Jinja2 → **Typst** fed JSON.
- zustand, nuqs, TanStack Table/Virtual, legendapp list → React state and plain tables.
- uPlot, Dockview, motion, auto-animate, phosphor → none.
- SSE → existing job polling.
- AR (`<model-viewer>`/WebXR) → only if time is left at the very end.

**Remove (Pit Wall shell step):**
- `maath`, `zod` → a few lines of code instead.
- `@react-three/postprocessing` → remove unless the bloom visibly helps.
- `openpyxl` → CSV only.
- `trimesh` → remove if pyvista covers its use.

**Haiku lane is corrected to match:** skip G1 (TanStack Table) and G4 (zustand).

## Not now (saved for last)
- T14 polish, full QA (browser, Lighthouse, axe, all tests)
- Long CFD runs L1–L5
- Moving SPEC prose to ROADMAP (C9, R7)
- Freezing T05 adjoint (R1): no more work on it
