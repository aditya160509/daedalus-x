# P6-07 (first slice) + P1-02 (race endpoint) — Race telemetry workspace
Owner: Claude     Commits: see git log     Date: 2026-10-30

## Done
- `POST /v1/race/simulate` (FastAPI): validated request (bounds, increasing time, non-negative force, thrust provenance + source required), runs TITAN M1/M2, returns time, DNF reason, peak speed and aligned channels (position, velocity, acceleration, thrust, drag, rolling) downsampled to ≤ 2000 samples; output always provenance "predicted" with input provenance listed.
- `uv run daedalus-api` entry point (localhost only); Next.js proxies /api.
- Race workspace: model selector, car inputs with units, thrust from parametric estimate or CSV import (validated parser, units checked), impulse readout, live re-simulation on edit, KPI tiles, ATLAS-style stacked telemetry (shared cursor, linked zoom, burn-end/finish markers), "Unvalidated" evidence status until measured runs exist.

## Checks run (command → result)
- `uv run pytest` → 34 passed (5 API tests incl. analytic t = 1.000 s through the API)
- `npx vitest run` → 5 passed (thrust estimate, impulse, CSV parser)
- Browser: default inputs → 0.995 s, 23.43 m/s peak, 0.496 N peak drag (all labelled predicted/estimated)

## Acceptance criteria
- [x] No extrapolated channels; non-finish shows DNF, no time
- [x] Cursor/zoom linked across all tracks
- [ ] Measured vs predicted overlay and sealed predictions — needs P2-02 and real runs

## Not done / known limits
- Default car and thrust values are labelled assumptions (spec §1.3 scenario), not measurements.

## Data provenance
- All shown values: predicted from estimated inputs.

## Review
Reviewer: Claude   Verdict: ACCEPTED (first slice)
