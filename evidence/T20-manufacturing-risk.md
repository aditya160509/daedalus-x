# T20 — manufacturing pass probability

## What this adds

`src/daedalus/forge_probability.py` turns the CAD-only FORGE checks into a declared process-capability estimate:

- Each computable millimetre rule is sampled from `Normal(CAD value, sigma_mm)`.
- `P(pass)` is the share of draws inside the rule's limits.
- `expected_points_lost` uses the rulebook penalty: a flat penalty is charged once per failed draw; a per-mm or per-g penalty is charged for each whole unit outside, matching `forge.penalty_points`.
- `p95_points_lost` and `cvar95_points_lost` describe the tail across all rules.
- `overall_pass_probability` is the share of draws where every included rule passes. This assumes independent rule errors.

`POST /v1/forge/pass-probability` takes `design`, `sigma_mm`, optional `rule_sigmas` for other units or per-rule overrides, and a sample count. Manual rules, rules without a CAD value, rules without limits, and non-millimetre rules without an override are excluded and counted; they are never treated as passes.

The Rules panel in the Pit Wall now exposes a **Manufacturing risk** disclosure with a process-sigma input, overall pass chance, expected points, p95 and tail loss. The panel states that the result is a normal independent process model, not a measured capability.

## Tests

`tests/test_forge_probability.py` covers:

- a one-sided boundary giving 0.5 pass probability;
- flat and per-unit expected penalties;
- independent overall probability (`0.5 × 0.5 = 0.25`);
- manual and degree rules excluded, and included through a sigma override;
- unstated penalties returning no points while keeping a pass probability;
- deterministic seeded runs;
- rejection of unknown rule overrides;
- the API response and 422s for zero sigma and an unknown rule.

## Checks run

- `uv run pytest tests/test_forge_probability.py tests/test_forge.py tests/test_forge_india.py -q` → 27 passed.
- `uv run ruff check` and `uv run ruff format --check` on the changed Python files → pass.
- `tsc --noEmit`, focused `oxlint`, `oxfmt`, `pnpm build` on the cockpit → pass.

## Limits

- The sigma is supplied by the team, not measured from parts. Real process capability needs repeated measurements of manufactured parts.
- The model is independent Normal per rule. Shared setup, material and operator errors are correlated, so the overall probability is an approximation.
- Approximate CAD measures keep their method uncertainty; the model adds only manufacturing spread.
- Per-wheel and per-axle penalty multipliers are not modelled, so expected points can be conservative.
- Body wall thickness and chamber bore/depth measures are still not implemented; those rules stay manual.
