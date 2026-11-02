# UI panels for the next-wave modules
**Model:** Claude Opus 5.5 (Jainam's session, branch `next-wave`) · **Date:** 2026-11-02 · **Status:** review (needs a browser check)

## Built
- **Rules (LegalPanel):** points lost and points at risk in the header, the rulebook revision, rules left to measure by hand, rule id and page on hover, and a "Scrutineering sheet (PDF)" link to `/v1/forge/sheet.pdf`.
- **Race > Energy tab** (`components/race/EnergyPanel.tsx`): thrust work split into speed kept, drag and rolling, with the biggest loss, energy shed while coasting and the integration check. Uses `/v1/analysis/energy` with the same inputs as the race simulation.
- **Design Studio > Strength tab** (`components/strength/StrengthPanel.tsx`): beam FEA for the tether guide, axle, halo bar and rear wing with the rule test loads (T6.3, T7.13, T4.4.5), material picker, tip deflection, peak stress and safety factor. Materials are marked estimated.
- **Project page** (`/project`, `app/project/ProjectWorkspace.tsx`, new sidebar entry): editable task list with three-point estimates and dependencies, deadline, save (`PUT /v1/analysis/project/plan`, stored in `data/project/plan.json`), and a forecast with p50/p80, on-time chance, critical path and how often each task decides the finish date. Shows a labelled example plan until the team saves its own.
- Backend: `/v1/analysis/project/plan` (GET, PUT) and `/v1/analysis/project/forecast`, with 2 more API tests.

## Checks (Windows)
- `pnpm typecheck`: passes. `pnpm test`: 33 passed. `pnpm dup`: 0 clones. `oxlint --type-aware` on the new files: clean.
- `pnpm knip`: no new findings (the 7 remaining unused exports were there before).
- Python API tests: 8 passed (with local stubs for Mac-only modules).

## Not done
- Not opened in a browser. Needs a look at 1440 and 375 px in both themes, and a check that the PDF link opens through the Next.js `/api` proxy.
