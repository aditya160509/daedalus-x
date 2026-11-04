# EASY-05 — Four chart source captions

## Changed

- `apps/cockpit/src/components/charts/HistoryChart.tsx` — convergence-only caption; no experimental measurement or GCI claim.
- `apps/cockpit/src/components/charts/SpreadChart.tsx` — simulated Monte Carlo caption; no measured-run or sampling-convergence claim.
- `apps/cockpit/src/components/charts/DragBuildupChart.tsx` — solver pressure/shear caption; no measured force balance or accepted-source claim.
- `apps/cockpit/src/components/pitwall/PitCharts.tsx` — aero-map caption naming simulated GP posterior, stored observations and next proposal.

## Reused

Existing chart wrappers and ECharts renderers; captions are component-level and do not touch the pre-existing `SimulateWorkspace.tsx` draft.

## Checks

- `pnpm exec tsc --noEmit` — pass.
- `pnpm exec oxfmt --check` on the changed files — pass.
- Focused `oxlint` — no errors.

## Limitations

Captions describe provenance, not numerical accuracy. Browser typography/wrapping review remains pending.
