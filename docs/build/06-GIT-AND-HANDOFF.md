# GitHub, commits and handoff

## Repo
- Remote: `origin = https://github.com/aditya160509/daedalus-x.git` (private). It is already cloned at `~/Documents/f1/daedalus-x`. If you work elsewhere: `gh repo clone aditya160509/daedalus-x`.
- **Branch: `main` only.** No feature branches and no PRs. `git pull --rebase origin main` before you start and before every push.
- The token lacks the `workflow` scope, so **never** add files under `.github/workflows/` (the CI template lives in `ci/`).
- Never commit `data/` (git-ignored), secrets, `.env`, or files over 5 MB. Screenshots go in `evidence/screens/<TASK-ID>/` as JPG ≤ 400 KB.

## Commit rhythm
- One logical change per commit, and push at least once per task (ideally after each sub-step that keeps the checks green).
- Message format:
  ```
  <Area>: <imperative summary under 72 chars>

  <why / what, wrapped at 72>

  Co-Authored-By: <your model name> <noreply@anthropic.com or vendor equivalent>
  ```
  Areas: `CFD`, `Viz`, `API`, `Race`, `Oracle`, `Forge`, `Atlas`, `UI`, `Docs`, `Infra`.
- Before every commit:
  ```bash
  uv run ruff format . && uv run ruff check . && uv run pyrefly check && uv run pytest -q -m "not slow"
  cd apps/cockpit && pnpm format && pnpm check   # oxfmt check + tsrs + type-aware oxlint + vitest (~1 s)
  ```
- Then `git add -A && git commit && git pull --rebase origin main && git push origin main`.

## Handoff note: `evidence/<TASK-ID>.md`
```markdown
# <TASK-ID> — <title>
**Model:** <name> · **Date:** YYYY-MM-DD · **Status:** review

## Built
- bullet per capability, with file paths

## How to run / see it
- exact commands and the UI route

## Checks
- paste the tail of each check command (pass counts)

## Decisions and deviations
- each decision you made without asking, with the reason

## Known gaps (for reviewer)
- anything untested in a browser, any visual that needs eyes, any perf concern

## References
- docs/build/references/<TASK-ID>.md
```
Then set the task to `review` in `TASK-BOARD.md`, update `STATUS.md`, commit as `Docs: <TASK-ID> handoff`, and push.
