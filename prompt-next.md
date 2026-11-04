# Daedalus X — next remaining-work sprint

You are working at `/Users/adityabalaji/Documents/f1/daedalus-x`, GitHub `aditya160509/daedalus-x`, main only, AGPL-3.0. Execute the sequence below; finish connected work and record truthful progress. This is the next prompt after EASY-01–15. **Do not repeat the completed first sprint.** Later items here are medium/large engineering tasks, not another claim of 15 easy wins.

## Read first and preserve existing work

1. `git status --short`, then `git pull --rebase origin main`. Preserve dirty work; inspect/use reversible autostash if needed, never reset/clean another person's files.
2. `docs/build/PROGRESS.md` latest entries, then `evidence/REVIEW-EASY-SPRINT-2026-11-04.md`.
3. Read `evidence/EASY-01.md` through `EASY-15.md` only as needed for the area you change; the root `prompt.md` is the completed first sprint, not the new backlog.
4. Current scope: `docs/build/TODO.md` and `MASTER-PLAN.md` §28. Read only the sections/files relevant to the active task. Already-read unchanged files need no repeated reading.
5. Frontend: `apps/cockpit/AGENTS.md` and applicable installed Next docs. Use graph discovery first; if this repo remains unindexed, use rg.

The pre-existing animated-flow draft includes SimulateWorkspace, FlowTunnel3D, HeroRender, velocity/viz helpers, portions of api.ts/MASTER-PLAN and WIND-TUNNEL evidence. Inspect current status. Do not overwrite or commit those unrelated hunks. Do not rebuild completed Sankey/waterfall/beam/paired/QR/GP/reaction features.

## Standing quality/work rules

- Existing quiet grey UI, one accent, project tokens, Inter/mono numbers; Base UI/shadcn controls. Loading/empty/error states, keyboard access, units and 1440/1024/375 px layouts.
- Reuse native ECharts, TanStack **v9**, SciPy, Typst, existing durable jobs and append-only EvidenceStore. Read installed APIs before coding. No custom replacement engine or duplicate persistence system.
- Verify licences before copying upstream source, retain notices and update THIRD_PARTY. NOASSERTION requires actual licence inspection; absent licence forbids copying/translation. TinyFish for external research, primary docs first. Do not import a library merely to list its name.
- Synthetic/estimated/user-entered/accepted/measured are distinct. No invented measurements, false acceptance, outlier removal, fake sample counts, hidden source mismatch or unmeasured speed-up claims.
- Work on main, small commits and pushes. Update PROGRESS **in the same commit**, relevant §28 rows and §23, and `evidence/NEXT-XX.md`. A subfeature tick does not complete its whole parent. Recount any current percentage with its exact denominator; preserve dated historical checkpoints.
- No CFD, meshing, long studies, calibration campaigns or production builds in this sprint. Queue code may be implemented/tested without starting a worker. Do not launch queued work or raise cores. No deploy, messages to organisers, release tags or publication unless specifically requested.
- Batch focused checks; avoid repeated server restarts after tiny changes. New nontrivial numerical/source-binding logic needs meaningful tests. One combined UI check for related work. API must restart after Python edits; stop servers you start. Never claim a check you did not perform.
- Removed scope remains removed: drawings/importer/render packs, AR, base-bleed, competitor scraping, photo/video, photogrammetry, community calibration, multi-fidelity, BoTorch/OpenMDAO/trame.

## NEXT-01 — Repair saved-study identity [small, fix first]

Read `apps/cockpit/src/lib/calibrationCompare.ts`, its test file, `components/race/CalibrationPanel.tsx`, `lib/api.ts` CalibrationStudyDetail; `src/daedalus/api/data.py` saved-study/source-file routes and `contracts.py` CalibrationStudy. Component paths in this prompt are under `apps/cockpit/src/`.

Current signature loses actual targets and per-row condition associations and assumes sources[1] is the held-out file. Build a canonical identity from the exact ordered/matched scored held-out input rows/targets, including mass/track/timing uncertainty and the declared timing definition when available. Predictions/errors are model outputs and must not define test-set identity. Source-role metadata must be explicit; ambiguous legacy sources remain unknown rather than guessed. Preserve backward compatibility and append-only records.

Done: changed measured time, swapped row conditions or different scored rows never receive the same-set label. Missing hash/role does not imply verified identity. Regression tests cover optional uploads, legacy data, equal sets and unequal targets. The table still does not claim a real improvement merely from comparison.

## NEXT-02 — Refresh PDF source identity correctly [small, fix first]

Read `src/daedalus/source_identity.py`, `tests/test_source_identity.py`, `api/report.py`, `api/forge.py`, `forge_sheet.py` and EASY-13 evidence.

Replace permanent process caching of code_snapshot with an export-time snapshot or a short documented TTL/capture time. One export must use one coherent snapshot. Retain bounded local subprocess timeout/no shell/no network, full source hashes, dirty/unavailable behavior and graceful non-Git installs. Do not accidentally label an old cached snapshot as current clean code.

Done: two exports within one API process observe changed commit/dirty state as specified, with regression tests. PDF identity remains readable. No broad report rewrite.

## NEXT-03 — Write the complete 60-question judge Q&A [documentation]

Read `docs/judges/THREE-MINUTE-WALKTHROUGH.md`, `INNOVATION-ONE-PAGER.md`, `docs/innovation.md`, PROGRESS, THIRD_PARTY and `src/daedalus/dossier.py`.

Create `docs/judges/JUDGE-QA.md`: exactly 60 numbered questions, each with a concise spoken answer and source-file/document references. Cover purpose/originality/team ownership, licences/AI contribution, geometry/rules, CFD/GCI/limitations, dynamics/uncertainty, GP/benchmark, calibration/held-out tests, evidence/seals, performance/cost and the next validation experiment. Include difficult questions about synthetic data and incomplete closed-loop acceptance. Use official sources if asserting competition rules; do not invent answers from organiser confirmation that has not happened.

Done: 60 distinct useful answers, accurate today, with an “unknown/pending” answer where appropriate. No fabricated speed-up, score, accepted run or physical improvement. J09's Q&A subtask only; no claim a teammate rehearsed it.

## NEXT-04 — Accept the first sprint in one bounded UI batch [QA]

Read EASY evidence and relevant `docs/build/CHECKLIST.md`/RATINGS sections. Start API/UI together, no CFD or heavy build. Use the in-app browser where available, one tab, and stop owned servers afterward.

Check 1440/1024/375 px: Presenter/no benchmark/limitations, flagged timing rows, posterior and held-out plots, five-study comparison, four captured beam cases, rule-risk/headroom UI, QR route and targeted PNG downloads. Test keyboard focus, console, empty/error states and window resize. Fix actual regressions. For the PDF summary check long findings/overflow rather than only the ideal fixture. Do not rerun statistical campaigns for visual QA.

Done: evidence names actual pages/actions, screenshots/download checks and remaining failures. Tick only gates verified. This does not establish physical GPU fps or measured scientific acceptance.

## NEXT-05 — Include new judging outputs in the existing judge ZIP [small/medium]

Read `src/daedalus/judge_pack.py`, `api/report.py`, `api/forge.py`, `forge_sheet.py`, `tests/test_judge_pack.py` and docs/judges.

Reuse the compact FORGE summary generator and include the walkthrough, one-pager and Q&A in the existing ZIP. Keep manifest hashes/file sizes correct and missing outputs explicit. Bound optional export work; preserve current report/rules/evidence entries. Do not reintroduce drawings. Do not state that unarchived official PDFs or unrecorded video are present.

Done: ZIP tests verify real new entries, their hashes and a truthful missing list. Failure of an optional summary does not invent a PDF or abort every other useful output.

## NEXT-06 — Required paired-test sample size [small/medium]

Read `src/daedalus/paired.py`, `api/paired.py`, `tests/test_paired.py`, `components/race/PairedTimingPanel.tsx`, lib/api.ts and S04 evidence.

Add an explicitly prospective required-pair-count calculation for a user-declared meaningful effect in ms, alpha and target power, using the existing native noncentral-t power routine and pilot difference SD. Search bounded integer pair counts; return a clear “above configured limit” state rather than pretending the limit achieves power. Preserve the current MDE calculation and extreme-tail safeguards.

Done: displayed required N actually meets power and N−1 does not, where feasible; units correct, degenerate spread/invalid inputs rejected, exact planning assumptions saved with evidence. No observed-power or guaranteed-success claim. Finish this software remainder of F08 without claiming physical validation.

## NEXT-07 — Repeat-run control chart [medium]

Read `src/daedalus/importers.py`, `api/data.py`, `components/race/CalibrationPanel.tsx`, lib/timingRows.ts and existing calibration plots.

Add a bounded repeated-run analysis using actual imported times in declared run order. Use a documented established control-chart method/limits, declare a reference phase, and keep reference limits fixed when assessing later runs. Research primary statistical documentation before implementing constants/assumptions. Native ECharts for the plot; preserve raw rows and flags. Show insufficient/unsuitable data clearly. Distinguish control limits from confidence/prediction intervals and specification limits.

Done: test reference-limit calculation and a later flagged observation; no silent removal or synthetic fallback. This is S05, not gauge R&R or proof the process is stable.

## NEXT-08 — Recorded compute/wall-time view [small/medium]

Read `src/daedalus/jobs.py`, `api/jobs.py`, `api/engineering.py`, `cfd.py` RunResult/steps, `components/jobs/JobsDrawer.tsx`, `app/project/ProjectWorkspace.tsx`, lib/api.ts.

Plot recorded run/step wall time and expose the source IDs/status. Use stored durations, never execute jobs to populate the screen. Distinguish elapsed wall time from CPU/core hours; only derive rank-hours for phases with known actual ranks and label them as an estimate. Do not sum overlapping jobs as calendar elapsed time. Bound history queries.

Done: useful empty state and source-linked chart/table, with no invented cost/effort totals. Partial P03/I04; human effort remains unrecorded.

## NEXT-09 — Record engineer veto/edit decisions [medium]

Read `src/daedalus/contracts.py` Decision (accepted_id is required), `store.py`, `design_loop.py`, `oracle.py`, `api/oracle.py`; `components/pitwall/BuildNextControls.tsx` and tests/test_design_loop.py.

Add a rationale-backed proceed/edit/veto path that preserves proposed parameters, selected parameters, campaign/code snapshot and reviewer/user attribution. Reuse appropriate immutable records/artifacts; do not shoehorn a veto into a Decision record that falsely claims an accepted candidate. A build must record the decision it actually used. Reject stale or mismatched decision/build parameters. Veto must not queue work or append an observation.

Done: exact provenance and validation tests, visible recorded result/history, no fake model recommendation attributed to an edited point. No automatic CFD execution.

## NEXT-10 — Separate training pools and unverified observations [medium/large]

Read `src/daedalus/oracle.py` Campaign/Observation, `api/oracle.py`, `design_loop.py`, `oracle_diagnostics.py`, contracts, lib/api.ts and all campaign callers/tests.

Preserve legacy data while separating synthetic demo targets, user-entered/unreviewed values, accepted CFD and physical measurements. Provenance alone is not scientific acceptance. Real training must not silently absorb synthetic seeds or arbitrary “simulated” submissions. Preserve source identities and show pool/counts in state, diagnostics, recommendations and build evidence. With insufficient accepted data, expose an honest unavailable/startup design state; do not borrow synthetic targets to make the graph work. Keep the explicit demo accessible and labelled.

Done: every consumer uses the declared pool consistently, migration is non-destructive, concurrent appends remain safe, and tests prove a manual provenance label cannot create accepted training data. E09 foundation; no new dataset or mixed-fidelity model.

## NEXT-11 — Source/STEP/surface identity through queued CFD [medium/large]

Read `src/daedalus/cfd.py` write_case/manifest, `jobs.py` submit/execute, `geometry.py`, `design_loop.py`, `gridstudy.py`, api/jobs.py and their tests.

Bind design ID, source STEP/geometry/surface hashes, template/settings and relevant solver version evidence into the case/queue lineage. Use streaming hashes. Validate queued source identity again before execution; fail closed on change. Identify legacy/unbound cases explicitly. Keep immutable designs and never overwrite an existing case. A generated manifest does not prove a solver/version ran; record actual execution evidence separately when available.

Done: tests mutate a source after queuing and prove rejection without running a solver; source copies and manifests remain traceable. No MPI/meshing command is launched. Partial E08/J10; actual run verification remains pending.

## NEXT-12 — Accepted-only observation ingestion [large; depends on 10–11]

Read oracle/design-loop/case identity code, EvidenceStore/SolverRun acceptance contracts, grid-study reports and `coverage.py`/`dossier.py`.

Implement idempotent feedback from an explicitly reviewed, scientifically accepted run with matching design/source hashes, correct CdA reference area and complete required gate evidence. Never promote pending_review or a success exit code to accepted. Bind the actual ORACLE unit point to the generated candidate manifest. Preserve independent GCI/mesh/force/averaging requirements and source artifacts. If the repository lacks a usable review/acceptance record, implement the explicit evidence-backed review contract first or keep ingestion disabled with precise missing requirements; do not invent an authority from a loose JSON flag.

Done: rejected/mismatched/legacy/duplicate cases cannot pollute accepted training. A valid contract can be tested with declared fixtures; no real acceptance tick without real evidence. Only after these gates exist consider automatic handoff; do not run it in this sprint.

## NEXT-13 — Event timing ledger [medium/large]

Read `contracts.py` RaceRun/PhysicalBuild, `importers.py`, `api/data.py`, `predictions.py`, `components/race/PointsPanel.tsx`, `SealedReveal.tsx` and `app/race/RaceWorkspace.tsx`.

Build saved manual/CSV event timing records with explicit team/car/build, lane, attempt, timing definition, reaction availability, session/order and source. Separate car-only time from combined reaction time. Validate duplicate imports and keep corrections append-only. Reuse existing timing parsing and tables. Missing build/source stays unverified; no made-up event entries.

Done: true empty ledger, validated entry/import/history, actual best/last/rank calculations with declared eligibility, source-linked CSV export. No silent calibration update or sealed-prediction leakage. First stage of C08/C11/C12.

## NEXT-14 — Stadium/TV presentation of the ledger [medium; depends on 13]

Read the event API plus existing race timing/HUD components, THIRD_PARTY f1-dash attribution, `components/shell` and Race workspace. Locate existing timing components before copying more code.

Reuse installed/licensed f1-dash pieces and Base UI for a projector-friendly timing/leaderboard view, fullscreen, source/last-update state and optional panel rotation with reduced-motion/pause control. No random times or “live” badge on stale/manual data. Keep measurement entry separate from TV display.

Done: actual saved event rows, readable desktop/projector and narrow layouts, keyboard escape/fullscreen behavior, empty/offline/stale states. Physical monitor/fps and event acceptance remain distinct.

## NEXT-15 — Native pymoo Pareto view with real source coverage [medium/large]

Read TODO §6/§14, oracle campaign and accepted-run references, FORGE margin data and actual design mass sources. Check pymoo's licence before installing/reusing its native nondominated sorting.

First define actual available drag, mass and rule-margin objectives with units, minimisation/maximisation conventions and source/provenance. Do not invent density-derived mass or fill absent objectives with zeros. Separate incomparable pools/conditions; show missing objective coverage explicitly. Use native pymoo sorting on eligible recorded rows and ECharts/TanStack for the view; plot only available valid objectives. No optimisation campaign or second surrogate pipeline.

Done: domination tests, source-linked eligible designs and honest empty/partial state when no complete dataset exists. Algorithm/UI completion is not an accepted real Pareto-front claim.

## Checks, evidence and completion

Use focused Ruff/format/pytest/pyrefly for changed Python; frontend TypeScript, oxlint/oxfmt and relevant Vitest. Test new identity/gate/statistical logic, not mirrored implementation strings. PDF changes need a small render inspection. Do not rerun the full heavy suite after every task.

Update `docs/build/PROGRESS.md`, relevant master rows and NEXT evidence in each task's commit. Keep a final concise handoff: actual completed items/commits, actual checks, open gates, and next unfinished item. Do not claim every item here is quick or doable without measurement/source inputs.

- [ ] NEXT-01 Held-out identity fix
- [ ] NEXT-02 Export source-snapshot freshness fix
- [ ] NEXT-03 60-question judge Q&A
- [ ] NEXT-04 Bounded first-sprint UI/PDF acceptance
- [ ] NEXT-05 New outputs in judge ZIP
- [ ] NEXT-06 Required paired sample size
- [ ] NEXT-07 Repeat-run control chart
- [ ] NEXT-08 Recorded compute/wall-time view
- [ ] NEXT-09 Engineer decision audit
- [ ] NEXT-10 Training-pool separation
- [ ] NEXT-11 Queued CFD source identity
- [ ] NEXT-12 Accepted-only ingestion
- [ ] NEXT-13 Event timing ledger
- [ ] NEXT-14 Stadium/TV view
- [ ] NEXT-15 Native eligible-data Pareto view
