# ORDER 1 - India NF 2025-26 rulebook in FORGE
**Model:** Claude Sonnet 5.5 (Jainam's session, branch `next-wave`) · **Date:** 2026-11-02 · **Status:** review (backend done; CAD jump and UI not done)

## Built
- `rulebooks/stem-racing-india-nf-2025-26.yaml`: 80 rules from the Technical Regulations, each with page, limits, penalty, class and a quoted note. Header records both PDF hashes and the known inconsistencies in the source documents. 19 rules are computable from the CAD today; the other 61 are manual review and name the measure to build next.
- `src/daedalus/forge.py`: new measures from part boxes and axles (total height, ground clearance, wheelbase, wheel diameter and contact width front and rear, gap between opposing wheels, nose and rear overhang, cartridge protrusion, body length), `penalty_points` and `points_at_risk`. The frame is x from the nose downstream, so the docstring that said "x forward" is corrected.
- `src/daedalus/api/forge.py`: India rulebook is the default, the 2026/27 file stays available as `?rulebook=development-2026-27`, `/v1/forge/checks` now returns `points_at_risk`, and `GET /v1/forge/sheet.pdf` returns the scrutineering sheet. `RULEBOOK` is kept so `api/cad.py` still imports it.
- `src/daedalus/forge_sheet.py` and `src/daedalus/report/sheet.typ`: the printable sheet, one row per rule with limit, penalty, class, CAD result and blank Car A, Car B and remarks boxes.
- `tests/test_forge_india.py`: 14 tests. They include a cross-check of the rulebook against the regulations' own lists (the 25 Performance rules in C3.6.2 and the 12 Safe/Fit to race rules in C4.5).

## How to run / see it
```bash
PYTHONPATH=src python -m pytest tests/test_forge_india.py tests/test_forge.py -q
curl "http://localhost:8000/v1/forge/checks?design=orbit_baseline"
curl -o sheet.pdf "http://localhost:8000/v1/forge/sheet.pdf?design=orbit_baseline"
```
The API calls were not run: the repo's environment (uv, build123d) is not installed on this machine.

## Checks
- `ruff check src tests/test_forge_india.py tests/test_outcome.py`: all checks passed; `ruff format --check`: formatted.
- `pyrefly check` (strict) on `forge.py`, `forge_sheet.py`, `outcome.py`: 0 errors.
- `pytest tests/test_forge_india.py tests/test_forge.py tests/test_outcome.py`: 27 passed.
- The sheet compiled to a 5-page A4 landscape PDF and page 1 was viewed as an image.

## Decisions and deviations
- Wheel diameter is two rules (T7.5-F, T7.5-R) because the check takes one value per rule and the two axles can differ.
- Bounding boxes give exact heights and clearances (the lowest vertex is the box floor) but can over-state widths and chords. T7.4.1, T7.4.2 and T2.7.1-L are marked `approx` so a CAD failure shows as at risk, not as a certain loss.
- Per-mm penalties are charged per whole unit outside, rounded up (T2.5.2). An at-risk rule is scored as one unit.
- The T2.7.1 body rules have no penalty in the text, so they report as unquantified, not as zero.

## Known gaps (for reviewer)
- Not done: the Chili3D `daedalus:focus` bridge message and clicking a rule in `LegalPanel.tsx` (needs the vendored Chili3D rebuild and a browser check), and showing points at risk in the LegalPanel header.
- Not tested against a real design: no `geometry.json` is available on this machine. Run the checks against `orbit_baseline` once and compare the six values (width, height, wheelbase, wheel diameter, clearance, cartridge height) with the CAD by hand.
- The rules that need mesh work are still manual: chamber diameter, depth and angle, wall thickness, wing thickness, halo notch height, virtual cargo, visibility volumes, tether guide position and mass.
- Wheel solids are recognised by spanning the wheel diameter in z; a wheel modelled as several solids would be missed and would fall back to manual review.

## References
- STEM Racing India NF 2025-26 Technical Regulations (local copy `data/reference/rules/india_nf_2025_26/`), Competition Regulations C3.6.2 and C4.5.
