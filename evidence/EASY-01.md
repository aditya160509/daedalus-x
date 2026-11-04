# EASY-01 — Presenter honesty and benchmark wording

## Changed

- `apps/cockpit/src/components/present/Presenter.tsx`
  - Renames synthetic targets as **ORACLE observations**, not CFD runs.
  - Labels the race figure as a **model race time** and calls the next-point gain a GP prediction.
  - Says **synthetic** or **mixed** provenance explicitly instead of implying measurement.
  - Uses the stored CFD run list for the flow slide and shows “No flow source available” when no solved run exists; no substitute image.
  - Names the benchmark **GP/EI vs Latin hypercube** and says it is a synthetic equal-budget study, not CFD or physical validation.
  - Keeps the legal slide CAD-only and leaves manual-review rules manual.

## Reused

Existing React Query API (`listCfdRuns`, `getOracleState`), `AeroMap`/`BenchmarkChart`, `LegalPanel`, `HeroImage` and the existing presenter keyboard/timer. No new chart or statistics engine.

## Checks

- `pnpm --dir apps/cockpit exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors.
- `oxfmt --check` — pass.

## Limitations

Browser acceptance at 1440/1024/375 px is still pending. The slide cannot upgrade synthetic or CAD-only data; it only reports the stored status.
