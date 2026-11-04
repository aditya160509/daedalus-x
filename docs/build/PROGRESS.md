# PROGRESS — engineering software and innovation (2026-11-04)

This active tracker uses the owner-approved reduced scope in TODO.md. It supersedes the previous 118-entry mixed software/paperwork ledger and its percentages. The old 49.2%/58-of-118 and historical T-task scores are **not current completion measures** after these cuts. Software-only and validation-gate scores are counted below; deleting scope is not completing software.

Legend: ✅ built/connected; 🟨 partial; ⬜ remaining code; ⏳ browser/scientific/performance gate; 📝 local draft. A built feature is not automatically accepted CFD or measured physical validation.

## Current scope scores — 2026-11-04

**Software built: 27/54 = 50.0%.** Strict count of ✅ rows in the current software checklist; partial work and local drafts receive no completion credit.

| Software status | Entries |
|---|---:|
| ✅ Built and connected | 27 |
| 🟨 Partly implemented | 10 |
| ⬜ Remaining code | 16 |
| 📝 Uncommitted draft | 1 |
| **Software total** | **54** |

**Separate validation/dependency gates: 9 pending.** Including these gates, **27/63 = 42.9%** of the entire checklist is built-tagged; **36 entries** still have implementation or verification remaining. Built software does not imply physical/browser/scientific acceptance.

| Area | Built | Partial | Remaining code | Draft | Validation gates | Software built |
|---|---:|---:|---:|---:|---:|---:|
| Design Studio | 3 | 2 | 2 | 0 | 1 | 3/7 (42.9%) |
| Wind Tunnel and CFD | 5 | 1 | 2 | 1 | 2 | 5/9 (55.6%) |
| Race, analysis and stadium | 4 | 2 | 3 | 0 | 1 | 4/9 (44.4%) |
| ORACLE and closed loop | 4 | 2 | 4 | 0 | 1 | 4/10 (40.0%) |
| Calibration, measurements and structure | 5 | 1 | 2 | 0 | 2 | 5/8 (62.5%) |
| FORGE | 3 | 0 | 2 | 0 | 1 | 3/5 (60.0%) |
| Engineering records, UI and quality | 3 | 2 | 1 | 0 | 1 | 3/6 (50.0%) |

Method: count each checkbox once in the seven engineering areas below; exclude the cut list and narrative work order. Exclude ⏳ rows from the software denominator and report their data/dependency requirements separately. Rows have different sizes: these are **checklist scores, not effort estimates or competition readiness**. No half-point weighting, removed paperwork or historical 118-entry denominator is used. This recount uses recorded statuses, not a new code/browser/physical audit. Recalculate from the rows when scope/status changes.

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

Previously removed scope stays removed: drawing/render packs and DXF/SVG importer; AR; base-bleed; competitor scraping; photo/video scrutineering; photogrammetry; community calibration; multi-fidelity; BoTorch/OpenMDAO/trame; OS matrices, Docker/devcontainer, mutation testing, eight-hour soak, multi-user and archival-publication services.

This is a **planning scope change**. Existing code, saved files and historical evidence are not deleted by this change. Do not revive these tasks because an older document or code module still contains them. Hiding or removing existing extras can be a separate focused cleanup, preserving shared engineering dependencies.

## Design Studio

- [x] ✅ Chili3D CAD, STEP/GLB/CFD import, named parts and save/import pipeline.
- [x] ✅ Failed-rule part selection/focus, dimensions, sections and A/B inspection controls.
- [x] ✅ Canonical four-parameter ORACLE study generator through build123d/import/FORGE.
- [ ] 🟨 CAD rule-state overlays and real value/limit anchors.
- [ ] 🟨 Inspect/editor consolidation: current DesignSidebar/DesignStudio/DesignWorkspace edits are another contributor's dirty work; do not overwrite or count them committed.
- [ ] ⬜ Signed mm geometry-deviation heat map and supported frame/alignment checks.
- [ ] ⬜ Live parametric controls, material-aware mass/CG, minimum wall/CNC reach and measured-CAD manufacturing comparison.
- [ ] ⏳ Final keyboard/responsive and manufactured-part validation.

## Wind Tunnel and CFD

- [x] ✅ Cp/streamlines/slices, wake planes, Q layers, source legends and compatible same-mesh delta Cp.
- [x] ✅ Component pressure/friction forces, signed waterfall and longitudinal drag build-up.
- [x] ✅ Residual/Cd histories, mesh/force/convergence gates, rejection reasons and GCI/speed-study tooling.
- [x] ✅ Durable queue/log/cancel; configurable recorded Cd stopping controls; benchmark/CFD exclusion and bounded numerical threads.
- [x] ✅ Compact velocity export and accepted-run default with honest unavailable states.
- [ ] 📝 Animated GPU flow/ground/camera/adaptive-density integration remains a pre-existing local draft.
- [ ] 🟨 One-scene integration of the advanced field layers.
- [ ] ⬜ LIC, probe Cp, y+/bad-cell maps, delta wake/forces, momentum-deficit cross-check and yaw/ride-height matrix.
- [ ] ⬜ Guided run wizard/ETA and compatible source-validated warm starts/mesh reuse.
- [ ] ⏳ Accepted current-car baseline, three-mesh GCI, speed sweep, turbulence comparison and physical correlation.
- [ ] ⏳ Real-Mac fps/memory/loading checks; proposed acceleration factors remain unmeasured.

## Race, analysis and stadium

- [x] ✅ Real-car/20 m replay, broadcast cameras, f1-dash HUD, mini-sectors, ghost, photo finish and adaptive-quality mechanism.
- [x] ✅ Four main tabs and dialog reaction trainer with restored browser-practice history/statistics/false starts/export.
- [x] ✅ Linked uPlot traces, MC histogram/quantiles, tornado/exchange-rate metrics and energy Sankey with visible integration residual.
- [x] ✅ Scenario racing-points/head-to-head calculations; estimates retain their source labels.
- [ ] 🟨 Complete event annotations, best eligible real-run ghost and compatible overlays.
- [ ] 🟨 Session tower exists; saved event timing/history, speed trap and event leaderboard remain.
- [ ] ⬜ Race-day actual timing/reaction, ordinary saved-prediction comparison and explicit calibration application.
- [ ] ⬜ Stadium/TV/fullscreen mode and engineering timing CSV/JSON export.
- [ ] ⬜ Supported tether model, race Sobol/variance budget, MC convergence and optimal legal mass curve.
- [ ] ⏳ Physical rendering/input performance and measured race correlation.

## ORACLE and closed loop

- [x] ✅ GP/EI, study-family feasibility filter, mean/SD map and next point.
- [x] ✅ Native SALib sensitivity, fitted length-scale/noise diagnostics and held-out prediction/coverage views.
- [x] ✅ Native Optuna/CMA-ES/SciPy equal-budget benchmark queue, exact settings/version/source binding, trial records/CIs and native tables.
- [x] ✅ Serialised atomic observation appends and explicit source/provenance labels.
- [ ] 🟨 Actual campaign acquisition history and engineer proceed/edit/veto flow.
- [ ] ⬜ Training-pool separation: synthetic demo, unreviewed input, accepted CFD and physical data.
- [ ] ⬜ STEP/geometry/surface/settings identity guards, full performance-rule queue gate and idempotent accepted-only feedback.
- [ ] ⬜ Prospective pre-evaluation candidate snapshots and accepted-source scoring.
- [ ] ⬜ Native eligible-data Pareto front and repeat-experiment noise estimation.
- [ ] 🟨 Adjoint tooling exists; source-bound sensitivity display and constrained updates remain.
- [ ] ⏳ Scheduled benchmark execution, accepted campaign/adjoint and measured validation. No authority/publication task is attached to these.

## Calibration, measurements and structure

- [x] ✅ Unit-aware timing/thrust input, per-row outlier flags without exclusions, explicit timing/source settings and Lab/Track/Custom + Advanced forms.
- [x] ✅ Bounded importance-sampling calibration, posterior intervals, held-out plots, ESS/warnings, saved studies and comparison table.
- [x] ✅ Held-out comparison review fix R1 recorded in evidence/R1.md: actual input/target/condition identity and explicit source roles; legacy uncertainty retained.
- [x] ✅ D-optimal timing/coast-down planner and paired CI/prospective power/MDE with exact source/settings/results.
- [x] ✅ Analytically checked beam model, deflection/stress plots and four-case configured comparison.
- [ ] ⬜ Required paired sample-size solver, repeat-run control analysis and complete uncertainty decomposition.
- [ ] 🟨 Across-study scoring/PPC and applying a saved posterior to Race.
- [ ] ⬜ Extended mass/dimension/coast-down/load-test entry and source-linked gauge R&R.
- [ ] ⏳ Real material properties, part measurements, paired track/thrust/tether/load tests and independent held-out validation.
- [ ] ⏳ CalculiX 3D work depends on real materials/load/mesh validation. No written improvement story is required.

## FORGE

- [x] ✅ India-default YAML checks, supported wheel/axle/wing/notch/layout features and source-page references.
- [x] ✅ CAD/source-bound remeasurement, per-rule manufacturing probabilities and explicit manual/excluded states.
- [x] ✅ G06 margin bars, declared ±1σ bands, valid percent-of-span and probability/points/expected-loss sorting; engineering spread remains an assumption. See evidence/G06.md.
- [ ] ⬜ Canonical wall/chamber/cylinder/full-section/standard halo measures.
- [ ] ⬜ Engineering inspection entry and validated dimensional what-if/feasible frontier.
- [ ] ⏳ Rule coverage/source reconciliation and physical compliance/load checks. No PDF archive or compliance-document deliverable remains.

## Engineering records, UI and quality

- [x] ✅ Saved source/design/run/experiment/model records, content-addressed files, lineage and missing-source/validation views.
- [x] ✅ Streaming byte-integrity checks; preserve hashes needed to prevent wrong-design/stale-source use.
- [x] ✅ Existing ECharts/uPlot/TanStack/Base UI/Dockview integration and meaningful source/units/empty/error patterns.
- [ ] 🟨 Per-screen source consistency, remaining exports/cursors/overlays, accessible table interactions and compact forms.
- [ ] ⬜ Source-linked engineering decision/action flow and recorded compute/wall-time view.
- [ ] 🟨 Fast CI, numerical/source-binding regressions, type/runtime API consistency and security/licence hygiene.
- [ ] ⏳ Grouped browser/keyboard/download/responsive review and real hardware memory/performance checks. No per-task screenshot/rating paperwork.

## Active next work

1. Complete/land owned Design Studio and one-scene flow integration; preserve concurrent drafts.
2. Implement training/source separation and accepted-only closed-loop safeguards.
3. Finish calibration-to-Race, actual event timing and stadium/TV UI.
4. Engineer decision history, Pareto, paired sample size and remaining useful analysis.
5. Advanced FORGE/manufacturing/adjoint/structure, scheduled scientific validation and practical quality fixes.

Root prompt-next.md is the active implementation handoff. Old prompts and historical evidence remain history; do not restore their removed tasks. This scope-edit commit changes plans only, does not delete runtime code/data and does not claim a new implementation/verification pass.

## A06 — 2026-11-04

Extended the vendored Chili3D bridge with a validated `daedalus:rules` overlay: matched part
materials for fail/at-risk/pass, restore on clear, and a CAD value/limit dimension annotation only
where FORGE declares a supported axis. The host fetches `/v1/forge/checks` for the open design and
applies the overlay after iframe load. `Check.axis` is derived from a deliberately small measure
map; clearance/diameter/mass and manual rules have no axis and stay explicit. Bridge tests cover
message validation; the vendored app was rebuilt and the bundle copied. Browser click-through is
still not captured and is stated as the remaining A06 gate. Evidence: `evidence/A06.md`.

## J09 Q&A bank — 2026-11-04

Wrote the 66-question sourced judge Q&A bank in `docs/judges/JUDGE-QA.md`. It is preparation, not
acceptance: the teammate-timed three-minute run and a real recorded fallback remain open, so J09
stays partial. Evidence: `evidence/J09.md`.
