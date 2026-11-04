# Daedalus X — finish the exact 20 partial ledger entries

Repository: `/Users/adityabalaji/Documents/f1/daedalus-x` (`aditya160509/daedalus-x`), main only, AGPL-3.0. This prompt supersedes the earlier generic NEXT-01–15 sequence: its completion scope is now **the exact 20 🟨 entries in MASTER-PLAN §28 A–L**, reproduced verbatim below from the committed 2026-11-04 ledger. Preserve root `prompt.md` as the completed EASY sprint record.

## Start and scope

- Run git status, pull --rebase origin main, and preserve dirty work with a reversible autostash if needed. No branches/PRs/reset/clean. Read PROGRESS latest checkpoint and `evidence/REVIEW-EASY-SPRINT-2026-11-04.md`, then only the relevant files/§28/TODO sections for the current entry. Do not reread unchanged files already understood.
- The 118-entry ledger is currently 58 built, 20 partial, 30 not started, nine verification/data gates and one draft. These 20 are **not all easy, not all software-only, and not 20 new tasks to add to the denominator**. Do not promote a parent while its stated requirements remain.
- Finish review prerequisite R1: repair `apps/cockpit/src/lib/calibrationCompare.ts` identity using actual scored target/input rows and explicit source roles; do not infer held-out identity from unique condition sets or `sources[1]`. Add changed-target/row-association/legacy/optional-source tests.
- Finish R2: fix process-lifetime caching in `src/daedalus/source_identity.py`; each export must truthfully report its snapshot/capture time and dirty/unknown state with bounded offline Git calls. Test changed snapshots in one API process.
- Preserve the pre-existing particle draft in SimulateWorkspace/FlowTunnel3D/HeroRender/viz helpers, shared api.ts/MASTER-PLAN hunks and WIND-TUNNEL evidence. B13 explicitly targets that area, so inspect/coordinate its ownership and current state before integration. Never overwrite or commit someone else's draft wholesale.

## Quality, reuse and completion discipline

Use existing Base UI/shadcn, neutral project tokens, one accent, Inter/mono numbers, units, keyboard labels/focus and loading/empty/error states. Native ECharts/TanStack v9/SciPy/Typst/Three/VTK/existing jobs and EvidenceStore should do the work they already support. Do not rebuild completed charts, QR, beam comparison, paired statistics or reaction history. Verify actual upstream licences before copying; retain notices/THIRD_PARTY. No licence means no copying/translation; NOASSERTION requires inspecting the licence. TinyFish/official docs and installed APIs for external research. Use graph discovery first, rg fallback when unindexed.

Read apps/cockpit/AGENTS.md and applicable installed Next guide before frontend edits. Keep source/provenance/acceptance explicit. Synthetic demos never become accepted CFD or physical measurements. Preserve raw data, exclusions and immutable lineage; no invented targets, authority receipts, photos, recordings or test passes.

Implement code and local bounded fixtures here. **Do not run CFD, mesh generation, adjoint campaigns, large benchmarks, heavy builds or workers, publish/deploy, contact timestamp services or send messages to people under this prompt.** Real measurements, external authority/hosting and accepted scientific campaigns are listed as completion gates; finish all independent software and record exactly what is missing rather than silently skipping or pretending. Do not resurrect removed drawings/AR/multi-fidelity/photogrammetry/etc.

Batch lightweight checks across coherent changes; tests for nontrivial source-binding/statistical/gate logic, not mirrored labels. Use focused Ruff/format/pytest/pyrefly, frontend tsc/oxlint/oxfmt/Vitest, and one combined browser pass with console/1440/1024/375 checks. PDF output needs a small compile/render inspection. Stop owned servers; no heavy concurrent work. If a gate is deferred, keep it pending.

Small commits/pushes on main. In each entry's commit update PROGRESS, its exact §28 ID and §23, and `evidence/PARTIAL-ID.md` with files, native OSS used, actual checks and remaining gates. Never increment the denominator for a subtask. **Mark an entry built only when all of its declared requirements are satisfied, or explicitly split a scientific acceptance gate through a documented scope decision rather than quietly dropping it.** Finish code-ready items first and then provide a precise gate checklist for the rest.

Recommended order: R1/R2; J09 Q&A software and G06; H02/L03 acceptance; F08 software; J06/G09/J10/J07 software; A06/A11/A07/B13; C10/D07; E11/E10; D10/E13; L07 in bounded related pieces. Shared prerequisites may be built where necessary, but do not switch to an unrelated 30-not-started backlog and call this list complete.

## The exact 20 entries and their remaining completion requirements

Frontend shorthand filenames below refer to the explicitly named directory in that entry. Treat the quoted ledger wording as the parent scope, not merely the easiest bullet.

## 01. A06

**Exact current ledger entry:**

> A06 — CAD rule overlay: selection/focus exists; coloured rule states plus measured-value/limit dimension lines inside CAD remain.

**Read first:** `patches/chili3d.patch`; `apps/cockpit/src/app/design/CadFrame.tsx`; `apps/cockpit/src/components/pitwall/LegalPanel.tsx`; `src/daedalus/api/forge.py`; `src/daedalus/forge.py`.

**Finish:** Extend the existing CAD focus bridge to apply rule-state colours and an actual value/limit dimension annotation to identified parts/features. Reuse Chili3D selection/overlay APIs and existing FORGE results. Clear stale overlays on revision/rule change. Where the geometry has no supported feature anchor, show an explicit unavailable dimension rather than guessing an attachment.

**Completion criteria and gates:** Clicking a supported rule selects/frames its real part, shows the correct state and units/value/limit, and clears cleanly; unsupported/manual rules remain manual. Test the bridge message validation and inspect the UI. A physical measured value must come from an inspection record; a CAD value stays labelled CAD.

## 02. A07

**Exact current ledger entry:**

> A07 — Two-design comparison exists; signed deviation heat map in mm remains.

**Read first:** `apps/cockpit/src/components/viewer/design/DesignCompare.tsx`; `designMath.ts`, `CarModel.tsx`, `useDesignModel.ts` in that directory; `src/daedalus/geometry.py`; `src/daedalus/viz/compare.py`.

**Finish:** Add a geometry-to-geometry deviation layer for explicitly aligned revisions. Define the signed distance/reference-normal convention, frame/units and handling of unmatched components. Reuse installed Three/VTK geometry facilities; inspect licences before adding a spatial-query library. Do not call an unsigned nearest-vertex approximation a signed surface distance. Keep mesh work bounded/off the UI thread and preserve normal A/B comparison.

**Completion criteria and gates:** Known translated/scaled fixtures give expected mm deviations, identical geometry gives zero within declared tolerance, and mismatched frames/unsupported sign inference are rejected or shown honestly. User can see the reference, colour scale and method limitations. This is CAD deviation, not measured manufacturing deviation.

## 03. A11

**Exact current ledger entry:**

> A11 — Consolidate overlapping inspection/editor controls without losing measurement tools.

**Read first:** `apps/cockpit/src/app/design/DesignStudio.tsx`; `DesignWorkspace.tsx`, `CadFrame.tsx` in that directory; `apps/cockpit/src/components/viewer/design/DesignControls.tsx`, `MeasureHud.tsx`, `SectionPlane.tsx`, `Dimensions.tsx`.

**Finish:** Merge overlapping Inspect/editor controls into the intended Design Studio side-panel flow. Inventory select/frame, measure, dimensions, section, compare, reset, snapshot and save/import before moving anything. Preserve the canonical CAD iframe and current selection/revision. Reuse existing Base UI controls; remove only confirmed duplicates.

**Completion criteria and gates:** All inventoried actions remain reachable by mouse/keyboard at 1440/1024/375 px, selection survives appropriate panel changes, and no extra viewer is mounted solely to duplicate controls. Old links resolve sensibly. Record removed controls and their new locations.

## 04. B13

**Exact current ledger entry:**

> B13 — Exactly one renderer mounts at once in the animated draft; full single-scene integration of advanced field layers remains.

**Read first:** `apps/cockpit/src/app/simulate/SimulateWorkspace.tsx`; `FlowTunnel3D.tsx`, `FlowViewer3D.tsx` in that directory; `apps/cockpit/src/lib/vizBinary.ts`; `src/daedalus/viz/vtkexport.py`, `binary.py`; current WIND-TUNNEL evidence and git diff.

**Finish:** First coordinate with/inspect the pre-existing particle draft; do not overwrite or silently claim it. Integrate supported Cp, slice/wake/Q geometry and animated flow into the intended single scene, reusing current parsed/exported field sources. Keep one active renderer, shared transforms/camera/selection and working layer/legend controls. Unsupported layers must remain explicit rather than disappearing during consolidation.

**Completion criteria and gates:** All retained layers align in the same coordinate frame; toggles do not leak renderers, buffers, RAF loops or listeners. Hidden-tab pause and bounded/adaptive particle resources work. Browser integration evidence is required; physical-Mac fps remains a separately recorded gate, not inferred from screenshots.

## 05. C10

**Exact current ledger entry:**

> C10 — Replay pair/timing tower exists; session best/last/interval/reaction history is not a complete event timing system.

**Read first:** `apps/cockpit/src/components/race/TimingTower.tsx`; `timing/` components beside it; `apps/cockpit/src/app/race/RaceWorkspace.tsx`; `src/daedalus/importers.py`, `api/data.py`, `contracts.py` RaceRun/PhysicalBuild.

**Finish:** Complete a persisted event/session timing ledger feeding the tower: explicit car/build/team, lane, attempt order, timing definition, valid/false/disqualified status and reaction availability. Reuse existing import parsing, f1-dash components and append-only store. Distinguish simulated replay timing from entered event records. Compute session best/last/interval/reaction history only among eligible comparable rows.

**Completion criteria and gates:** Manual/CSV entry, duplicate handling, history and eligibility-aware ranking work with honest empty states. Corrections retain lineage. Missing reaction is not zero, and car-only timing is never silently combined with reaction. No synthetic event rows are substituted for absent measurements.

## 06. D07

**Exact current ledger entry:**

> D07 — Complete launch/burnout/peak/finish annotations, automatic best-run ghost and all chart exports/overlays.

**Read first:** `apps/cockpit/src/components/charts/TelemetryChart.tsx`; `apps/cockpit/src/components/race/GhostPanel.tsx`, `raceMath.ts`, `RaceReplay.tsx`; `apps/cockpit/src/app/race/RaceWorkspace.tsx`; race DTOs in `apps/cockpit/src/lib/api.ts`.

**Finish:** Finish launch/burnout/peak/finish annotations from actual trace/event definitions; select the best eligible real run for automatic ghost only when a compatible saved run exists. Preserve manual/scenario comparison and clearly distinguish it. Audit export and A/B overlays across the affected race charts rather than adding duplicate exports to charts already completed.

**Completion criteria and gates:** Events have correct time/position units and persist through cursor/zoom/compare operations; incompatible tracks/timing definitions cannot become a best-run ghost. No real-run source yields an explicit unavailable state. Exported charts include source/legend/units and correct A/B identity.

## 07. D10

**Exact current ledger entry:**

> D10 — Native Sankey and closure-error accounting connected; supported tether contribution and physical validation remain.

**Read first:** `src/daedalus/dynamics.py`, `energy.py`; `src/daedalus/api/analysis.py`; `apps/cockpit/src/components/race/EnergySankey.tsx`, `EnergyPanel.tsx`; `apps/cockpit/src/lib/energySankey.ts` and tests.

**Finish:** Add a separately supported tether-force/work term through dynamics, force traces, energy audit and Sankey using a documented model and explicit parameters/source. Reuse the existing integration and closure accounting. Preserve default compatibility and keep the signed numerical residual visible. A zero default for an uncalibrated term must be labelled uncalibrated, not physically validated.

**Completion criteria and gates:** Analytic fixtures verify tether work and energy balance, the term appears once without double counting rolling/drag, and units/contracts agree. Full completion also needs actual tether measurements and a held-out correlation record; without them finish software but keep this entry partial with that gate stated.

## 08. E10

**Exact current ledger entry:**

> E10 — GP mean/SD, posterior interval, refitted held-out target and residual/coverage charts connected; accepted-candidate campaign evidence and final browser review remain.

**Read first:** `src/daedalus/oracle.py`, `oracle_diagnostics.py`, `api/oracle.py`, `design_loop.py`; `apps/cockpit/src/components/pitwall/OracleDiagnostics.tsx`, `PitCharts.tsx`, `BuildNextControls.tsx`; current source/acceptance contracts.

**Finish:** Keep the already-built map/LOO charts. Add exact per-candidate prediction snapshots made before evaluation, bound to campaign/model/design/source identity, and score only later eligible accepted observations. Separate LOO diagnostics from genuinely prospective candidate validation. Finish browser review for the existing uncertainty/coverage views.

**Completion criteria and gates:** A prediction cannot be overwritten after its result arrives; plots identify the held-out/prospective method, source and interval level. Rejected/unreviewed/mismatched runs cannot enter accepted scoring. With no accepted campaign, show missing evidence; do not train on synthetic seeds to manufacture real validation. Accepted-campaign evidence remains an external gate.

## 09. E11

**Exact current ledger entry:**

> E11 — Fitted length scales/noise/status and benchmark acquisition reasons connected; real-campaign timeline and engineer veto/edit remain.

**Read first:** `src/daedalus/oracle.py`, `design_loop.py`, `api/oracle.py`, `contracts.py` Decision and `store.py`; `apps/cockpit/src/components/pitwall/BuildNextControls.tsx`, `OptimizerBenchmark.tsx`, `GpParameters.tsx`.

**Finish:** Complete the real-campaign acquisition timeline and immutable proceed/edit/veto audit. Preserve proposed and chosen parameters, recommendation/campaign/code snapshot, rationale and reviewer attribution. A build records the exact decision it used. Reuse suitable records/artifacts; Decision requires accepted_id, so do not misrepresent a veto as an accepted candidate. Keep existing benchmark trial history and fitted GP diagnostics.

**Completion criteria and gates:** Edited/stale/mismatched decisions cannot masquerade as the original recommendation; veto neither builds nor queues/appends an observation. Timeline uses actual campaign events with source links and honest empty state. Tests cover edits, veto and stale campaign/source bindings.

## 10. E13

**Exact current ledger entry:**

> E13 — Adjoint tooling exists; accepted primal/adjoint, connected map and constrained shape optimisation remain. Multi-fidelity is removed by TODO.

**Read first:** `src/daedalus/adjoint.py`; `tests/test_adjoint.py`; `src/daedalus/viz/sensitivity.py`; `src/daedalus/design_loop.py`, `parametric.py`, `forge.py`; viewer sensitivity/export contracts.

**Finish:** Finish the existing adjoint path: validate accepted primal/source binding, solver/adjoint compatibility, sensitivity field export and a correctly labelled CAD/mesh sensitivity map. Add constrained shape-update logic with feasibility checks, recorded objective/step and a verification/rollback path. Reuse current tooling; do not add removed multi-fidelity scope or a second unvalidated solver.

**Completion criteria and gates:** Code checks/fixtures establish signs, units, source matching and fail-closed feasibility. Full completion requires an accepted real primal/adjoint and independently checked drag improvement/constraint evidence. Do not launch those heavy solves under this prompt or substitute a synthetic map as accepted evidence.

## 11. F08

**Exact current ledger entry:**

> F08 — Paired CSV, mean CI, prospective power/MDE, declared pairing basis and evidence connected; formal preregistration, required-sample-size solver and field validation remain.

**Read first:** `src/daedalus/paired.py`, `api/paired.py`; `tests/test_paired.py`; `apps/cockpit/src/components/race/PairedTimingPanel.tsx`; `src/daedalus/contracts.py` ValidationProtocol and `store.py`.

**Finish:** Complete prospective required-pair-count solving for a declared meaningful effect using the existing noncentral-t power routine. Add an immutable pre-registration of pairing/randomisation/control/exclusion rules and planned sample count before the source results are scored. Bind later exact CSV/results to that protocol; do not describe retrospective pairing text as preregistration.

**Completion criteria and gates:** Required integer N meets target power and N-1 does not when within the bound; unattainable goals are explicit. Tests cover units, missing spread, protocol-before-result ordering and source binding. Actual preregistered paired field runs and validation still have to be supplied before the whole entry is complete.

## 12. G06

**Exact current ledger entry:**

> G06 — All-rule margin bars with tolerance bands, percent-of-span margins ✅ and points × failure-probability ordering remain incomplete.

**Read first:** `src/daedalus/forge_probability.py`, `forge.py`, `api/forge.py`; `apps/cockpit/src/components/pitwall/LegalPanel.tsx`, `FrontierPanel.tsx`; `apps/cockpit/src/lib/forgeMargin.ts`; current RuleRisk/ForgeRisk DTOs.

**Finish:** Finish unit-aware all-rule margin views with declared tolerance bands and ordering by expected points at risk where both a stated penalty and supported failure probability exist. Reuse returned probabilities and percent-of-allowed-span helper; do not rerun an independent simulation per plot. Preserve manual/excluded/unquantified rules and allow original rule order/source pages.

**Completion criteria and gates:** Band widths match the stated sigma/coverage convention; failure signs and units remain correct. Unsupported percentages/penalties are unavailable, not zero. Expected-loss ordering is not presented as independent correlated risk or measured process capability. Native ECharts/TanStack controls and sources are visible.

## 13. G09

**Exact current ledger entry:**

> G09 — Compact one-page fail/risk/manual/CAD-pass summary connected (`summary.typ`, `/v1/forge/summary.pdf`); fully linked source-PDF evidence archive remains.

**Read first:** `src/daedalus/api/forge.py`, `forge_sheet.py`, `source_identity.py`, `store.py`, `contracts.py`; `rulebooks/`; `apps/cockpit/src/components/pitwall/LegalPanel.tsx`, `components/evidence/ArtifactProof.tsx`; current summary PDF evidence.

**Finish:** Keep the completed summary. Archive the actual supplied official technical/competition PDFs as immutable evidence, with filename/revision/source, full hashes and explicit links to the YAML revision and rule-page findings. Add navigation from findings/summary to the correct source PDF/page. Verify document identity; a local YAML hash is not a source-PDF archive.

**Completion criteria and gates:** Correct real PDFs are retrievable/linked and their hashes verify, with missing/mismatched revisions reported. If the official files cannot be found in the authorised local sources, finish the registration/linking workflow and record precisely which documents/revisions are still needed. Do not claim official coverage from YAML rule count alone.

## 14. H02

**Exact current ledger entry:**

> H02 — Solver nodal deflection/stress plots and a configured-part comparison table (up to four captured cases) connected; browser/material validation and physical load testing pending.

**Read first:** `apps/cockpit/src/components/strength/StrengthPanel.tsx`, `BeamPlots.tsx`; `src/daedalus/structure.py`, `api/analysis.py`; structure/API tests and EASY-11 evidence.

**Finish:** Do not rebuild the new comparison table/plots. Complete browser/narrow-screen/capture/export checks, including input debounce versus the exact resolved request and immutable captured rows. Connect real material-source identity and recorded physical load-test evidence where available; preserve handbook estimates as estimates.

**Completion criteria and gates:** UI/exports agree with the captured section/load/material result and zero-stress states remain safe. Physical material/load measurements correlate with the declared model within documented criteria. Without those measurements, mark UI acceptance independently and keep the physical-validation remainder open.

## 15. J06

**Exact current ledger entry:**

> J06 — Full action linkage and real export/download acceptance; a gap detector does not itself record the missing action.

**Read first:** `src/daedalus/coverage.py`, `dossier.py`, `judge_pack.py`, `store.py`, `contracts.py`; `apps/cockpit/src/components/evidence/EvidenceDrawer.tsx`, `EvidenceLineage.tsx`, `DossierPanel.tsx`; relevant evidence/coverage tests.

**Finish:** Inventory each current missing-action category and connect it to an actual supported action or explicit source-gated workflow. Completion writes the appropriate append-only record with supporting source IDs. Do not erase a gap just because a user checked a UI box. Finish actual report/summary/ZIP/source downloads and their evidence links.

**Completion criteria and gates:** Coverage changes only after the required valid record exists; failed/cancelled actions cannot appear completed. Dangling/invalid references remain visible. Downloaded real files match manifest hashes and the lineage explains the action. Record which actions still require physical/authority input.

## 16. J07

**Exact current ledger entry:**

> J07 — Hash-pinned artifact verification page, Evidence links and native QR SVG/export connected; OpenTimestamps anchor, public deployment and browser/scan verification remain.

**Read first:** `src/daedalus/anchor.py`, `predictions.py`, `contracts.py`, `store.py`; timestamp routes in `api/analysis.py`; `apps/cockpit/src/components/pitwall/SealedReveal.tsx`; `components/evidence/ArtifactProof.tsx`; anchor tests.

**Finish:** Finish a distinct OpenTimestamps receipt/upgrade/verification path using the licensed native client and exact sealed digest. Keep RFC3161 and OpenTimestamps trust/results separate. Retain hash-pinned QR behavior; finish browser/phone scan checks and prepare a concrete reachable-host configuration. Research official client APIs and retain licences before copying.

**Completion criteria and gates:** Receipt bytes, digest binding, pending/confirmed/failed verification and evidence records are honest. An unconfirmed receipt is not a confirmed timestamp. Public hosting and live authority verification require actual external execution/approval; do not deploy or contact authorities merely to tick this row under a code-only prompt.

## 17. J09

**Exact current ledger entry:**

> J09 — Three-minute timed walkthrough script, honest limitations slide and baseline/change/prediction/measurement one-pager written; 60+ judge Q&A bank, timed teammate run and recorded fallback remain.

**Read first:** `docs/judges/THREE-MINUTE-WALKTHROUGH.md`, `INNOVATION-ONE-PAGER.md`; `apps/cockpit/src/components/present/Presenter.tsx`; `docs/innovation.md`, PROGRESS, THIRD_PARTY and `src/daedalus/dossier.py`.

**Finish:** Write `docs/judges/JUDGE-QA.md` with at least 60 distinct numbered questions, concise spoken answers and real source references. Include hard questions about synthetic data, incomplete acceptance/closed loop, licences/team ownership, CFD/GCI, statistics and limitations. Complete a teammate-timed three-minute rehearsal and an actual recorded fallback of available honest screens; keep the current script/limitations slide/one-pager.

**Completion criteria and gates:** Q&A claims are sourced and unknowns are admitted; exact question count is checked. A rehearsal has actual timing/reviewer notes and fallback video is real/playable with source/status labels. If a teammate or recording environment is unavailable, deliver the bank and preparation and keep those explicit gates uncompleted.

## 18. J10

**Exact current ledger entry:**

> J10 — Report, sheet and summary PDFs now carry full rulebook/geometry hashes, code commit/dirty state and generation time; run-manifest identity, offline demo and recorded fallback remain.

**Read first:** `src/daedalus/api/report.py`, `source_identity.py`, `judge_pack.py`, `cfd.py`, `jobs.py`; report/sheet/summary Typst templates; `apps/cockpit/src/components/present/Presenter.tsx`; source-identity/report tests.

**Finish:** Preserve completed PDF hashes and fix stale snapshot provenance first. Add exact selected-run/case/source/solver/template identity to exports when such a run exists; unbound legacy data stays unbound. Prepare a bounded offline demo bundle from actual stored source/results plus the real fallback recording, with an inventory/verification and an explicit no-recompute mode.

**Completion criteria and gates:** Airplane/offline operation is actually checked, all referenced demo assets exist and source identities match. No network, renderer/solver campaign or invented run is required to replay saved content. Pending video/run identity is visible, not claimed completed by an instruction file. Share the fallback artifact with J09 rather than duplicating it.

## 19. L03

**Exact current ledger entry:**

> L03 — Consistent per-screen provenance, chart exports/linked cursors, all table keyboard interactions and ≤6 main form inputs remain uneven.

**Read first:** `apps/cockpit/src/components/ui/`, `components/charts/useECharts.ts`, `TelemetryChart.tsx`, `components/shell/`; current workspaces, `docs/build/RATINGS.md`, CHECKLIST and EASY evidence.

**Finish:** Audit each workspace for one clear provenance treatment, native export, supported shared cursor/overlay, accessible tables and at most six main visible form inputs. Reuse current Base UI Advanced patterns and native chart/table facilities. Remove confirmed duplicate badges/forms instead of redesigning working screens. Preserve invalid-field visibility, file selection and keyboard operations.

**Completion criteria and gates:** A written per-screen matrix links each fixed issue and actual 1440/1024/375 px/keyboard/download check. Do not blanket-tick every chart because four received export buttons. Unsupported cursor comparisons and source gaps remain stated. This is UI consistency, not physical performance acceptance.

## 20. L07

**Exact current ledger entry:**

> L07 — Existing CI/static/unit tooling exists; coverage targets, targeted Hypothesis properties, OpenAPI-generated types and nightly golden path remain.

**Read first:** `ci/github-actions-ci.yml`; actual `.github/workflows/` if present; `pyproject.toml`; `apps/cockpit/package.json`, `vitest.config.mts`; `src/daedalus/api/__init__.py`, `contracts.py`; current tests and `lefthook.yml`.

**Finish:** Complete meaningful fast CI in the actual GitHub workflows location, measured core coverage targets, targeted Hypothesis properties, deterministic OpenAPI-generated client types and a bounded nightly golden path using honest fixtures. Check licences for any added tooling. Keep generated types reproducible and runtime validation intact; do not introduce a second client contract that silently drifts.

**Completion criteria and gates:** CI actually runs and reports the specified checks; coverage is measured with exclusions explained, useful properties catch boundary failures, generated contracts reproduce and the golden path has real assertions. No CFD/8-hour soak/removed platform matrix is added. Resource-bounded jobs and retained evidence are required; no fake coverage/golden screenshots.

## Exact-ID tracking checklist

- [ ] R1 — Saved-study identity review fix
- [ ] R2 — Export snapshot freshness review fix
- [ ] A06 — CAD rule overlay: selection/focus exists; coloured rule states plus measured-value/limit dimension lines inside CAD remain.
- [ ] A07 — Two-design comparison exists; signed deviation heat map in mm remains.
- [ ] A11 — Consolidate overlapping inspection/editor controls without losing measurement tools.
- [ ] B13 — Exactly one renderer mounts at once in the animated draft; full single-scene integration of advanced field layers remains.
- [ ] C10 — Replay pair/timing tower exists; session best/last/interval/reaction history is not a complete event timing system.
- [ ] D07 — Complete launch/burnout/peak/finish annotations, automatic best-run ghost and all chart exports/overlays.
- [ ] D10 — Native Sankey and closure-error accounting connected; supported tether contribution and physical validation remain.
- [ ] E10 — GP mean/SD, posterior interval, refitted held-out target and residual/coverage charts connected; accepted-candidate campaign evidence and final browser review remain.
- [ ] E11 — Fitted length scales/noise/status and benchmark acquisition reasons connected; real-campaign timeline and engineer veto/edit remain.
- [ ] E13 — Adjoint tooling exists; accepted primal/adjoint, connected map and constrained shape optimisation remain. Multi-fidelity is removed by TODO.
- [ ] F08 — Paired CSV, mean CI, prospective power/MDE, declared pairing basis and evidence connected; formal preregistration, required-sample-size solver and field validation remain.
- [ ] G06 — All-rule margin bars with tolerance bands, percent-of-span margins ✅ and points × failure-probability ordering remain incomplete.
- [ ] G09 — Compact one-page fail/risk/manual/CAD-pass summary connected (`summary.typ`, `/v1/forge/summary.pdf`); fully linked source-PDF evidence archive remains.
- [ ] H02 — Solver nodal deflection/stress plots and a configured-part comparison table (up to four captured cases) connected; browser/material validation and physical load testing pending.
- [ ] J06 — Full action linkage and real export/download acceptance; a gap detector does not itself record the missing action.
- [ ] J07 — Hash-pinned artifact verification page, Evidence links and native QR SVG/export connected; OpenTimestamps anchor, public deployment and browser/scan verification remain.
- [ ] J09 — Three-minute timed walkthrough script, honest limitations slide and baseline/change/prediction/measurement one-pager written; 60+ judge Q&A bank, timed teammate run and recorded fallback remain.
- [ ] J10 — Report, sheet and summary PDFs now carry full rulebook/geometry hashes, code commit/dirty state and generation time; run-manifest identity, offline demo and recorded fallback remain.
- [ ] L03 — Consistent per-screen provenance, chart exports/linked cursors, all table keyboard interactions and ≤6 main form inputs remain uneven.
- [ ] L07 — Existing CI/static/unit tooling exists; coverage targets, targeted Hypothesis properties, OpenAPI-generated types and nightly golden path remain.

## Final handoff

Report each of the 20 IDs as: complete with commit/evidence; software complete with named external/physical gate; or remaining code with the exact next step. List actual review fixes and checks. If all code-ready portions are done, do not keep rerunning tests or fabricate acceptance to reach 20/20. State required measurements/authority/deployment inputs precisely. Recount the committed ledger after status changes; creating this prompt itself does not change any feature count.
