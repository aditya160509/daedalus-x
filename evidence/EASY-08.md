# EASY-08 — Actual posterior interval plot

## Changed

- `apps/cockpit/src/components/race/CalibrationPlots.tsx`
  - Adds `PosteriorIntervals`, a horizontal 90% interval plot from returned `p05`, `median` and `p95` values.
  - Shows units in the axis/tooltip and writes the numeric interval into the accessible label.
- `apps/cockpit/src/components/race/CalibrationPanel.tsx` — renders the plot from existing posterior summaries.
- `apps/cockpit/src/lib/api.ts` — narrows `CalibrationStudyDetail.results` to the returned summaries/ESS/seed/warnings fields.

## Reused

Existing calibration API results and Apache ECharts. No posterior sampler or interval calculation was added here.

## Checks

- `pnpm exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors.
- `oxfmt --check` — pass.

## Limitations

The interval is only as valid as the fitted study. No new convergence diagnostic or physical calibration claim is made.
