# TODO — engineering software and innovation (2026-11-04)

Authoritative active scope: build the race-engineering platform. This replaces paperwork, publishing and administrative tasks in earlier plans. Existing useful software stays intact; a cut is not newly completed implementation.

## Working rules

- Main only; pull/rebase first, preserve other contributors' dirty work, make small commits and push finished pieces. Update PROGRESS in the same commit. Read only relevant unchanged source/docs, not the entire repository again.
- These owner-approved plans override conflicting historical tasks in MASTER-PLAN, BUILD-ORDERS, NOW and the completed EASY prompt. Use surviving master IDs as cross-references; do not restore cut deliverables or count them as unfinished engineering.
- Reuse installed/licensed OpenFOAM, build123d/OCCT, Chili3D, Three/R3F/drei, VTK/PyVista field tools, ECharts, uPlot, TanStack Table v9, SciPy, SALib, Optuna and existing jobs/storage. Use pymoo where actual eligible objectives exist. No duplicate solver, renderer, chart engine or database.
- Verify actual upstream licences before copying; retain notices and THIRD_PARTY credit. NOASSERTION requires real licence inspection. No licence means no copying/translation. Use TinyFish and primary docs for external research.
- Quiet engineering UI, existing Base UI/shadcn controls and project tokens, one accent, units, accessible keyboard/focus and loading/empty/error states. Keep forms compact and layouts usable at 1440/1024/375 px.
- Keep ordinary saved experiments, source/design/run IDs, geometry/source hashes, settings, lineage and meaningful validation. These prevent wrong-design/stale-result use and support reproducibility; they are retained engineering infrastructure.
- Synthetic, simulated, estimated, user-entered and measured data retain their real labels. Accepted training requires source/gate validation, not a user-assigned provenance string. Preserve missing/unknown conditions and raw measurements.
- Batch focused static/type/unit checks and practical browser reviews after coherent changes. Test nontrivial numerical, source-binding and state logic. Keep basic CI, useful property/regression tests, unit checks, security/licence checks and API contract consistency; no artificial testing targets or routine screenshot scorecards.
- No CFD, meshing, adjoint campaigns, long benchmark/calibration studies or heavy builds unless separately scheduled/authorised. Do not start workers merely to test queue code. Never combine heavy workloads with both dev servers. Stop owned servers after review. Do not deploy, contact authorities or message people as a side effect of coding.
- Read apps/cockpit/AGENTS.md and applicable installed Next docs before UI edits. Prefer MCP graph discovery, then rg if the repository remains unindexed. Preserve pre-existing Design Studio/particle-view/shared api.ts and MASTER-PLAN drafts; stage only your hunks.

## Owner-approved scope cuts — 2026-11-04

These are removed from active work, including unfinished remainders of already-built extras:

- Judge Q&A banks, judging copywriting, innovation one-pagers, walkthrough scripts and teammate rehearsals.
- Presenter decks, slides, speaker notes and presentation timers; recorded presentation/fallback videos.
- Engineering-report, scrutineering-sheet and compact-summary PDF generation, formatting and PDF provenance/hash work.
- Judge ZIP packs, portfolios, evidence appendices and document-production pipelines.
- Official-rule PDF archival/publication systems. Reading the applicable regulations and sourcing implemented rules remains engineering work.
- Public artifact-verification sites, QR exports, publication and public-hosting tasks.
- OpenTimestamps, RFC3161/external timestamp-authority integrations and cryptographic prediction notarisation. Ordinary saved predictions and later error comparison remain.
- Signed release/seal tags and offline presentation/demo bundles.
- Automated written red-team/post-event reports and separate formal V&V dossier generation. In-app validation results remain.
- Sponsor reports, commercial-tool cost comparisons, meeting minutes, receipts/budgets and administrative lessons logs.
- Project-management Gantt, administrative project risk matrices, judging-weight/awarded-point tracking. Race-performance points calculations remain.
- Formal experiment-preregistration paperwork. Exact experiment settings, pairing, sources and statistics remain.
- Arbitrary coverage-percentage targets, nightly screenshot bureaucracy, mandatory per-task screenshot/rating reports and tests that only mirror labels.

**Removed from code, 2026-11-04.** Deleted: the presenter (slides, speaker notes, timer, `P` shortcut, Present button); the report, scrutineering-sheet and compact-summary PDFs (`api/report.py`, `forge_sheet.py`, `report/*.typ`, `/v1/forge/sheet.pdf`, `/v1/forge/summary.pdf`, the Report PDF and sheet links); the judge pack ZIP (`judge_pack.py`); the V&V dossier (`dossier.py`, `/v1/report/dossier`, the Project panel); the Project workspace and its plan/forecast API (`project.py`, `/v1/analysis/project/*`, `ProjectForecast`, the Project nav entry); `source_identity.py` (only used by those PDFs); the `typst` dependency; `docs/judges/`; and the evidence notes for these features. The drawing generator was already gone. Sealed predictions, RFC 3161 timestamps, evidence, FORGE, ORACLE and race code are untouched. Scores above were not recounted; if a removed row had been counted as built, the next status recount should drop it.

Previously removed scope stays removed: drawing/render packs and DXF/SVG importer; AR; base-bleed; competitor scraping; photo/video scrutineering; photogrammetry; community calibration; multi-fidelity; BoTorch/OpenMDAO/trame; OS matrices, Docker/devcontainer, mutation testing, eight-hour soak, multi-user and archival-publication services.

This is a **planning scope change**. Existing code, saved files and historical evidence are not deleted by this change. Do not revive these tasks because an older document or code module still contains them. Hiding or removing existing extras can be a separate focused cleanup, preserving shared engineering dependencies.

## 1. Design Studio and manufacturing

- Finish CAD rule-state colours, real value/limit annotations and selection/focus; unsupported feature anchors stay explicit.
- Consolidate overlapping Inspect/editor controls while preserving measurement, section, compare, reset, snapshot and save/import.
- Add signed CAD-to-CAD deviation in mm with explicit alignment/reference-normal convention and supported distance method.
- Add validated live parametric controls through the canonical generator/importer; no separate geometry pipeline.
- Connect material-aware mass/centre-of-gravity estimates to actual geometry and declared material sources.
- Add canonical wall thickness, CNC reach and measured-versus-CAD manufacturing checks.

## 2. Wind Tunnel and performance

- Finish/integrate the existing animated-flow draft with Cp, slices, wake/Q layers, shared camera/transforms and one active renderer.
- Add trails/particle crossing controls where supported; dispose GPU buffers/listeners/RAF loops, pause hidden tabs and adapt quality.
- Complete Cp probe lines, LIC/separation lines, y+, bad-cell/mesh maps and skewness histograms.
- Finish delta wake/forces, momentum-deficit drag cross-check and same-source-compatible comparisons.
- Add yaw/ride-height matrix automation, speed sweep and frontal-area/drag trade analysis.
- Guided run wizard with actual queue/log/residual progress and defensible ETA; use existing jobs/FoamPilot patterns.
- Keep Cd stopping controls and independent mesh/force/convergence gates. Add compatible warm starts/mesh reuse only after source/field/mesh validation.
- Measure real Mac load, initial display time and rendering fps; do not infer performance from screenshots or repeat unmeasured speed-up claims.

## 3. FORGE engineering checks

- Reconcile implemented rule coverage against the applicable regulations; source pages/limits remain visible in the app.
- Complete wall/chamber/cylinder-fit/full-section/standard halo feature measures through OCCT/build123d.
- Preserve current per-rule probability, unit margin, percent-of-valid-span, tolerance bands and risk ordering; complete remaining unsupported cases honestly.
- Inspection entry records operator/tool/time/raw readings and physical part identity; keep measured and CAD states distinct.
- Interactive dimensional what-if and sampled feasible frontier with validated geometry/constraint semantics.
- R/A/G counts and findings remain useful **in-app**; no document export or publication backlog.

## 4. Closed-loop optimisation

- ORACLE → canonical CAD → FORGE → explicitly gated CFD queue → accepted observation.
- Bind STEP/geometry/surface/settings/template identities; reject changed queued sources, stale meshes and mismatched results.
- Separate synthetic demo, unreviewed user input, accepted CFD and physical training pools. No synthetic fallback masquerading as accepted training.
- Source-backed performance-rule gate, idempotent feedback and clear status/failure handling. Exit-code success alone is not scientific acceptance.

## 5. ORACLE and innovation

- Use the existing equal-budget GP/EI, native Optuna TPE/CMA-ES and SciPy Sobol/LHS/random benchmark; finish bounded execution/visual checks only when scheduled.
- Keep exact benchmark settings, source/version binding, seeds, trial reasons and CIs as engineering reproducibility data; no preregistration ceremony or judging deliverable.
- Prospective candidate predictions recorded before evaluation, accepted-source scoring, residuals and calibrated intervals.
- Complete actual campaign acquisition history and engineer proceed/edit/veto records bound to the design built.
- Repeat-experiment noise estimation; preserve the distinction from the already-fitted ML nugget.
- Native pymoo drag/mass/rule-margin Pareto analysis using actual eligible objectives; missing mass/margins remain missing.
- Accepted-source adjoint sensitivity map and constrained shape updates; no new multi-fidelity scope.

## 6. Race, replay and stadium

- Finish event annotations, best eligible real-run ghost, compatible A/B overlays and useful engineering chart exports.
- Race-day timing/reaction entry, predicted-versus-actual comparison and explicit application of calibration.
- Saved event timing ledger with lane/car/build/session/order/status, best/last/interval/reaction history and duplicate/correction handling.
- Stadium/TV view, fullscreen, projector-readable timing tower, speed trap, leaderboard and history strip using existing f1-dash components.
- Ordinary saved-prediction scoreboard and timing CSV/JSON export; no seals, notarisation or day-report PDFs.
- Complete supported tether term through dynamics/energy balance, race sensitivity/variance budget, MC convergence and optimal legal mass curve.
- Physical GPU fps/memory/input lifecycle checks remain engineering acceptance work.

## 7. Calibration and experimental analysis

- Finish comparable saved-study scoring, posterior/PPC/control plots and explicit application of a saved posterior to Race.
- Preserve exact held-out inputs/targets and source roles; never compare different target sets as the same set or score training as held out.
- Paired CI, prospective required sample count/MDE/power using the existing SciPy path and stated pilot-spread assumptions.
- Retain pairing/randomisation/timing-definition settings and source data; remove formal preregistration paperwork.
- Repeat-run drift/control analysis, gauge R&R and uncertainty decomposition where supported by actual data.
- Import/record part masses, caliper dimensions, coast-down, thrust, tether/launch repeatability and load tests. No required written improvement story.
- Importance ESS and appropriate predictive diagnostics remain; never invent MCMC chains/R-hat for the current importance sampler.

## 8. Structure

- Preserve analytical beam checks, plots and configured-case comparison; complete browser/source/capture checks.
- Real material-property entry and predicted-versus-measured load correlation.
- CalculiX 3D halo/wing-mount analysis only with appropriate real material data, boundary/load definition and mesh convergence.

## 9. Useful engineering data and operations

- Save experiments, models, observations, inputs/settings/results and sources; expose working lineage and stale-result handling inside the app.
- Link validation failures to the numerical/geometry/source condition that caused them; fix real gaps rather than completing a formal dossier.
- Record engineering selection/rationale and compute/run wall time. Distinguish elapsed time, estimated rank-hours and actual CPU usage.
- Keep race-performance points modelling. No administrative project-management or awarded-judging-point workflow.

## 10. Practical software quality

- Shared chart theme, units, source labels, uncertainty where available, compatible linked cursors/overlays and readable captions.
- Native PNG/SVG/data exports only where useful for engineering; no obligation to generate document packs.
- Compact forms, accessible tables and practical grouped responsive/browser checks. Fix real issues; do not produce routine rating/screenshot reports.
- Fast working CI, relevant regression/property tests, numerical benchmarks, type/runtime API contracts, unit checking, dependency/security/licence hygiene.
- Memory/renderer/process cleanup, bounded requests/jobs and no heavy simultaneous workloads.

## Work order

1. Finish current owned Design Studio and animated-view integration without overwriting other drafts.
2. Complete source binding, training separation and accepted-only closed-loop code.
3. Race-day/event/stadium features and saved-calibration application.
4. Pareto, candidate scoring, experimental statistics and engineering analysis gaps.
5. Advanced geometry/manufacturing/adjoint/structure, scheduled real validation and grouped quality/performance checks.

Existing completed software is tracked in PROGRESS. Only unresolved engineering work above is active. No new overall percentage is inferred from removing tasks.

## UI redo (owner priority, 2026-11-04)
Follow `docs/build/UI-REDO.md` §0–§8 **before** new features:
1. Fix the "1 Issue" error.
2. Always-visible moving air.
3. Port the t3code (MIT) UI primitives + Geist tokens into `components/ui`.
4. Outputs tab.
5. Inspect redo.
6. Strength redo.
7. Apply to every page.
8. Performance.

Use F1ReplayTiming (MIT) for the Race timing/stadium view.
