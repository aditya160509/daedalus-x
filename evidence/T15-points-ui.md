# T15 racing-points scenario panel

## What was already true

`src/daedalus/outcome.py` and `POST /v1/analysis/racing-points` already existed and were covered by `tests/test_outcome.py` and `tests/test_api_analysis.py::test_racing_points_endpoint`. The task board's "no API or UI" note was stale.

## What this pass adds

- `RacingOutcome` contract and `racingPoints()` client in `apps/cockpit/src/lib/api.ts`.
- A **Points** tab in the Race workspace (`components/race/PointsPanel.tsx`) with:
  - editable car time/spread, reaction mean/spread, field best/spread, round-opponent base/spread, DNF probability and reaction races counted;
  - field-source selection (`synthetic`, `estimated`, `measured`) and the fastest-car eligibility flag;
  - deterministic samples generated from the entered means/spreads, so the scenario is reproducible;
  - expected total points, reaction p05–p95, knock-out points and fastest-car chance;
  - a points-source bar, a knock-out win-probability chart with the 50% line, and the model assumptions.
- The panel can adopt the current race simulation as the car-time baseline.
- `app/loading.tsx` gives route transitions a layout-shaped skeleton.

## Checks

- `pytest tests/test_judge_pack.py tests/test_dossier.py tests/test_energy.py tests/test_api_analysis.py` → 26 passed.
- `tsc --noEmit`, focused `oxlint`, `vitest` and `pnpm build` → pass (recorded in the same commit).

## Limits

- The field model is an assumption. `synthetic` and `estimated` are labelled as such, and the panel says a scenario is not a field prediction.
- The generated samples are a normal approximation of the entered mean/spread, not measured timing data.
- ORACLE still minimises drag area; using expected points as the optimiser objective is not wired.
- No browser or visual check was run in this pass.
