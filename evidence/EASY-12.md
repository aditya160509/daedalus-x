# EASY-12 — Compact FORGE summary export

## Changed

- `src/daedalus/forge_sheet.py` — adds `summary_data` and `compile_summary`; counts fail/risk/manual/CAD-pass, points at risk, findings with pages and explicit omitted-finding count.
- `src/daedalus/report/summary.typ` — one-page A4 summary with the CAD-only disclaimer and a reference to the full sheet.
- `src/daedalus/api/forge.py` — `GET /v1/forge/summary.pdf`.
- `apps/cockpit/src/lib/api.ts` — `forgeSummaryUrl(design)`.
- `apps/cockpit/src/components/pitwall/LegalPanel.tsx` — summary link beside the full scrutineering sheet.
- `tests/test_forge_india.py` — count/compile test.

## Reused

Existing Typst pipeline, FORGE checks and `points_at_risk`. No new PDF library.

## Checks

- `uv run pytest -q tests/test_forge_india.py tests/test_report.py tests/test_source_identity.py` — pass.
- `uv run ruff check` / `ruff format --check` on changed Python — pass.
- Compiled a one-page fixture and rendered it with Poppler; counts, findings and provenance block were visually inspected without clipping.

## Limitations

The summary is CAD screening, not measured scrutineering approval. An official source-PDF archive remains open.
