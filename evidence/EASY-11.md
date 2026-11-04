# EASY-11 — Configured-part safety comparison

## Changed

- `apps/cockpit/src/components/strength/StrengthPanel.tsx`
  - Capture is disabled while inputs are debouncing or the solver request is pending.
  - Captures `structuredClone` of the exact debounced request and resolved result, including dimensions, material, load, safety factor, peak stress and deflection.
  - Supports up to four configured cases, removal and CSV export; editing inputs does not rewrite captured rows.
  - Displays a null safety factor as `∞` with an explanatory note instead of a fabricated number.

## Reused

Existing beam solver and native TanStack Table v9. Handbook material values remain labelled estimates.

## Checks

- `pnpm exec tsc --noEmit` — pass.
- Focused `oxlint` — existing warnings only; no new errors.
- `oxfmt --check` — pass.

## Limitations

The comparison is session-local. It does not perform physical load testing or infer actual-car geometry, and handbook material values are not measured.
