# EASY-07 — Normalised two-sided headroom

## Changed

- `apps/cockpit/src/lib/forgeMargin.ts` — `normalisedHeadroom` divides the signed nearest-limit margin by the full two-sided allowed span; one-sided, zero-span, non-finite or missing values return `null`.
- `apps/cockpit/src/lib/forgeMargin.test.ts` — covers +50%, −25%, zero, one-sided, zero-span and missing data.
- `apps/cockpit/src/components/pitwall/LegalPanel.tsx` and `FrontierPanel.tsx` — show `% of allowed span` beside the absolute margin, or **not applicable**.

## Reused

Existing `RuleCheck` value/min/max/margin fields and FORGE frontier rows. No new statistics.

## Checks

- Vitest: 10 tests across `timingRows`, `forgeMargin`, `calibrationCompare` — pass.
- `pnpm exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors.

## Limitations

The percentage is comparable only for two-sided finite limits; one-sided rules deliberately stay “not applicable”. It is not a probability of passing.
