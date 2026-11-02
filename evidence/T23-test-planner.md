# T23 test planner

Pit Wall → Test planner sends editable nominal CdA, Crr, thrust scale, density, timing noise, prior uncertainty, test budget, two masses and two track lengths, and optional fast/slow coast-down candidates to `/v1/analysis/test-plan`. It displays the API's sequential D-optimal recommendations, gain in nats, starting and per-step relative standard deviations, poorly identified parameters, and model assumptions. It uses the existing Race estimated thrust curve by default, labelled as an estimate; a two-column thrust CSV may be supplied. This UI does not record test outcomes.

The ranking uses the existing linear-Gaussian information-gain and coast-down model, with a fixed density across candidates and a shared noise assumption. It cannot rank density variations or incorporate completed coast-downs; the API accepts prior timing conditions but this UI does not supply them. Feasibility and physical validation remain external work. The interface uses existing TanStack Query, Zod and project shadcn/Base UI components; no upstream code or dependencies were added.

Checks: `uv run pytest -q tests/test_testplan.py tests/test_api_analysis.py -k test_plan` passed (3 selected); frontend TypeScript and focused oxlint run. No browser or physical validation was performed.
