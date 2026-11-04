# EASY-03 — Per-row outlier flags

## Changed

- `apps/cockpit/src/lib/api.ts` — `TimingImport` now parses `outlier_indices`, a zero-based list of row positions, defaulting to `[]`.
- `apps/cockpit/src/lib/timingRows.ts` — validates, deduplicates and sorts positions against the current row count; exposes `isOutlierRow`.
- `apps/cockpit/src/lib/timingRows.test.ts` — covers position mapping, out-of-range/negative/non-integer entries and stable ordering.
- `apps/cockpit/src/components/race/CalibrationPanel.tsx` — marks flagged preview rows and keeps every row visible. Reconstructed saved-study previews set `outliersKnown: false` and say flags are unavailable rather than re-scoring the file.

## Reused

The backend’s existing median ± 5·MAD detector and `outlier_indices` field; no second outlier algorithm was written. Native React list rendering.

## Checks

- `pnpm exec vitest run src/lib/timingRows.test.ts src/lib/forgeMargin.test.ts src/lib/calibrationCompare.test.ts` — 10 tests passed.
- `pnpm exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors (two pre-existing index-key warnings remain).

## Limitations

The saved-study preview has no original timing rows, so its outlier flags are explicitly unavailable. No browser pass was run.
