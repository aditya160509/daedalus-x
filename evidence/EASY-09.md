# EASY-09 — Held-out prediction and interval plot

## Changed

- `apps/cockpit/src/components/race/CalibrationPlots.tsx`
  - Adds `HeldOutPlot`: measured time vs predicted median with the returned 90% interval, a y = x reference and a separate residual view.
  - Caption counts interval coverage and says these are held-out results on the supplied data, not independent physical verification.
- `apps/cockpit/src/components/race/CalibrationPanel.tsx` — renders measured-vs-predicted and residuals when held-out rows exist; otherwise displays **Not performed**.
- `apps/cockpit/src/lib/api.ts` — types `held_out` rows with measured, median, p05, p95 and error values.

## Reused

Existing held-out results, ECharts and the calibration study detail API. No prediction is recomputed in the browser.

## Checks

- `pnpm exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors.
- `oxfmt --check` — pass.

## Limitations

Held-out coverage on one supplied file is not independent out-of-sample validation of the car. No browser pass was run.
