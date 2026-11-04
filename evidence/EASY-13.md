# EASY-13 — Source identity in report and sheet PDFs

## Changed

- `src/daedalus/source_identity.py` — full streamed SHA-256 for rulebook/geometry, bounded 2 s local `git` lookup with `shutil.which`, no shell/network, explicit `unavailable` state without `.git`, and a readable dirty/clean commit label.
- `src/daedalus/api/forge.py`, `src/daedalus/api/report.py` — wire identity into sheet/summary/report data and preserve the existing report data hash.
- `src/daedalus/report/report.typ`, `sheet.typ`, `summary.typ` — compact provenance block with full hashes, code snapshot and generated time; YAML revision/hash kept separate from official PDF identity.
- `tests/test_source_identity.py` — full hash, missing file, revision separation, no-`.git` state and bounded Git call.

## Reused

Existing hashlib, Typst and report/FORGE data flow. No new dependency.

## Checks

- `uv run pytest -q tests/test_source_identity.py tests/test_importers.py tests/test_forge_probability.py tests/test_forge_india.py tests/test_report.py` — 53 tests passed.
- `uv run ruff check` / `ruff format --check` — pass.
- Compiled report, sheet and summary fixtures and rendered pages with Poppler. Full hashes, dirty-tree label and provenance notes are readable without clipping.

## Limitations

This improves J10 only. It does not register runs in the evidence store, archive the official rule PDF, or establish an offline demo/recorded fallback.
