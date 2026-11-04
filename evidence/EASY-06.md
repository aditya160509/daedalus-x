# EASY-06 — Per-rule probability plot and table

## Changed

- `apps/cockpit/src/components/pitwall/LegalPanel.tsx`
  - Adds `RuleRiskChart`: ECharts horizontal bars of per-rule pass probability, weakest first, with PNG export.
  - Adds `RuleRiskDetail`: native TanStack Table of rule, probability, sigma, expected loss and excluded/unquantified notes.
  - Displays a null expected loss as unavailable with the reason, never as zero.
  - Keeps manual/non-length rules excluded from the probability plot and says so.

## Reused

Existing FORGE probability API (`pass_probability`, `sigma`, `expected_points_lost`, `excluded_rules`, `unquantified_rules`), ECharts and TanStack Table v9. No probability model was added.

## Checks

- `pnpm exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors.
- `oxfmt --check` — pass.

## Limitations

The probability calculation’s assumptions are backend-defined; this UI does not validate them. Browser interaction and the physical meaning of sigma remain unverified.
