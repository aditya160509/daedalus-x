# Daedalus X — engineering software and innovation only

Work in `/Users/adityabalaji/Documents/f1/daedalus-x`, GitHub `aditya160509/daedalus-x`, main only, AGPL-3.0. Implement the useful engineering platform. This prompt replaces the former mixed “20 partial entries” handoff: removed document/presentation/administrative obligations are not completion gates anymore.

## Read first

1. Run git status and pull --rebase origin main; preserve concurrent dirty work with a reversible autostash if needed. Never reset/clean another contributor's changes.
2. Read `docs/build/TODO.md` and `PROGRESS.md`: their **2026-11-04 owner-approved scope cuts override conflicting historical tasks** in MASTER-PLAN, BUILD-ORDERS, NOW, root prompt.md and older evidence. Use surviving master IDs only as engineering cross-references.
3. Read only source files relevant to the current task. Reuse unchanged files already understood. Prefer MCP graph discovery, rg fallback if this repository remains unindexed.
4. Frontend: read apps/cockpit/AGENTS.md and applicable installed Next guide. Inspect existing DesignSidebar/DesignStudio/DesignWorkspace and particle/velocity/viewer/shared api.ts/MASTER-PLAN drafts before editing. Do not overwrite or stage other contributors' work wholesale.

## Hard scope boundary

Do not work on judge Q&A, walkthrough/rehearsal scripts, innovation copywriting, Presenter slides/notes/timers, fallback recordings, PDF generation/formatting/hash/provenance blocks, judge ZIPs/appendices, official-PDF archival/publication, public verify pages/QR, external timestamps/notarisation/seals, signed releases, offline presentation bundles, formal V&V/report generation, sponsor/cost reports, administrative budgets/minutes/lessons/Gantt/risk matrices, awarded-judging-point tracking, formal preregistration paperwork, arbitrary coverage targets or nightly screenshot bureaucracy.

Existing extras may remain in the codebase; their existence is not permission to add more work to them. This handoff does not authorise deleting shared runtime code or saved files. If unwanted UI is later hidden/removed, preserve the engineering dependencies and do it as a separate bounded cleanup.

Retain useful **in-app** R/A/G findings, validation/error/source views, saved experiments/predictions, exact settings/results, ordinary lineage and geometry/design/run hashes. Those keep the software accurate and prevent stale/wrong-design results. Race-performance points modelling, engineering decision rationale, recorded compute time, practical tests and actual physical correlation remain in scope.

Previously removed drawings/render packs/importer, AR, base-bleed, competitor scraping, photogrammetry/photo/video lab, community calibration and multi-fidelity stay removed.

## Quality and execution

- Existing Base UI/shadcn controls, quiet neutral UI with one accent, project tokens, Inter/mono numbers, units and compact forms. Loading/empty/error states, accessible focus/labels and usable 1440/1024/375 layouts.
- Use installed/licensed native OpenFOAM/build123d/OCCT/Chili3D/Three/VTK/ECharts/uPlot/TanStack v9/SciPy/SALib/Optuna and current jobs/storage. Use pymoo where actual eligible objectives exist. No duplicate solver, viewer, stats engine or database.
- Check actual licence before upstream copying, retain notices/THIRD_PARTY credit. NOASSERTION requires real notice inspection; no licence means no copying/translation. TinyFish/official docs and installed APIs for outside research.
- Preserve honest synthetic/simulated/estimated/user-entered/measured labels. No fabricated measurements, accepted status, source matching or speed-up claims. Outliers stay present unless a real explicit engineering exclusion is recorded.
- Small commits/pushes on main; update PROGRESS in the same commit. Document source/numerical decisions briefly where needed, not as presentation deliverables. Do not spend the sprint generating evidence paperwork for each trivial edit.
- Batch focused Ruff/format/pytest/pyrefly, frontend tsc/oxlint/oxfmt/Vitest and practical browser checks after coherent changes. Test real numerical/state/source-binding risks; avoid mirrored-label tests, arbitrary coverage percentages and repeated screenshot scorecards. Keep basic fast CI, unit/API contract consistency and dependency/security/licence hygiene.
- No CFD/meshing/adjoint campaigns, long benchmark/calibration studies, heavy builds or workers unless separately scheduled/authorised. Do not run both dev servers with heavy workloads. Stop owned servers. No deployments, authority requests or messages as incidental work.
- Code-ready portions can finish before measurements arrive; physical correlation and real hardware performance remain explicitly pending. Do not claim scientific completion from fixtures.

## 1. Finish coherent Design Studio [A06/A11]

Read `apps/cockpit/src/app/design/DesignStudio.tsx`, `DesignWorkspace.tsx`, current `DesignSidebar.tsx` draft, `CadFrame.tsx`; `components/viewer/design/DesignControls.tsx`, `MeasureHud.tsx`, `SectionPlane.tsx`, `Dimensions.tsx`; `patches/chili3d.patch`.

Complete existing owned consolidation while preserving select/frame, measurement/section/dimensions, comparison, reset/snapshot and save/import. Add actual rule-state colours/value-limit anchors using supported CAD overlay APIs. Unsupported anchors stay explicit. Keep measured inspection values distinct from CAD estimates. No duplicate viewer or lost controls. Check keyboard, selection/revision transitions and narrow layouts together.

## 2. Finish the single Wind Tunnel scene [B04/B13]

Read current particle-view diff and WIND-TUNNEL notes; `app/simulate/SimulateWorkspace.tsx`, `FlowTunnel3D.tsx`, `FlowViewer3D.tsx`; `lib/vizBinary.ts`; `src/daedalus/viz/vtkexport.py`, `binary.py`.

Integrate supported moving particles/Cp/slice/wake/Q layers under shared transforms, camera and selection with one active renderer. Reuse actual exported fields. Preserve layers/legends, dispose resources and RAF/listeners, pause hidden tabs and bound/adapt GPU load. Complete trails/crossing controls only when supported. No static report-render task. Test alignment/lifecycle; actual Mac fps/loading/memory is measured separately.

## 3. Complete closed-loop source safety and training separation [E08/E09]

Read `src/daedalus/oracle.py`, `design_loop.py`, `api/oracle.py`, `cfd.py`, `jobs.py`, `gridstudy.py`, contracts/store and all callers/tests; `components/pitwall/BuildNextControls.tsx` and job UI.

Bind design/STEP/geometry/surface/settings/template identity from queue through results. Recheck queued identity before execution; reject source changes and stale mesh use. Separate synthetic demo, unreviewed values, accepted CFD and physical training sources. A provenance label or process exit code cannot create accepted training. Handle insufficient accepted data honestly instead of borrowing synthetic seed targets.

Finish performance-rule gating, source-bound scientific acceptance requirements and idempotent feedback to the exact generated unit point. Keep pending/rejected/unbound observations out. Test queues/gates with fixtures and no solver execution. Automatic handoff code must not start a worker in this sprint.

## 4. Apply saved calibration and compare actual races [F10/C08]

Read `src/daedalus/api/data.py`, `bayes_calibration.py`, `predictions.py`, contracts/store; `components/race/CalibrationPanel.tsx`, `CalibrationPlots.tsx`; `app/race/RaceWorkspace.tsx`, `raceInputsState.ts`; `lib/calibrationCompare.ts` and tests.

Reuse the saved posterior/model/source rather than rerunning a fit on opening. Make applying a calibration to Race an explicit user action with correct units/parameter/uncertainty mapping and source identity. Preserve raw measured timing definitions and correct actual held-out target/condition identity. Add ordinary saved-prediction versus actual scoring and explain residuals inside the app. No cryptographic sealing, authority, report or preregistration workflow.

## 5. Actual event timing and stadium/TV [C10/C11/C09]

Read RaceRun/PhysicalBuild contracts, importers and api/data; `components/race/TimingTower.tsx`, `timing/`, `PointsPanel.tsx`, RaceWorkspace and existing f1-dash adaptations/THIRD_PARTY.

Saved manual/CSV timing entries need build/car/team, lane, attempt/session order, timing definition, eligibility and reaction availability. Reuse parsing, handle duplicates/corrections with lineage, and calculate comparable best/last/interval/history/ranks. Missing reaction is not zero. Keep simulated replay data distinct from actual event entries.

Connect a projector-readable fullscreen TV view, speed trap/leaderboard/history and pause/reduced-motion control. Add useful timing CSV/JSON export. Real empty/stale/offline states; no made-up event data, sealed scoreboard or day PDF. Check actual fullscreen/escape/keyboard behavior in one bounded review.

## 6. Race analysis completion [D07/D08/D09/D10/D11]

Read `components/charts/TelemetryChart.tsx`, `components/race/GhostPanel.tsx`, `raceMath.ts`, `RaceReplay.tsx`, `BreakdownPanel.tsx`, `EnergySankey.tsx`; `src/daedalus/dynamics.py`, `energy.py`, `raceanalysis.py` and relevant contracts/tests.

Complete real launch/burnout/peak/finish annotations, best eligible compatible-run ghost and A/B overlays. Add supported tether force/work without double-counting losses or hiding numerical closure error. Finish MC convergence, race Sobol/variance budget and optimal legal mass analysis using actual model parameters.

Time-loss counterfactuals may overlap: do not present them as additive stacked totals without a valid decomposition. Keep event/source/uncertainty units explicit. Physical tether/race validation remains pending until measurements exist; no written improvement story or presentation clip is required.

## 7. ORACLE decisions, prospective scoring and Pareto [E10/E11/E12]

Read oracle/diagnostics/design-loop/API source and contracts/store; `components/pitwall/BuildNextControls.tsx`, `OptimizerBenchmark.tsx`, `OracleDiagnostics.tsx`, `GpParameters.tsx` and existing tests.

Record real-campaign recommendation/acquisition reasons and proceed/edit/veto rationale. Preserve proposed/chosen parameters and campaign/code/design bindings; do not force a veto into a record that falsely claims acceptance. A build uses its actual recorded selection. Reject stale/mismatched bindings.

Save candidate predictions before evaluation and compare later eligible accepted results. Keep retrospective LOO separate. Complete native pymoo sorting/view only on actual drag/mass/margin objectives with declared units/direction and compatible sources; missing objective data stays missing. Do not rebuild the existing synthetic benchmark or fit-noise display. Estimate repeat-experiment noise separately when real repeats support it. No formal preregistration/certification/document workflow.

## 8. Paired sample size and useful experimental diagnostics [F08/F07/F09]

Read `src/daedalus/paired.py`, `api/paired.py`, `bayes_calibration.py`, importers/API/data and associated tests; `components/race/PairedTimingPanel.tsx`, `CalibrationPanel.tsx` and plots.

Use existing noncentral-t power to calculate required integer pair count for a declared meaningful effect, alpha and target power using stated pilot SD. N must meet power and N−1 fail when feasible; out-of-bound goals are explicit. Preserve extreme-tail safeguards and exact pairing/settings/source/results. No preregistration paperwork.

Finish comparable across-study scoring, appropriate posterior predictive/control plots and uncertainty decomposition. State control/reference/CI/prediction-limit semantics; preserve raw rows/flags. Importance ESS remains valid, invented MCMC chains/R-hat do not. Add real mass/dimension/coast-down/thrust/tether/load input where needed, without invented physical data.

## 9. Geometry, FORGE and manufacturing [A07/A09/A10/G07/G08]

Read `components/viewer/design/DesignCompare.tsx`, `designMath.ts`, model/scene controls; `src/daedalus/geometry.py`, `forge.py`, `forge_features.py`, `forge_probability.py`, API/forge; current Legal/Frontier views.

Implement supported signed CAD deviation in mm with real alignment/reference-normal semantics, material-aware mass/CG, canonical wall/chamber/cylinder/full-section/standard halo checks and CNC/manufacturing measures. Reuse OCCT/build123d/Three/VTK facilities; never call an unsigned vertex-distance shortcut signed surface deviation.

Finish operator/tool/time/raw-reading inspection entry and validated what-if/feasible-frontier behavior. Preserve completed G06 bands/probability/risk ordering. Keep R/A/G and source-rule pages useful in-app. No compact-PDF export work, official-PDF archival, presentation rule-count claims or publication project.

## 10. Adjoint and structure engineering [E13/H02/H03/H04]

Read `src/daedalus/adjoint.py`, `viz/sensitivity.py`, `structure.py`, parametric/design-loop/source contracts; adjoint/structure tests; `components/strength/StrengthPanel.tsx`, `BeamPlots.tsx`.

Complete source-bound accepted primal/adjoint compatibility, sensitivity field/map and constraint-checked update/rollback software. Keep heavy execution separately scheduled. Preserve current beam plots/comparison; finish actual UI/capture checks and source-linked material/load correlation. CalculiX requires real material/load/boundary definitions and mesh convergence. Fixtures can establish code behavior, not actual drag improvement or physical strength validation.

## 11. Engineering records and compute operations

Read contracts/store, jobs, coverage, source/run APIs and lineage/job views. Save/reopen numerical inputs/settings/results/models, validate source dependencies and expose actionable in-app errors. Connect engineering choice/rationale and recorded run/step wall-time views.

Distinguish elapsed time, known-rank estimated hours and actual CPU usage; do not sum overlapping work as calendar time. No administrative decision minutes, budgets/receipts, project Gantt/risk matrices, sponsor/tool-price reports or formal V&V dossier work.

## 12. Finish practical quality without expanding the backlog [L03/L07]

Keep native chart/table/units/source/export/cursor conventions, compact forms, accessibility and memory/process/resource cleanup. Review a coherent batch at 1440/1024/375 with console/input/download checks and fix real defects. Use meaningful numerical/source/state regression/property tests, fast working CI, runtime/type API consistency and security/licence hygiene. Generated contracts are useful where they prevent real drift, not as a checkbox.

No arbitrary 80% coverage target, nightly screenshot bureaucracy, per-task screenshot/rating report or full-suite run after every tiny change. Do not resurrect removed document/presentation tasks to claim completion. Update active engineering progress with actual software changes and honest remaining validation gates; the old 118-entry percentage is retired after the scope cut.

## Handoff

Report what engineering functionality changed, commits, actual checks and precise remaining code/data/hardware gates. Preserve unrelated drafts, stop owned servers and keep changes reviewable. Do not spend the sprint writing new judging/evidence documents instead of implementing the platform.
