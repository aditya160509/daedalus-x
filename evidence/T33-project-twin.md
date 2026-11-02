# T33 project twin: scorecard, assumptions and saved forecasts

The Project workspace previously had a saved task plan (three-point duration estimates, dependencies, deadline) and an on-demand Monte Carlo forecast. It had no assumptions record, no source references, no evidence-coverage view and no saved forecast.

## What is now stored and shown

- Plan fields (`data/project/plan.json`, still local engineering data, not committed): `currency`, `start_date`, per-task `source`, `assumptions` (id, text, optional value/unit, source, basis: official/measured/estimated/assumed) and `scorecard` (id, criterion, declared points, claim, evidence reference, status missing/partial/complete). The team enters the criteria and weights; nothing is inferred from the rulebook here.
- `POST /v1/analysis/project/forecast` appends a `ProjectForecast` (`fc_*`) record plus two content-addressed artifacts: the exact plan JSON (`project_plan`) and the result JSON (`project_forecast`). The record keeps the plan SHA-256, p50/p80 days, finish and budget probabilities and the critical path. Artifacts hang off the first `Project` record, or a new one if the store has none.
- `GET /v1/analysis/project/forecasts` lists saved forecasts newest first with their plan hash, so an earlier prediction can be compared with the outcome later.
- The workspace shows an Assumptions table, a Scorecard table with evidenced/total declared points, an Evidence-gaps panel derived from empty sources and incomplete claims (labelled derived, not an audit), and the saved-forecast list. The plan footer now has budget, currency and start date; the task table has a Source column.
- The UI keeps the existing synthetic example badge until the team saves its own plan.

## Checks run

- `pytest tests/test_api_analysis.py tests/test_project.py tests/test_store.py` → 26 passed.
- Added: saved forecast round trip (`forecast_id`, list, plan hash), and plan source/assumption/scorecard round trip.
- `ruff check`/`format`, `tsc --noEmit` and focused `oxlint` passed.

## Limits

- Forecasts are only as good as the entered three-point estimates; the module already says so.
- No browser/visual check was run in this pass.
- The plan file itself is not an evidence artifact until a forecast is made; only saved forecasts carry hashed plan and result copies.
- Missing-evidence indicators are derived from user text fields. They show what the team has not yet referenced, not whether the referenced material is adequate.
