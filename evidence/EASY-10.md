# EASY-10 — Comparable saved-study error table

## Changed

- `apps/cockpit/src/lib/calibrationCompare.ts` — compares stored MAE/RMSE in ms, ESS and held-out/source identity; marks studies with a different held-out signature non-comparable.
- `apps/cockpit/src/lib/calibrationCompare.test.ts` — covers metric selection, missing metrics, source matching and non-comparable rows.
- `apps/cockpit/src/components/race/CalibrationPanel.tsx` — up to five study checkboxes, bounded two-at-a-time detail fetches, loading/error states and a TanStack comparison table. Opening the comparison never reruns a fit.

## Reused

Existing saved-study list/detail APIs and TanStack Table v9. No metric is recomputed or invented.

## Checks

- Vitest: 10 tests across the three focused helper files — pass.
- `pnpm exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors (intentional bounded `await` loop documented inline).

## Limitations

“Not evaluated” means no held-out rows, not zero error. Studies with different held-out data are shown but not joined into a trend. Browser acceptance remains pending.
