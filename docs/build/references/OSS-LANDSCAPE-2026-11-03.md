# Daedalus X: open-source reuse shortlist

Research date: 2026-11-03. Requested by owner: search broadly across project types for useful, high-quality reusable work.

42 TinyFish search queries, 34 URL fetch attempts and 35 GitHub repository metadata checks. Relevant official READMEs/docs were fetched; ambiguous licence metadata was followed by reading the actual licence for coss, Optuna Dashboard, OpenTimestamps, Hypothesis and Pint. This is a screened shortlist, not an implementation/security/performance audit or proof of an absolute best project.

No dependencies installed, no upstream source imported, no solver or browser started. Existing implementation work and diverged local/remote main were left untouched. Nothing in this report changes TODO scope or marks a task accepted.

## Best next reuse decisions

| Priority | Project / verified licence | Concrete use in Daedalus X | Integration boundary and acceptance |
|---|---|---|---|
| 1 | [Optuna](https://github.com/optuna/optuna), MIT | TODO 6 / T10: TPE and CMA-ES benchmark competitors, persistent trials and acquisition history | Use the actual sampler APIs behind our existing job queue. Same evaluation budgets, seeds and accepted-input rules as GP/Sobol/LHS/random. Failed, vetoed and rejected evaluations need explicit accounting. Do not replace the whole application or run automatic CFD during adoption. |
| 2 | [pymoo](https://github.com/anyoptimization/pymoo), Apache-2.0 | TODO 6/14: constrained Pareto exploration of drag, mass and legal margin | Use native multi-objective algorithms and constraint handling. Only offer objectives for which actual models/data exist; repeatable predicted fronts remain predicted. A surrogate front is not accepted CFD evidence. GitHub metadata currently resolves the old repository path to `the-dual-space/pymoo`; pin the canonical source/version when adopting. |
| 3 | [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh), MIT | TODO 1/3: accelerated ray queries, particle/solid exclusion or SDF preparation, picking | Reuse native spatial-query/BVH facilities and relevant examples. Browser tessellation thickness is a preview, not canonical OCCT compliance measurement. Dispose trees and build them off the main thread where justified. Evaluate against the current draft particle mask first. |
| 4 | [coss ui](https://github.com/cosscom/ui), MIT in actual LICENSE | TODO 8/11: compact accessible number inputs, preset selectors, disclosures, consistent Base UI forms | Copy selected components into our existing UI directory, preserving notices; keep current tokens. This directly fits our Base UI/Tailwind stack better than introducing another UI framework. Do not blindly replace working components. |
| 5 | [Kibo](https://github.com/shadcnblocks/kibo), MIT | TODO 13 / T33: Gantt and project planning components | Adopt the actual Gantt component selectively; feed planned dates and actual evidence events separately. Inspect its selected component dependency tree and accessibility before importing. Existing scorecard/persistence remains the source of truth. |
| 6 | [statsmodels](https://github.com/statsmodels/statsmodels), BSD-3-Clause | TODO 8: paired-test power/sample-size planning and statistical summaries | Use [TTestPower.solve_power](https://www.statsmodels.org/stable/generated/statsmodels.stats.power.TTestPower.solve_power.html) on paired differences. The number of observations is pairs; use SD of differences, not independent-group SD. Results depend on effect-size and distribution assumptions, which must be editable and recorded. SciPy already covers simple paired tests; avoid a second implementation for those. |
| 7 | [ArviZ](https://github.com/arviz-devs/arviz), Apache-2.0 | TODO 8/14 / T17: prior/posterior summaries, predictive checks, diagnostics | Convert the actual posterior outputs. Current adaptive importance sampling is not multiple MCMC chains: R-hat must be unavailable, not manufactured. Keep importance-weight ESS distinct from MCMC ESS. Backend summaries can feed ECharts instead of shipping a second plotting UI. |
| 8 | [r3f-perf](https://github.com/utsuboco/r3f-perf), MIT | TODO 1/2/11: development profiling of React Three Fiber scenes | Dev-only performance inspection; compare physical GPU results against software rendering. It does not measure total app RSS and its R3F component is not directly applicable to a raw Three.js canvas. Use native renderer/browser measurements for that canvas. Do not leave a heavy profiling overlay in the normal judge demo. |
| 9 | [OpenTimestamps client](https://github.com/opentimestamps/opentimestamps-client), LGPL-3.0-or-later in LICENSE | TODO 10 / T16: independent second timestamp anchor | Use actual stamp/upgrade/verify flow, preserve proof bytes and distinguish pending calendar responses from confirmed attestations. Confirmation is asynchronous, potentially hours; receiving a proof is not final confirmation. Keep existing RFC3161 records. |
| 10 | [foamgci](https://github.com/rithikrn/foamgci), MIT; [pyGCS](https://github.com/tomrobin-teschner/pyGCS), MIT | TODO 7 / T03: independent GCI/statistics cross-check | Compare existing Richardson/GCI outputs against published examples and these implementations before adopting one. Do not run both as competing authorities or assume a library makes a non-asymptotic study acceptable. foamgci advertises stationarity/autocorrelation-aware statistics; audit its assumptions against our averaging gate. |

These are priorities by fit with the current code and TODO gaps, not measured head-to-head quality rankings. Add only the dependency needed for an actual connected feature.

## Flow rendering and solver workflow

| Project | Licence checked | Decision |
|---|---|---|
| [Deltares webgl-streamline-visualizer](https://github.com/Deltares/webgl-streamline-visualizer) | MIT | Strong GPU particle/trail implementation reference. Its documented velocity path is map-oriented U/V, including FEWS-specific TIFF encoding. Adapt the core technique to our U/V/W texture; it is not an off-the-shelf 3D CFD viewer. Compare directly with our existing RK2 draft before adding anything. |
| [Mapbox webgl-wind](https://github.com/mapbox/webgl-wind) | ISC | Reuse appropriate ping-pong particle/trail code with attribution if it improves the current draft. Its advertised demonstration performance does not establish 60 fps for our 3D scene or Mac. This renders input vectors; it does not solve our aerodynamics. |
| [Fibre](https://github.com/jamportz/fibre) | MIT | Useful 3D vector-field integration/curve-rendering ideas, but metadata last push is 2019. Reference/selective adaptation after review, not a wholesale replacement. Its analytic examples must never become our CFD field. |
| [olaafrossi/FoamPilot](https://github.com/olaafrossi/FoamPilot) | MIT | The Electron/React/FastAPI GUI project matching the guided-wizard description. Inspect actual wizard and live-status components for selective reuse. Do not import its Docker deployment or Electron shell: those are outside our current TODO scope and duplicate our environment. |
| [stevendaix/foampilot](https://github.com/stevendaix/foampilot) | MIT | A DIFFERENT project: Python-first case generation/orchestration, explicitly not a GUI. Useful configuration/reporting helpers to inspect; not the same source as the desktop wizard. Keep our existing queue and installed foamlib. |
| [fluidfoam](https://github.com/fluiddyn/fluidfoam) | GPL-3.0, README states v3 or newer | Candidate for targeted OpenFOAM field reading if it demonstrably improves extraction/memory. Our PyVista reader already works; benchmark supported file versions and peak memory before introducing a second parser. |
| [FluidX3D](https://github.com/ProjectPhysX/FluidX3D/blob/master/LICENSE.md) | Custom restrictions, not a permissive OSS licence | Do not import under the project's current allowed-source policy. Actual licence restricts commercial and military use and AI training. It also adds a second CFD method/pipeline. Attractive visuals do not resolve those issues. |

## CAD, geometry and structure

| Project | Licence checked | Decision |
|---|---|---|
| [three-cad-viewer](https://github.com/bernhard-42/three-cad-viewer) | MIT | Useful tessellated CAD inspection/selection component. Evaluate a concrete missing inspection feature; do not mount another viewer alongside Chili3D and our existing scene without a justified replacement plan. |
| [Yet Another CAD Viewer](https://github.com/yeicor-3d/yet-another-cad-viewer) | MIT | OCP/build123d-oriented viewer candidate. Reference/export/picking ideas; preserve the one canonical geometry generator and established editor. |
| [scikit-fem](https://github.com/kinnala/scikit-fem) | BSD-3-Clause | Good lightweight NumPy/SciPy finite-element assembly reference and independent simple-elasticity check. Do not add it as a parallel production 3D structural pipeline while TODO specifies CalculiX with real material data. |
| [meshio](https://github.com/nschloe/meshio) | MIT | Add only if an actual CalculiX/mesh interchange gap requires it. Existing PyVista/OpenCascade formats do not justify an extra conversion layer by themselves. Metadata last push is 2024, which warrants compatibility checking rather than an automatic rejection. |

Keep build123d/OpenCascade and Chili3D: substantial existing adoption is already appropriate. Browser mesh raycasts do not replace exact solid measurements or manufactured-part inspection. Drawing/render packs and DXF/SVG importer are excluded by the new TODO; do not resurrect them from old plans.

## Calibration, uncertainty and scientific quality

| Project | Licence checked | Decision |
|---|---|---|
| [Chaospy](https://github.com/jonathf/chaospy) | MIT | Candidate for polynomial-chaos tolerance/uncertainty propagation after parameter distributions are backed by measurements. Pick it OR UQpy for an identified need, not both. |
| [UQpy](https://github.com/SURGroup/UQpy) | MIT | Broader uncertainty/reliability toolbox. Evaluate only where current NumPy/SciPy/SALib is insufficient; avoid importing a whole UQ stack for an existing Monte Carlo calculation. |
| [MAPIE](https://github.com/scikit-learn-contrib/MAPIE) | BSD-3-Clause | Later candidate for empirical predictive-interval coverage. Requires a suitable held-out/calibration dataset and assumptions; it cannot make eight synthetic seeds into measured coverage evidence. |
| [engstat](https://github.com/ktwyw/engstat) | MIT in LICENSE | Interesting direct fit for gauge R&R, capability, control charts and uncertainty budgets. Only two commits were shown in fetched history: treat as exploratory/reference pending numerical review. README validation claims are author claims, not our audit. Prefer established SciPy/statsmodels for immediate production work. |
| [Hypothesis](https://github.com/HypothesisWorks/hypothesis/blob/master/LICENSE.txt) | MPL-2.0, with noted third-party exceptions | TODO 12 dev dependency for physical invariants, unit conversion and FORGE boundaries. Use targeted property tests; do not expand into the explicitly cut mutation/OS-matrix testing. |
| [Pint](https://github.com/hgrecco/pint/blob/master/LICENSE) | BSD-3-Clause terms in actual file | Already declared in pyproject; reuse for unit boundaries and import validation. Installing it again is not progress. |

Important diagnostic correction: [ArviZ R-hat documentation](https://python.arviz.org/en/v0.22.0/api/generated/arviz.rhat.html) requires at least two posterior chains and compares within/between-chain variation. Do not split resampled importance draws into fake chains to satisfy a TODO checkbox. Keep meaningful importance-sampling diagnostics, or deliberately implement and justify a genuine multi-chain sampler before enabling R-hat.

## Race, telemetry, UI and evidence

| Project | Licence checked | Decision |
|---|---|---|
| [racing-game](https://github.com/pmndrs/racing-game) | MIT | Already partially imported. Improve the existing real-car track, camera/postprocessing and photo-finish integration selectively. Last upstream push in metadata is 2023: check current Three/R3F compatibility when copying more. Do not import road-driving physics as TITAN. |
| [f1-dash](https://github.com/slowlydev/f1-dash) | AGPL-3.0 | Already has direct timing-component adaptations here. Further broadcast/timing presentation can fit; the foreign F1 feed does not. |
| [FastF1](https://github.com/theOehrly/Fast-F1) | MIT | F1 telemetry access/analysis, not our STEM car dataset. Useful analytical reference; do not add its remote feeds or schedules to this product just for a motorsport association. |
| [TanStack Table](https://github.com/TanStack/table) | MIT | Strong fit for larger sortable/filterable evidence/rule/run tables. Not listed as a direct dependency in the checked cockpit package. Adopt a real table instead of replacing every small list automatically; virtualize only where record volume warrants it. |
| [Optuna Dashboard](https://github.com/optuna/optuna-dashboard/blob/main/LICENSE) | MIT plus embedded notices | Inspect actual trial-history/importance presentations, or use as an optional developer tool. Avoid shipping another full dashboard/server/UI framework inside Pit Wall. Its licence metadata was NOASSERTION but the actual licence is MIT with third-party notices. |
| [Aim](https://github.com/aimhubio/aim) | Apache-2.0 | Good run-comparison/grouping UX reference. Full adoption duplicates SQLite evidence, lineage and our UI and adds a service; defer unless a concrete uncovered requirement justifies it. |
| [TypeScript OpenTimestamps](https://github.com/lacrypta/typescript-opentimestamps) | LGPL-3.0 | Browser/public-verifier option if a TS implementation is required. Evaluate against the official Python client; avoid maintaining duplicate independent anchor implementations without interoperability fixtures. |

Retain the existing uPlot/ECharts, React Flow/Dagre, Dockview, Query, Base UI and postprocessing integrations. coss/Kibo should improve specific missing components within those foundations. A new component library is not evidence of better product quality.

## Handoff: code-first packages for another model

1. **Optimisation benchmark package:** Optuna samplers + existing SciPy Sobol/LHS/random, pre-registered equal-budget protocol, at least ten independent seeded synthetic benchmark campaigns, clearly labelled regret confidence bands and acquisition records. CFD benchmarking remains a separate accepted-campaign gate. Then pymoo only when real drag/mass/margin objectives are available.
2. **Forms/project package:** selected coss preset/disclosure/number components for Calibration and Test Planner, maximum six visible fields, Advanced section; selected Kibo Gantt connected to the actual plan/evidence timestamps. Keep current calibration persistence and scorecard.
3. **Paired testing package:** SciPy paired-difference CI plus statsmodels power calculation, explicit alternating-run pairs and assumptions, stored input hashes and result evidence. No synthetic observations presented as test results.
4. **Flow correctness/performance package:** finish the existing draft first. Compare Deltares/Mapbox trail and lifetime implementations with ours; add BVH/SDF exclusion only when needed; profile actual GPU/CPU/resource lifetime without adding a second renderer. No 60 fps or memory claim until measured on the physical Mac.
5. **Evidence anchor package:** official OpenTimestamps stamp/upgrade/verify, pending/confirmed/error states, stored proof and public verification. Keep trust and network dependencies visible; never treat receipt as final confirmation.

For each adoption: inspect current code first; pin upstream package or commit; inspect the exact copied file's licence and notices; retain credit in THIRD_PARTY; connect real app data; lazy-load optional heavy modules; check Python 3.12 / React 19 / Three 0.187 compatibility; record what was copied versus only referenced. Research inclusion is not adoption.

## Research artifacts

- `OSS-SEARCHES-2026-11-03.json`: all 42 queries and returned links/snippets, including empty-result queries.
- `OSS-LICENCES-2026-11-03.json`: 31 repository metadata responses including archive flag, default branch and push date.
- `OSS-EXTRA-REPOS-2026-11-03.json`: four additional exact-repository checks.
- `OSS-LICENCE-DETAILS-2026-11-03.json`: actual licence text/path for seven ambiguous or newly relevant projects.

Search results were used for discovery; recommendations above rely on the linked primary repositories/docs. Stars, README claims and recent push dates were not treated as proof of numerical correctness, maintenance quality or performance. No source/security or benchmark audit was performed.
