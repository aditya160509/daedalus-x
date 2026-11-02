# T13 judge pack

The app already produced an engineering report PDF, a drawing pack, FORGE rule findings, run manifests and an evidence store with hash verification and coverage. They were separate downloads, so a judge had to assemble the submission by hand.

## What changed

- `judge_pack.build_pack` compiles one ZIP from the existing outputs rather than duplicating their logic:
  - `report.pdf` from the existing Typst report endpoint;
  - `drawings/<design>.pdf` from the existing drawing export;
  - `rules/<design>-checks.json` from FORGE, including `is_reference_only`;
  - `designs/*-oracle.json` and `runs/*-manifest.json` / `*-result.json` copied from the data directory;
  - `evidence/verification.json` (store hash check, record count and counts by kind) and `evidence/coverage.json` (derived missing actions);
  - `README.txt`, `MISSING.txt` and `manifest.json` with each included file's size and SHA-256.
- `GET /v1/report/judge-pack` returns the ZIP as an attachment with an `X-Daedalus-Missing` count. Path separators in `design`, `team` or `number` are rejected.
- An export that cannot be produced is omitted and named in `MISSING.txt` with the exception text; no placeholder PDF or invented number is substituted. A reference-only rulebook, a missing design/run, a broken evidence hash and open coverage actions are all listed as missing material.
- The Pit Wall header now offers "Judge pack ZIP" next to "Report PDF".

## Checks run

- `pytest tests/test_judge_pack.py tests/test_report.py` → 5 passed. The pack tests replace the Typst/drawing/rule exports with fakes, verify every hashed entry, check the failed-drawing path leaves no file but explains why, and call the endpoint for the ZIP plus a rejected traversal.
- `ruff check`/`format`, `tsc --noEmit` and focused `oxlint` passed.

## Limits

- The report and drawing exports were not generated for real in the tests; only their failure path is exercised. A live Typst compile and STEP-backed drawing pack remain needed.
- The evidence hashes cover stored files, not the physical car, and a CAD-only rule check is not a measurement.
- No browser/visual check was run; the ZIP link was not clicked in a running UI.
