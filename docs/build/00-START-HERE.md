# Daedalus X — Build Pack (read this first)

You are an AI engineer joining a project that is about 40% built. These documents tell you **what to build, in what order, where the code goes, which software to use, and how good it must be**. The spec (`docs/SPEC.md`) states *why*. This pack states *how*.

The owner reviews and verifies. **You build.** Do not ask the owner questions. When something is ambiguous, pick the option most faithful to the spec, write the decision in your handoff note, and keep going.

## 1. Read in this order (about 20 min)
1. `00-START-HERE.md` (this file)
2. `01-ENGINEERING-RULES.md`: non-negotiable code rules
3. `02-STACK.md`: exact software and packages
4. `03-REPO-MAP.md`: what already exists and where to build
5. `04-UI-QUALITY-BAR.md`: the visual standard (commercial F1 or CFD-vendor grade)
6. `05-RESEARCH-PROTOCOL.md`: how to research with TinyFish and record links
7. `06-GIT-AND-HANDOFF.md`: GitHub, commits, pushing, handoff notes
8. Then **one task file** from `tasks/`, the next one marked `todo` in `TASK-BOARD.md`.

## 2. Mission in one paragraph
Daedalus X is a local-first race-engineering cockpit for a STEM Racing (F1 in Schools) CO₂ car. It imports the car's CAD and runs real OpenFOAM CFD on a Mac. It shows the airflow like a commercial wind tunnel (AETHER) and predicts race time with uncertainty (TITAN). It suggests the next best design experiment (ORACLE), checks the rulebook (FORGE), and keeps a tamper-proof record of every claim (ATLAS). It also presents everything to judges (Competition Mode). Everything is free and open source and runs on one Apple-silicon Mac (10 cores, 16 GB).

## 3. Hard constraints
- **Free only.** No paid APIs, SaaS, cloud CFD or licence-locked software.
- **Local only.** Runs on the owner's Mac. OpenFOAM v2606 runs through the OpenFOAM.app wrapper (`openfoam -c "<cmd>"`).
- **No mocks, stubs, fake data or placeholder UIs.** If real data does not exist yet, the UI shows an honest empty state that says what produces the data.
- **Every number has provenance** (`measured | simulated | predicted | estimated | synthetic`) and, for CFD, an acceptance state. A rejected run is never shown without its rejection banner.
- **Respect the machine.** CFD uses at most `cores − 2` = 8 MPI ranks. Never run CFD, a dev server and a browser at the same time. Prefer the `quick` fidelity preset while developing.
- **`main` branch only.** Commit small, push after every task (see `06`).

## 4. What you do and don't do
| You do | You don't |
|---|---|
| Write production code, unit tests and type-clean code | Browser or visual QA, screenshots, Playwright runs (the reviewer does this) |
| Run `ruff`, `mypy --strict`, `pytest` (only the tests you touched, plus the full suite once at the end), `npm run check` (tsrs + type-aware oxlint + vitest) | Long CFD campaigns. Run at most **one** `quick` case to prove a pipeline works, in the background |
| Research with TinyFish and record links | Invent features beyond the task file |
| Update `STATUS.md`, `TASK-BOARD.md` and write an evidence note | Touch other tasks' files unless the task says so |

## 5. Definition of done (every task)
1. Every acceptance item in the task file is met.
2. Checks are green: `uv run ruff check . && uv run mypy src tests && uv run pytest -q`, and in `apps/cockpit`: `npm run check`.
3. `evidence/<TASK-ID>.md` is written: what was built, files, commands run with output, decisions, known gaps.
4. `TASK-BOARD.md` row set to `review`, and the `STATUS.md` row updated.
5. Committed and pushed to `origin main`.

## 6. Order of work
See `TASK-BOARD.md`. Tasks are ordered so each builds on finished work. Two models may work at once **only** on tasks marked parallel-safe there, because they touch disjoint files.
