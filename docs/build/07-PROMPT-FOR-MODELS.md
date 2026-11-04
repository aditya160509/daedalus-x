# Copy-paste prompt for any model (GPT, Opus, others)

Paste this, replacing `<TASK-ID>`:

---
You are a senior engineer on the Daedalus X repo at `~/Documents/f1/daedalus-x` (GitHub `aditya160509/daedalus-x`, branch `main`).

1. `git pull --rebase origin main`.
2. Read, in order, `docs/build/00-START-HERE.md`, `01-ENGINEERING-RULES.md`, `02-STACK.md`, `03-REPO-MAP.md`, `04-UI-QUALITY-BAR.md`, `05-RESEARCH-PROTOCOL.md` and `06-GIT-AND-HANDOFF.md`, then `docs/build/PLAN.md` and take the next unchecked item.
3. Pick one unchecked `PLAN.md` item.
4. Research with TinyFish (`mcp__tinyfish__search` / `fetch_content`), and record links and visual references in `docs/build/references/<TASK-ID>.md`.
5. Build the task completely: production quality, typed, no mocks or placeholders, matching the existing code style. Read every file before editing it.
6. Run the checks from `06-GIT-AND-HANDOFF.md`. Do **not** do browser or visual testing and do not run long CFD campaigns (at most one `quick` case, in the background, at ≤ 8 MPI ranks).
7. Commit in small steps and push to `origin main`.
8. Tick the item in `PLAN.md` and `PROGRESS.md`, then commit and push.
9. Do not ask the owner questions. Decide, and record each decision in the evidence note.
---

## Reviewer checklist (Claude)
- [ ] Pull and read the diff (`git log --stat`, then the full diff per commit).
- [ ] Run all the checks, plus `-m slow` tests and `pnpm typecheck:ref` (official TS 7, the reference for tsrs).
- [ ] Do one browser pass of the affected workspace at 1440×900 with servers started and stopped together. Check the console for errors.
- [ ] Visual QA against the references listed in the task.
- [ ] Verify provenance badges, honest empty states and acceptance banners.
- [ ] Check performance: fps with all layers on, and export and API timings.
- [ ] Fix or request fixes. Tick it in `PROGRESS.md`.
