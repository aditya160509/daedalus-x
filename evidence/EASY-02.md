# EASY-02 — Limitations slide

## Changed

- `apps/cockpit/src/components/present/Presenter.tsx`
  - Adds a **What is still unverified** slide between Legal and Live demo.
  - Reads live dossier statuses for `V&V-03` (accepted CFD/grid study) and `V&V-05` (measured race validation), with a loading/unavailable fallback.
  - States synthetic or mixed ORACLE observations, handbook beam estimates, pending physical-GPU/responsive QA (dated 2026-11-04) and that a hash proves integrity, not physics.

## Reused

Existing verification dossier query and status vocabulary. No new validation state or badge was invented.

## Checks

- `pnpm --dir apps/cockpit exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors.
- `oxfmt --check` — pass.

## Limitations

The static facts are dated 2026-11-04 and the live dossier statuses depend on the local store. No browser acceptance pass was run in this session.
