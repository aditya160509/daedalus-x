# Step 1 — India NF honesty correction

2026-11-02 · Codex · main

Replaced the UK D8.5 rear-wing example in `docs/innovation.md` and `docs/build/CHECKLIST.md` with the current India NF FORGE result, and qualified the judge pitch's synthetic-optimiser claim.

Reproduction: `forge.check_design(Path('data/designs/orbit_v2'), Path('rulebooks/stem-racing-india-nf-2025-26.yaml'))`, selecting T7.2.1. Result: opposing front-wheel gap 33.00 mm, minimum 38.00 mm, margin −5.00 mm, `fail_cad`, page 29, parts `f1_wheel_front-right_v8` and `f1_wheel_front-left_v3`. `penalty_points` gives 12.5 potential points at the rule's 2.5 points/mm/axle. This is imported CAD evidence, not a physical measurement or an official penalty.

- Geometry SHA-256: `e83c155d23567404ed328dc217845eaf19579fb19d6a389c38d6575aae68b6b5`.
- Rulebook SHA-256: `6181f6f5267dffc694257e4f665cac92ba7f1e5b5225d8bc60f04355b97239e7`.
- Current book has 80 rule entries; 19 compute on `orbit_v2`. Unsupported measures remain manual.

Checks: Ruff check and format check pass; `tests/test_forge_india.py tests/test_forge.py`: 15 pass; TypeScript passes; Oxlint has no errors (existing warnings remain); Vitest: 33 pass. Root Ruff initially entered untracked `.claude` checkouts; added `.claude/` and `data/` to `.gitignore` to enforce the owner's no-commit rule and exclude unrelated code.

Both servers started together, no CFD or heavy build. Fresh URL `/design?v=102#rules`, selected `orbit_v2`; browser console: 0 errors, 0 warnings. Screenshots: `output/playwright/step-1-desktop.png` (1440×900), `output/playwright/step-1-mobile.png` (375×812).

Desktop shows the actual India gap finding. The baseline mobile shell does **not** collapse its 232 px sidebar and clips the Rules view; mobile responsiveness is not passed or ticked. Fix this while connecting rule → CAD, before treating that interaction as mobile-ready. The sidebar also still labels the old UK book; correct that visible context in the next piece. Servers stopped after inspection.
