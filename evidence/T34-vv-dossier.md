# T34 V&V dossier

## What is now built

- `src/daedalus/dossier.py` evaluates ten requirements against the append-only evidence store:
  evidence hash integrity, official rule revision, accepted CFD run, solver traceability,
  measured race baseline, out-of-sample calibration, sealed prediction, third-party timestamp,
  prediction scored against a measurement, and measured rule inspection.
- Every requirement returns `verified`, `partial`, `failed` or `no_evidence` with the record IDs
  behind the verdict. A requirement with no records is never reported as passed.
- `failures` lists rejected/failed solver runs, failed timestamp verifications, failed measured
  inspections and artifacts that fail their hash check.
- `limitations` states what the stored checks do not cover, plus data-derived limits (no measured
  race run, no held-out calibration, reference-only rulebook, no accepted CFD).
- `outstanding` reuses `coverage.missing_actions`, so the dossier does not keep a second todo list.
- `GET /v1/report/dossier` returns the JSON; `?format=md` returns a Markdown download.
- The Project workspace has a V&V dossier panel with status counts, the requirement table, recorded
  failures, limitations/open actions and the Markdown download.

## Checks run

- `uv run pytest tests/test_dossier.py tests/test_coverage.py tests/test_report.py -q` → 9 passed.
- `uv run ruff check` and `ruff format --check` on the changed Python files → pass.
- `pnpm exec tsc --noEmit`, focused `oxlint` and `pnpm build` → pass (9 static pages).
- No browser/visual check was run in this pass; the API and dev servers were not started.

## Limits

- Red-team mode and the post-event regret report are not built, so T34 remains partial.
- The requirement catalogue is code-defined. It reports the checks the team wrote down; it cannot
  discover a validation domain nobody recorded.
- Tests use temporary synthetic stores. No real CFD campaign, timestamp authority or physical
  measurement was re-run, so the dossier currently reports whatever the real store contains.
- Hash verification proves file integrity, not that the model or the car is correct.
