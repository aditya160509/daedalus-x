# T11 — FORGE: rules and inspections

**Spec:** §6 (all) · **Lane:** backend-api + frontend-2d · **Files:** new `src/daedalus/forge/` (`rulebook.py`, `checks.py`, `inspect.py`), `api/forge.py`, `src/app/inspect/*`

## Build
1. **Rulebook ingestion** (`rulebook.py`):
   - Store the official PDF as an artifact (hash recorded).
   - `pdfplumber` extracts text with page and line locations.
   - Rules are **hand-encoded** in `rulebooks/<revision>.yaml` at the repo root (tracked in git; `data/` is ignored), one entry per computable rule with all spec §6.2 fields: `rule_id, revision, text_location (page:line), class, measurement_method, referent, unit, min/max/exact, severity, tolerance, computable`.
   - Write a validator that every `text_location` resolves to real text in the PDF. Never fabricate penalties.
   - The team's India Nationals rulebook is not in the repo yet. Build with the STEM Racing World Finals technical regulations as `is_reference_only: true`, and find the current PDF with TinyFish.
2. **Deterministic checks** (`checks.py`) from `geometry.json` plus the display mesh:
   - Overall length, width and height, wheel diameter/width, wing span/chord where measurable, minimum ground clearance, cartridge chamber position, and mass (from measurements, T09).
   - Each check returns a state from §6.2 plus the margin with units, the referent part(s) and a confidence note ("CAD-only").
3. **Inspections** (`inspect.py`): record a measured inspection (instrument, resolution, repeated readings, operator, photos as artifacts). The state moves from `pass_cad_only` to `pass_measured`/`fail_measured` only with measurements.
4. **API** `/v1/forge/rulebooks`, `/v1/forge/checks?design=`, `/v1/forge/inspections` (POST, GET).
5. **UI** (Inspect workspace):
   - A rules table with sticky headers, columns rule, clause link (opens the PDF page in a side panel via the browser's built-in PDF viewer), state badge, margin bar (centred on the limit) and evidence count.
   - The 3D car with **Rule Hotspots**: failing parts glow red, at-risk parts amber, and clicking a row highlights its referent parts.
   - Distinct badges for design compliance vs manufactured compliance (spec §6.1).
   - An "Evidence pack" export button (writes the JSON now; the PDF comes in T13).

## Acceptance
- [ ] Tests: YAML schema validation, text-location resolution against a tiny fixture PDF, check margins on a synthetic geometry.json, and no state reaches `pass_measured` without readings.
- [ ] The UI shows `manual_review` for every non-computable rule; nothing is silently green.

## References
- STEM Racing (find current technical regulations PDF): https://www.stemracing.com/
- pdfplumber: https://github.com/jsvine/pdfplumber
