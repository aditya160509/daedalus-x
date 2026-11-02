# T12 evidence coverage and next actions

The ATLAS drawer already had a timeline, hash verification and a React Flow lineage graph of stored references. It showed what exists but not what the team still had to record.

## What changed

- `coverage.py` derives missing next actions from the same append-only records, in one pass. Each gap names the waiting record (`entity_kind` + `entity_id`) and any related IDs, so it points at a real design, solver run, build, calibration study or prediction.
- Rules, all factual rather than a score:
  - a design with no solver run, no physical build, no rules inspection and no sealed prediction;
  - a succeeded solver run with no observation referencing it (failed/queued runs are ignored, since they prove nothing);
  - a physical build with no race run;
  - a `titan` model with no prediction;
  - a saved calibration with no held-out runs;
  - a prediction with no measured race run for any build of its design;
  - a sealed prediction with no stored RFC 3161 response, or a stored response with no passing verification.
- `GET /v1/evidence/coverage` returns the gaps plus counts by kind. The lineage endpoint now adds a `gaps` array to each node and the Coverage view lists every gap grouped by kind with the entity and related IDs. A selected node shows its own open actions.
- The lineage node shows "N open actions"; the header counts them. The Coverage tab states that gaps disappear as soon as the missing record exists and are not an editable checklist.

## Checks run

- `pytest tests/test_coverage.py tests/test_evidence_lineage.py tests/test_api_evidence.py` → passed (5 new coverage tests plus the existing lineage/API tests).
- New tests cover a bare design, a fully recorded chain, an unextracted successful run, a failed run, a study without held-out runs, an unscored prediction, and the API/lineage payloads.
- `ruff check`/`format`, `tsc --noEmit` and focused `oxlint` on the changed files passed.

## Limits

- The rules are heuristics about which records to expect. They do not judge whether a recorded run, inspection or source is adequate.
- A gap outside the newest 500 lineage records appears in the Coverage list but has no node in the current graph window.
- No browser/visual check was run, and no real race, calibration or timestamp data was added in this pass.
