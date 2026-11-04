# Daedalus X: 15 bounded tasks for the next implementation sprint

Copy this prompt to your coding model, or tell it to read this file and execute it.

You are implementing Daedalus X at `/Users/adityabalaji/Documents/f1/daedalus-x`, GitHub `aditya160509/daedalus-x`, branch `main`, AGPL-3.0. Finish the tasks below in order. Make actual changes; do not stop after proposing a plan. Use the existing installed open-source libraries wherever they already solve the problem.

These are **15 bounded pieces of remaining work**, not 15 complete T01–T35 tasks. Tasks 1–5 are the smallest; 10–13 require more care. Do not claim that finishing this list completes the app. Source snapshot: 2026-11-04; check for newer commits before starting.

## Start here, without rereading everything

1. Run `git status --short` and `git pull --rebase origin main`. Preserve other people's uncommitted files. If dirty files prevent pulling, inspect them and use a reversible autostash; never reset/clean someone else's work.
2. Read `docs/build/PROGRESS.md`, especially **Stop checkpoint — 2026-11-04**. Read `evidence/CHECKPOINT-2026-11-04.md`.
3. Read only the relevant entries in `docs/build/MASTER-PLAN.md` §28 and `docs/build/TODO.md` §14. These are the current scope; historical build orders can contain removed work.
4. Read `apps/cockpit/AGENTS.md` before frontend edits and the applicable locally installed Next.js guide it points to. Dynamic route params are promises in this installed Next version.
5. Read each task's listed source files before editing. If you already read an unchanged file in this session, reuse that knowledge. Do not spend the sprint rereading all documentation.
6. Code discovery: prefer codebase-memory MCP graph tools. This repository was not indexed at the checkpoint; if that remains true, use `rg` rather than repeatedly retrying the graph.

### Existing work to preserve

The checkpoint has pre-existing uncommitted particle-view work in:

- `apps/cockpit/src/app/simulate/SimulateWorkspace.tsx`
- `apps/cockpit/src/app/simulate/FlowTunnel3D.tsx`
- `apps/cockpit/src/components/render/HeroRender.tsx`
- velocity/viz helpers and portions of `apps/cockpit/src/lib/api.ts`
- portions of `docs/build/MASTER-PLAN.md`, and WIND-TUNNEL evidence notes

Inspect current status because another model may have finished these since. Do not discard, overwrite, stage wholesale or claim ownership of that draft. Make narrow edits and stage only your hunks in shared files. Task 5 can be done in chart components without changing the particle-view workspace.

## Quality and reuse rules for every task

- Keep the existing quiet grey engineering UI, one accent, project tokens, Inter and tabular numeric text. Use existing Base UI/shadcn components; do not add a second UI kit.
- Native **ECharts** owns chart rendering/layout/export. `components/charts/useECharts.ts` supplies the existing theme and lifecycle. Native **TanStack Table v9** owns sortable tables through `components/ui/data-table.tsx`. Do not paste v8 examples into this v9 app.
- Keep loading, empty and error states, meaningful accessible names, units on numeric values, and readable 1440/1024/375 px layouts. Controls need keyboard focus and labels. Avoid adding main navigation tabs for these small features.
- Use actual API/source fields. No random demo rows, fake measured badges, invented density curves, silently excluded outliers or fabricated completed tests. Say clearly when results are CAD-only, simulated, synthetic, estimated or user-entered.
- Keep physical/scientific acceptance separate from code completion. Missing measurements stay missing. A chart or a hash does not prove a real car passed a test.
- Reuse installed ECharts, TanStack, SciPy, Typst and Base UI. Most of this list is integration work, not importing entire applications. No new chart engine, statistics engine, solver or heavyweight dependency is needed.
- If external code is actually copied: verify the licence first with `gh api repos/OWNER/REPO --jq .license.spdx_id`; inspect the real licence when metadata says NOASSERTION. Retain notices and credit `THIRD_PARTY.md`. No licence means no copying or line-by-line translation. Use TinyFish search/fetch for outside docs; use official sources and installed types for API details.
- Work on main only. No branches/PRs. Make small descriptive commits, push finished work, and update **PROGRESS.md in the same commit**. Update affected §28 rows and add a brief §23 update in MASTER-PLAN. Do not tick an entire parent task when only this bounded subtask is finished.
- No CFD, meshing, full optimizer studies, long calibration campaigns, heavy builds or new public deployments. Never run heavy workloads alongside dev servers. Do not raise MPI ranks.
- Batch lightweight checks for related changes; do not restart the app after every small edit. Relevant numerical/data transformations need focused tests; simple copy/style edits do not need invented tests. Before handing off, run the changed Python checks/tests and frontend TypeScript/lint checks. Do one combined UI pass if feasible, with API restarted after Python changes; otherwise leave visual gates marked pending. Stop servers you started.
- Existing features already built: Optuna benchmark queue, GP map uncertainty/LOO coverage/length scales, energy Sankey, drag waterfall, beam plots, paired timing CI/MDE, artifact verification QR, reaction-practice stats, and four-tab Race navigation. Do not rebuild them.
- Removed scope stays removed: drawing generator/importer/render packs, base-bleed, competitor scraping, photo/video scrutineering, photogrammetry, community calibration, AR, multi-fidelity, BoTorch/OpenMDAO/trame.

## 01 — Correct Presenter claims and benchmark wording [small]

**Read:**
- `apps/cockpit/src/components/present/Presenter.tsx`: `slides`, especially “The car”, “The flow”, “Aero map”, benchmark and “Legal”.
- `apps/cockpit/src/components/pitwall/PitCharts.tsx`: `BenchmarkChart`, `AeroMap`.
- `apps/cockpit/src/lib/api.ts`: `OracleState`, `CfdRunDetail`.
- `src/daedalus/api/oracle.py`: `state`, `_benchmark`.
- `evidence/CHECKPOINT-2026-11-04.md`: the same honesty fix already applied to the PDF.

**Do:** Replace “CFD runs” when the number is actually `observations.length` with “ORACLE observations”. Remove notes saying synthetic targets are measured drag/tested designs. Rename “ORACLE vs random” to GP/EI vs Latin hypercube. Only discuss a completed benchmark when `benchmark` is non-null and populated; explain its synthetic scope. Show an honest unavailable/source-status state for the flow slide instead of implying an accepted current-car result without the metadata.

**Reuse:** Existing Presenter slide structure, provenance components, current API metadata and BenchmarkChart empty state. Preserve shortcuts, timer and notes.

**Done when:** Every slide's labels and notes agree with its actual source, including null benchmark/no flow data. No claimed benchmark winner is hardcoded. This improves J09/L03; it does not establish real-data acceptance.

## 02 — Add the honest limitations slide [small]

**Read:** `components/present/Presenter.tsx`; `docs/build/PROGRESS.md` latest checkpoint; `src/daedalus/dossier.py`; `components/evidence/DossierPanel.tsx` (all component paths here and below are under `apps/cockpit/src/`).

**Do:** Add one concise “What is still unverified” slide with a useful speaker note. Cover synthetic seed observations, absence of accepted current-car CFD/grid study, lack of independent measured race validation, estimated materials/beam simplifications and pending physical GPU/QA checks. Use live dossier/source status where readily available; otherwise clearly date the checkpoint facts. Do not permanently hardcode a limitation as current if the app can already establish it has been resolved.

**Reuse:** Current Slide/notes/timer machinery. No new presentation library.

**Done when:** The slide appears in navigation, remains legible, and its notes distinguish built software from evidence still needed. Update only the limitations-slide part of J09.

## 03 — Show outlier flags on the actual timing rows [small]

**Read:**
- `src/daedalus/importers.py`: `RaceTimings.outlier_indices`, `parse_race_timing`, `_outliers`.
- `src/daedalus/api/data.py`: `ImportResponse` and race-timing preview response.
- `components/race/CalibrationPanel.tsx`: `pointsToImport`, upload handling and training/held-out preview lists.
- `lib/api.ts`: `TimingImport`.
- `tests/test_importers.py`.

**Do:** Preserve the API's zero-based `outlier_indices` in the Zod client DTO and display a textual warning badge beside each corresponding preview row. Match by row position, not `run_no`; saved-study reconstruction must represent unavailable flags honestly rather than inventing flags. Existing global warning strings already display; do not duplicate that work and call it new.

**Reuse:** Backend's existing median ±5·MAD detector and existing warnings. No new outlier algorithm.

**Done when:** Flagged rows are identifiable and **all rows remain included**. No automatic deletion, changed times or altered fit inputs. Cover index mapping with one focused test. Update the row-level UI remainder of analysis #30.

## 04 — Add PNG export to remaining existing ECharts [small]

**Read:** `components/charts/useECharts.ts`, `HistoryChart.tsx`, `SpreadChart.tsx`, `DragBuildupChart.tsx`; `components/pitwall/PitCharts.tsx`. For a working native example, read `components/strength/BeamPlots.tsx` or `components/pitwall/GpParameters.tsx`.

**Do:** Add native ToolboxComponent/saveAsImage PNG export where absent: histories, MC histogram, longitudinal drag build-up and aero map. Give exports descriptive filenames. Do not add another export layer or rewrite uPlot exports that already exist. Ensure toolbox and legend do not overlap at narrow widths.

**Done when:** Each targeted visible chart offers a working export with readable units/legend. Leave all-chart export acceptance partial until the other charts are checked. L03/shared chart quality bar.

## 05 — Add source captions to those four chart areas [small]

**Read:** Same components as 04 and their callers in `app/simulate/SimulateWorkspace.tsx`, `app/race/RaceWorkspace.tsx`, `app/PitWall.tsx`. Read the existing pending workspace diff before touching callers.

**Do:** Provide a concise caption explaining what each plot shows and what it does not establish: iteration histories, simulated MC trials, integrated surface drag and fitted GP map. Use actual source/provenance supplied by the caller; avoid a second badge where the parent already has one. Include units and a clear no-uncertainty statement where relevant, without inventing intervals.

**Done when:** Captions match the actual plotted quantity and do not imply measured/GCI-accepted data. Prefer component-level changes or narrow caller edits; preserve particle drafts. L03/L05 remain partial overall.

## 06 — Plot per-rule manufacturing pass probabilities [small integration]

**Read:** `src/daedalus/forge_probability.py`: `RuleRisk`, `RiskResult`, `manufacturing_risk`; `src/daedalus/api/forge.py`: `pass_probability`; `components/pitwall/LegalPanel.tsx`; `lib/api.ts`: `RuleRisk`, `ForgeRisk`, `getForgeRisk`; `tests/test_forge_probability.py`.

**Do:** Plot the existing returned `rules[].pass_probability` with rule names/IDs and declared sigma. Offer worst-first sorting and a compact native table with expected loss where provided. Show excluded/unquantified rules and null expected loss honestly. Keep data requests bounded/debounced; do not add another simulation when the current result already contains everything.

**Reuse:** Native ECharts bar chart and TanStack Table. Existing assumed independent Normal model.

**Done when:** User can identify the weakest calculated rule; no excluded rule is shown as 100% passing or zero penalty. State that sigma is an assumption, not measured manufacturing capability. F02/G06 partially improved; do not tick full physical tolerance validation.

## 07 — Show normalised rule headroom without invalid percentages [small]

**Read:** `components/pitwall/LegalPanel.tsx`, `FrontierPanel.tsx`; `src/daedalus/forge.py`: `Check`/frontier calculation; `lib/api.ts`: `RuleCheck`.

**Do:** For rules with finite two-sided limits and `max > min`, show signed nearest-limit margin as a percentage of allowed span: `100 * margin / (max - min)`. Label the denominator explicitly (“% of allowed span”). For one-sided, zero-span, manual or missing data show “not applicable”; retain native-unit margin for every applicable rule. Do not arbitrarily divide by zero or manufacture percentages for incomparable units.

**Done when:** Negative headroom stays negative, manual states stay manual, and unit margin remains available. Test two-sided, boundary, failed and unsupported cases. This is a bounded part of G06, not the full tolerance-band feature.

## 08 — Plot actual posterior summary intervals [small integration]

**Read:** `components/race/CalibrationPanel.tsx`: LABELS and posterior summaries; `lib/api.ts`: `BayesSummary`, `BayesianCalibration`; `src/daedalus/bayes_calibration.py`: `Summary`, `Posterior`, summary quantiles; `tests/test_bayes_calibration.py`.

**Do:** Add an interval plot using each returned p05/median/p95, with separate axes/panels where units differ. Preserve the existing numerical summaries, ESS and warnings. Reuse the existing calibration result; do not run another fit when opening the plot.

**Reuse:** Native ECharts; scalar conversion factors already in LABELS.

**Done when:** The displayed 90% intervals match returned quantiles and units. **Do not draw posterior densities or fit Normal curves from three quantiles.** Do not claim full prior/posterior density or ArviZ/R-hat completion. Bounded S01/F07 progress only.

## 09 — Plot held-out measured-versus-predicted times [small integration]

**Read:** `components/race/CalibrationPanel.tsx`: held-out predictions; `lib/api.ts`: `BayesianCalibration.held_out`; `src/daedalus/bayes_calibration.py`: `Posterior.predict`; `src/daedalus/api/race.py`: Bayesian calibration scoring; `tests/test_api_bayesian_calibration.py`.

**Do:** Plot supplied held-out measured time vs predicted median with p05/p95 prediction bars and a y=x reference. Show residuals with an explicit sign convention. Use stable row identity where available; otherwise label source row index. Empty held-out data must show “not performed”, not an empty success graph. Do not score training rows as held out.

**Done when:** Plot agrees with existing numerical rows and interval coverage is described as held-out results on the supplied data, not independent physical verification. This improves S03/F07 but does not complete posterior predictive checks or ArviZ diagnostics.

## 10 — Saved-study comparison table with comparable error metrics [small/medium]

**Read:** `components/race/CalibrationPanel.tsx`: saved list and open-study mutation; `lib/api.ts`: `CalibrationStudySummary`, `CalibrationStudyDetail`, list/get clients; `src/daedalus/api/race.py`: saved-study routes/payloads; `src/daedalus/contracts.py`: `CalibrationStudy`; `tests/test_api_bayesian_calibration.py`.

**Do:** Allow selecting at most five saved studies, fetch their existing details with at most two concurrent requests, and show study ID/date, training/held-out counts, ESS and held-out MAE/RMSE (ms). Derive metrics only from actual scored rows. Show source/held-out-set identity where available. Studies scored on different sets must be visibly separated or marked non-comparable; do not join them into an “error shrinking” line.

**Reuse:** Existing saved evidence and native TanStack Table. No rerunning fits or new database.

**Done when:** Missing held-out data is “not evaluated”, not zero error; selection has loading/error states and bounded requests. This is a comparison subtask of S02, not proof error improved over time.

## 11 — Configured-part safety-factor comparison table [small/medium]

**Read:** `components/strength/StrengthPanel.tsx`: PARTS, request construction and presets; `BeamPlots.tsx`; `src/daedalus/structure.py`; `src/daedalus/api/analysis.py`: beam endpoint; `lib/api.ts`: BeamRequest/BeamResult; `tests/test_structure.py`, `tests/test_api_analysis.py`.

**Do:** Let the user capture the currently configured part/result into a small comparison table, preserving its exact dimensions, material, load, result and source label. Compare up to four configured cases. Disable capture while inputs are debouncing or the solver request is pending; capture the exact request that produced the resolved result. Editing inputs must not silently rewrite a captured row. Display safety factor, peak stress, deflection, material and load with units; support removal/export. If persistence is added, keep a versioned validated local format and say it is local.

**Reuse:** Existing beam solver and native TanStack Table. No new FEM/CalculiX or actual-car geometry inference.

**Done when:** Cases are calculated from their recorded inputs. Handbook materials/preset dimensions remain estimated; zero-load null safety factor is displayed safely, not a crash or fabricated numeric value. This completes the software-table remainder of H02/T02, not load-test validation.

## 12 — Compact FORGE red/amber/manual/CAD-pass summary [small/medium]

**Read:** `components/pitwall/LegalPanel.tsx`; `src/daedalus/api/forge.py`: checks/sheet; `src/daedalus/forge_sheet.py`: sheet_data/compile_sheet; `src/daedalus/report/sheet.typ`; `src/daedalus/forge.py`: points_at_risk; relevant FORGE tests.

**Do:** Add a compact summary export linked beside the existing full scrutineering sheet. Include design/revision, fail/risk/manual/CAD-pass counts, points at risk, the failed/at-risk findings with source pages, and an explicit manual-review count. A one-page overview may reference the full sheet for all details; do not cram 80 unreadable rows onto A4 or hide manual findings. Give overflow an explicit continuation/full-sheet reference.

**Reuse:** Existing Typst compiler, FORGE results and sheet helpers. Read `/Users/adityabalaji/.codex/skills/pdf/SKILL.md` if producing a PDF; compile/render and inspect one small fixture. Do not rebuild removed engineering drawings.

**Done when:** Counts/risk match the current checks and a CAD pass cannot be mistaken for measured scrutineering approval. Official source-PDF archive remains a separate unfinished G09 requirement.

## 13 — Add source identity to the two existing PDF exports [small/medium]

**Read:** `src/daedalus/api/report.py`; `src/daedalus/report/report.typ`; `src/daedalus/forge_sheet.py`; `src/daedalus/report/sheet.typ`; `src/daedalus/api/forge.py`; `tests/test_report.py`; `evidence/CHECKPOINT-2026-11-04.md`.

**Do:** Record the full selected rulebook SHA-256, selected geometry SHA-256, current code commit (with an honest dirty/unknown indicator) and generation time in the report/sheet data and print a readable compact provenance block. Preserve the existing data hash. Use a cached/bounded Git lookup with no network, no raw environment capture and no shell interpolation. Handle a source installation without `.git` gracefully. Label YAML revision/hash separately from the official PDF identity; do not claim a PDF was archived when it was not.

**Reuse:** Existing hashlib/Typst pipeline; one shared small identity helper if justified. Keep the nullable benchmark and accepted/design-bound cover fixes intact. No drawing templates exist now.

**Done when:** Both exports identify their actual source files and code snapshot; hashes are complete in the embedded data, and PDF rendering remains readable. This improves J10; run-manifest identity/offline demo stay open.

## 14 — Write the three-minute judge walkthrough [small documentation task]

**Read:** `docs/innovation.md`; `docs/build/PROGRESS.md` checkpoint; `components/present/Presenter.tsx`; `components/evidence/ArtifactProof.tsx`; `evidence/CHECKPOINT-2026-11-04.md`.

**Create:** `docs/judges/THREE-MINUTE-WALKTHROUGH.md` (create the directory if missing).

**Do:** Write a timed 180-second script with actual click paths: problem/claim, design and rule finding, wind-tunnel source/status, ORACLE recommendation, sealed-prediction/evidence verification, limitation and next experiment. Include a fallback route for missing CFD, no completed benchmark and unavailable measurements. Describe any synthetic demo explicitly. Link the actual workspaces/shortcuts and evidence files; do not say a real validation occurred.

**Done when:** Durations sum to 180 seconds, a teammate can follow it, and every claim has a current source. This completes only the walkthrough part of J09, not the 60-question Q&A bank or a recorded fallback video.

## 15 — Write the source-backed innovation one-pager [small documentation task]

**Read:** `docs/innovation.md`; PROGRESS latest checkpoint; MASTER-PLAN §28 E/J; `evidence/ORACLE-native-benchmark.md`; `evidence/ATLAS-artifact-verification.md`; `evidence/CHECKPOINT-2026-11-04.md`; `THIRD_PARTY.md`.

**Create:** `docs/judges/INNOVATION-ONE-PAGER.md`.

**Do:** One concise page covering the engineering problem, connected workflow, what our team integrated/built, actual open-source contributions, evidence currently available, current limitations, and the next measurable success criterion. Separate baseline, proposed change, prediction and measurement; leave missing measurement explicitly pending. Credit libraries instead of claiming we authored their solver/renderer/optimizer. State that automatic accepted-only CFD feedback is still unfinished unless newer commits prove otherwise.

**Done when:** No unmeasured speed-up, national-winning claim, “fully autonomous” claim or fabricated measured improvement. Markdown is the deliverable; no new poster/site/branding workflow needed. Bounded J09 progress only.

## Verification and handoff

- For changed Python: `uv run ruff check <changed-files>`; `uv run ruff format --check <changed-files>`; focused pytest files listed by the task, and pyrefly where applicable.
- For changed frontend: `pnpm --dir apps/cockpit exec tsc --noEmit`, focused `oxlint`, relevant existing/new Vitest tests. Run formatting with the existing oxfmt command. Do not trigger a full Next production build for these tasks.
- Only add tests for new nontrivial logic: index mapping, normalised margin edge cases, comparison metric/source matching, snapshot identity and null-safe cases. Do not create tests that only repeat a label/string change.
- PDF changes need a small compile/render inspection. UI work gets a combined browser pass at the end if available, with console and 1440/1024/375 px review. If deferred, say so and use ⏳; do not invent screenshots or acceptance.
- For each item: write `evidence/EASY-01.md` through `EASY-15.md` as appropriate, record changed files, actual OSS reused, checks and remaining limitations. Update the checklist below, PROGRESS and the relevant master-plan rows; the same parent may remain partial across several items.
- If a newer commit already satisfies an item, verify and link its evidence, mark it “already done”, and continue. Do not rewrite working code for credit.
- At handoff: report completed item numbers/commits, what is still unverified and the next unfinished item. Preserve other people's drafts; stop any servers you started.

## Sprint checklist

- [ ] EASY-01 Presenter honesty/benchmark wording
- [ ] EASY-02 Limitations slide
- [ ] EASY-03 Per-row outlier flags
- [ ] EASY-04 Remaining native PNG exports
- [ ] EASY-05 Four chart source captions
- [ ] EASY-06 Per-rule probability plot/table
- [ ] EASY-07 Normalised two-sided headroom
- [ ] EASY-08 Actual posterior interval plot
- [ ] EASY-09 Held-out prediction/interval plot
- [ ] EASY-10 Comparable saved-study error table
- [ ] EASY-11 Configured-part safety comparison
- [ ] EASY-12 Compact FORGE summary export
- [ ] EASY-13 Source identity in report/sheet PDFs
- [ ] EASY-14 Three-minute judge walkthrough
- [ ] EASY-15 Innovation one-pager
