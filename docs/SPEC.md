# DAEDALUS X
## Veloira Autonomous Race Engineering System
### National-finals innovation master specification | Research-led concept and implementation blueprint

**Version:** 2.0 (free local macOS toolchain; Ax and Tracker adopted; low-value scope cut) | **Specification revision:** 26 October 2026 | **Original research checkpoint:** 25 October 2026  
**Project:** Veloira, STEM Racing / F1 in Schools  
**Owner:** Veloira student engineering and innovation team  
**Status:** Proposed system. Architectural decisions and experiments require verification against the team's actual rules, resources, CAD files and measurements.  
**Important:** This document is a design specification, not evidence that its features have already been implemented or that Veloira will win an award.

---

# 0. Executive decision

**Build one integrated engineering product rather than five disconnected applications.** Daedalus X accepts a parameterized car, competition regulations, simulated aerodynamic results, manufactured-part measurements and real track tests. It proposes new designs and experiments; checks what is legal and manufacturable; predicts how a design will race; and explicitly tests its own predictions against observed results.

The differentiator to pursue is **closed-loop experimental intelligence**: the application chooses the *next useful experiment*, rather than merely summarizing what engineers already ran. The proof is whether it achieves better, *independently validated* predictions or designs with the same experiment budget than simple alternatives.

**Five flagship systems, all connected:**

1. **ORACLE — Autonomous Experiment Scientist.** Cost-aware, constrained active learning: which design/CFD/physical test should be run next, and why?
2. **AETHER — Aerodynamic Design Engine.** Parametric CAD, geometry quality gates, meshing, validated CFD and uncertainty-aware surrogate models. Multi-fidelity modelling remains roadmap work.
3. **TITAN — Physics-Calibrated Race Digital Twin.** Race dynamics, measured thrust and friction, uncertainty, sensitivity, prediction intervals and strict held-out validation.
4. **FORGE — Manufacturing Intelligence and Digital Scrutineer.** Geometry-to-rule traceability, actual inspections, measured tolerance margins and systematic feedback to the design.
5. **ATLAS — Engineering Evidence and Decision Cockpit.** Interactive 3D car, linked fields, experiment lineage, Pareto trade-offs, decision explanations and a robust judge-facing demonstration.

**Product boundary:** Daedalus X orchestrates open-source tools and the team's existing licensed tools. It is *not* a new generic CAD kernel, a replacement for CFD physics or an LLM that invents measurements. One source-of-truth design definition and evidence data model keep the five flagships coherent.

**Product structure:** one application, six workspaces: Design, Simulate, Optimize, Race, Inspect and Evidence. ORACLE, AETHER, TITAN and FORGE provide engineering capabilities; ATLAS provides the shared interface and evidence access. All views retain the selected project, exact design revision, physical build and experiment context.

**Release authority:** Section 13 defines the single delivery backlog. Core capabilities ship together through staged evidence gates; roadmap items are excluded from the nationals release. Tool alternatives in the source register do not imply required integrations.

**Actual technical contribution sought:** verified cross-domain integration, experiments chosen under real resource constraints, rigorously evaluated model fidelity, and manufacturing-aware decisions. *Using* FreeCAD, OpenFOAM or AI does not itself establish novelty.

---

# 1. Competition alignment and decisions not yet verified

## 1.1 Governing rules

- **Authoritative:** the current technical and competition rulebooks for Veloira's **specific India Nationals event and class**, plus written organizer clarifications and their precedence rules.
- **Reference only:** STEM Racing global 2026 World Finals materials and 2026–27 documents from other national organizers. Their rules may differ. Some national technical rulebooks are distributed through registered-team portals; do not assume every dimension can be obtained publicly.
- **Pending imports:** India national event year/date; Development vs Professional or other applicable class; current official competition and technical regulations; version and amendment dates; organizer interpretations; required innovation deliverables; scoring rubric; permitted manufacturing operations; available sponsor tooling.
- **All limits configuration-driven:** minimum/maximum dimensions, masses, body material and block rules, wheel/guide/wing allowances, chamber and safety requirements, tolerances, model attachment and allowed verification methods. **No values in this specification are legal thresholds.**
- **AI transparency:** maintain an assistance-and-verification ledger of models, prompts/tasks, generated artifacts, reviews, calculations independently checked by students and final human decisions. Check the nationals' specific AI rules.

## 1.2 Judging theory of the case

Evidence should support: (a) researched engineering problem; (b) alternative concepts and controlled comparisons; (c) original student decisions; (d) detailed CAD and analysis; (e) manufacture and iterative testing; (f) reproducible evaluation; (g) clear communication; and (h) compliance with event regulations. Awards and scoring weights are **not guaranteed** by this specification.

**Do not claim:** globally first, objectively fastest, “graduate-level” as a substitute for proof, exact race time, a universal compliance probability, completely autonomous optimization, or validated improvement without experimental evidence.

## 1.3 Frozen initial assumptions (to be replaced by evidence)

The earlier Daedalus brief mentioned a 20 m course, nominal 8 g cartridge, mass around 74 g and reaction delay around 0.19 s. These are **unverified scenario inputs**, not assumed current team measurements or rule requirements. The thrust curve is not determined by cartridge mass. Reaction time may not enter the same official clock as car travel time. Keep both explicitly configurable and tagged `example/estimated` until established.

---

# 2. System proposition and operating modes

## 2.1 Two operating modes and an inspection workflow

**Engineering Mode:** import/version CAD; manipulate validated parameters; run CFD; inspect convergence and drag/lift; train surrogates; run candidate exploration; inspect trade-offs; plan physical testing; calibrate and validate physics; issue decisions.

**Inspection workflow within Engineering Mode:** load a versioned rulebook; geometric pre-checks; make manufacturing drawings; record instrument precision, part IDs and measured dimensions; identify margins and violations; analyze manufacturing consistency; recommend inspection/test priorities; freeze a candidate release.

**Competition Mode:** a saved presentation layout of the same application and evidence, with deterministic, rehearsed, offline-capable story: problem → alternatives → experiment chosen → prediction → CFD/measurement → what changed → actual measured result → remaining limitations. Highlight whether a view is live, cached, synthetic or independently measured.

## 2.2 Core workflow

`Official rule revision → geometry parameters → CAD feature build → geometric checks → low/high fidelity simulation → model fit and error estimate → physics-based race prediction → constrained experiment proposal → manufacture and measurement → physical test → held-out validation → documented decision → next experiment`.

**Hard gates:** no geometry/simulation without unique geometry ID; no surrogate inference silently outside validated range; no physical compliance status derived from CAD alone; no physical time claim without actual time record; no manufactured design release without approved legality checks.

---

# 3. Flagship I — ORACLE: Autonomous Experiment Scientist

## 3.1 Problem and objective

CFD, machining and track tests consume different amounts of time and money. Testing every possible combination of wing angle, body taper, section height, wheel arrangement and fillet radius is infeasible. ORACLE proposes the *most informative next action* for improved **race-time performance within legal, physical and financial constraints**.

## 3.2 Core capabilities

1. Start with one parameterized car family and four to six continuous CAD variables. Reduce the count if the experiment budget cannot resolve their effects. Record units, bounds and geometry validity checks.
2. Store experiments, failed runs, approvals, actual costs and observations against exact design revisions. Use one primary fidelity for the initial surrogate.
3. Reject duplicate candidates, invalid geometry and known rule violations. Route unresolved requirements to review before release or manufacture.
4. Recommend the next CFD experiment using expected improvement in race time derived from the shared aerodynamic GP and a frozen TITAN model under Section 3.3. Apply known geometry constraints as hard checks; retain source aerodynamic outputs and the objective configuration.
5. Display the reason, expected improvement, uncertainty, estimated cost, constraints and approval state. Stop at budget/deadline limits or inadequate model validity.
6. A student approves each bounded experiment. The solver adapter records execution and the system imports, scores and versions its result.
7. Compare against a seeded Latin hypercube sampling baseline under the same total resource budget, including initial samples and failed runs. Preserve negative results.

## 3.3 Initial algorithm and autonomy contract

Use SciPy Latin hypercube sampling for the initial design and **[Ax](https://ax.dev/)** (Meta's adaptive-experimentation platform, BoTorch/GPyTorch backend) for the shared aerodynamic Gaussian Process, trial bookkeeping, parameter constraints and generation. Ax records every trial, its status (including failures) and the model state, which replaces hand-written experiment tracking. AETHER owns training, applicability checks and validation; ORACLE consumes the same model ID and report. Define the aerodynamic output and operating-condition inputs before training: start with drag force or CdA; extend outputs only if the physical model needs them and data support them.

Evaluate posterior aerodynamic samples through a frozen TITAN model/configuration to obtain sampled travel times. Maximize expected improvement in negative travel time within deterministic feasible bounds. Pin the TITAN model ID, propulsion/friction assumptions, uncertainty policy, random seeds and objective transformation for each optimization campaign; a recalibration creates a new campaign and cannot silently change historical rankings. With speed-dependent aerodynamics, sample a consistent aerodynamic response over speed rather than unrelated independent values. Aerodynamic posterior uncertainty is model-dependent and does not automatically represent calibrated physical-time uncertainty.

Use Ax's default log-EI acquisition through its BoTorch backend, with a noisy-observation formulation when the declared observation model warrants it; verify the composed objective on reference cases. Record the Ax/BoTorch versions, preprocessing, noise assumptions and generation settings.

Apply known parameter bounds, computable inequalities and geometry checks as hard feasibility conditions. Unknown solver or manufacturing feasibility remains unresolved and subject to review; failures stay in the dataset with their status. Add probabilistic outcome constraints only after a separately validated feasibility model exists. Do not require a new classifier for the initial release. Candidate recommendations remain predictions; measured racing improvement requires track evidence.

Implementation references: [Ax documentation](https://ax.dev/docs/) and [BoTorch objectives](https://botorch.org/docs/v0.16.0/objectives). Pin versions before use.

### Composite-objective execution decision

For the initial release, evaluate acquisition over a seeded, bounded candidate set that passes deterministic checks, using the frozen SciPy TITAN reference and fixed Monte Carlo samples. This avoids assuming automatic differentiation through `solve_ivp`. Record candidate-set construction, sample count, evaluation runtime, failed/non-finishing trajectories and the no-feasible-candidate outcome. Reject unsupported objective evaluations with a reason; never turn a non-finish into a plausible travel time. Report that search is limited to the candidate set, not globally optimal over the continuous space.

Define the incumbent in the same negative-travel-time objective space as posterior samples; for a noisy incumbent, use a sampled baseline rather than best observed drag.

**Primary solver decision for Gate 1:** run a pinned OpenFOAM release locally on the team's Mac through [OpenFOAM.app](https://github.com/gerlero/openfoam-app), using one versioned case template (snappyHexMesh + simpleFoam) driven from Python with [foamlib](https://github.com/gerlero/foamlib). Every tool in this path is free and open source; no cloud or paid service is required. Automation includes approved CAD generation, meshing, solving, force extraction and result ingestion. A student still authorizes compute and reviews quality failures.

If the team cannot operate and validate that pipeline within the Gate 1 budget, use its available Autodesk CFD workflow and label it **human-executed experiment loop**: ORACLE recommends, a student queues the run, and the result returns through a validated import. Record the chosen path before the benchmark. Autodesk cross-checks are optional and excluded from the primary training dataset unless correspondence is established.

**Autonomy labels:** `recommendation_only`, `human_executed`, or `approved_automated_simulation`. Record the actual label on each experiment. Physical testing, machining and official sign-off remain human activities. No standalone chatbot or general-purpose agent is required.

Mixed categorical search, diverse batch acquisition, multiobjective hypervolume optimization, learned cost scheduling and multi-fidelity acquisition belong on the research roadmap.

## 3.4 ORACLE example user story

“Two concepts are predicted within a few milliseconds of each other. ORACLE sees that front-wing response is under-sampled and recommends an additional refined CFD experiment at a specified legal geometry. The CFD result reduces posterior uncertainty, changes the preferred design, and produces a traceable reason for the change.” All figures in UI demonstrations must be tagged `illustrative` until the team has real data.

## 3.5 Technical completion criteria

- Reproduce identical experiment proposals given a pinned dataset, model version, search space, random seed and acquisition configuration.
- Reject known illegal or unbuildable geometry before experimental approval; display unresolved requirements and require human review. Candidate approval does not certify physical legality.
- Provide both model uncertainty and observed validation error; flag unreliable regions.
- In repeated budget-matched trials on a frozen validation objective, show comparative performance against baseline search; publish failures too.
- Every suggestion displays `reason`, `expected benefit`, `cost`, `uncertainty`, `constraints`, `evidence`, `approval state`.

---

# 4. Flagship II — AETHER: Aerodynamic Design Engine

## 4.1 Geometry pipeline

**Primary source:** teammate's native CAD model or STEP export where editable parameters exist; a GLB is display-only. Use FreeCAD Python automation if the native model exposes usable parameters; otherwise reconstruct a controlled subset in build123d. Do not maintain two independent generators for the same study. Export the CFD surface as STL from the canonical solid for snappyHexMesh, plus glTF/GLB for browser rendering. Maintain one canonical geometry definition per study to avoid CAD drift.

**Geometry adapter:** support imported STEP/FCStd and manually associated semantic parts; if a teammate only exports STL or GLB, rendering works but direct parametric shape editing and exact checks may require reconstruction. A mesh viewer does **not** preserve a CAD constraint/feature tree.

**Validation:** watertightness where relevant; bounding envelope; valid solids and Boolean operations; geometry intersections; minimum feature sizes; component reference frames; body/wing clearances; manufacturability margins. Save exact model hash and meshing input ID.

### 4.1a Integration contract and reuse check

At G1, record coordinate axes, origin, SI conversion, component/boundary names, topology-change handling and export tolerances. Use one versioned CFD template defining domain, fluid properties, ground/wheel treatment, operating conditions, turbulence/wall model and reference quantities. The aerodynamics lead sets documented mesh-quality, residual and force-stability thresholds before production runs; preserve rejected meshes and logs rather than bypassing gates.

**Case template:** keep one versioned OpenFOAM case template per study (domain, boundary names, snappyHexMesh settings, simpleFoam setup, `forces`/`forceCoeffs` function objects). Python (foamlib) writes parameters, launches meshing and solving, and reads forces. Validate at G1 that boundary names survive a geometry change and that forces are stable. [CfdOF](https://github.com/jaheyns/CfdOF) is optional: use its FreeCAD GUI to author the first template only if it works on the Mac (its macOS support is not widely tested); it is never required at run time.

### 4.1b Coordinate, identity and host contract

At G0/G1, fix origin, forward/lateral/vertical axes, handedness, native units, ground plane, wheel axes and the source-to-engineering transform. Store coordinate transforms with artifacts; distinguish point, direction and unit conversion so imported forces are rotated/scaled correctly. Test an asymmetric reference shape and known force direction. Hash the actual meshing input as well as the display asset. Semantic component IDs must not depend solely on changing face indices; flag `semantic_mapping_unresolved` when mapping fails.

Record the actual CFD host (Mac model, chip, RAM), OpenFOAM.app release, FreeCAD/build123d version and Python environment. Test installation, one parameter change, boundary identity and force extraction on that host. OpenFOAM is GPL-3.0; run it as a separate process.

## 4.2 Fidelity labels (distinct from delivery tiers)

- **Fidelity F0:** quick geometry analytics and dimensional estimates, **not CFD**.
- **Fidelity F1:** coarse or simplified solver cases, lower-cost exploratory approximations with tagged fidelity and known error.
- **Fidelity F2:** sufficiently resolved CFD with documented computational domain, boundary conditions, fluid properties, turbulence model, wall treatment, convergence history, mesh sensitivity and force coefficients.
- **Fidelity F3:** selective experimental/physical validation, where appropriate equipment and measurement quality exist.

The release uses a resolved primary CFD configuration plus mesh-refinement cases for verification. These fidelity labels classify evidence; they do not require four integrated modelling pipelines.

### 4.2b Execution host and low-cost run settings

**Host:** the team's Mac, fully free. Install OpenFOAM with `brew install gerlero/openfoam/openfoam` (OpenFOAM.app). One command (`daedalus cfd run <design_id>`) writes the case, meshes, solves and imports forces; batches run unattended overnight in a queue. Runtime is accepted as the cost of zero spend. If OpenFOAM.app fails at G1, fall back to the official OpenFOAM Docker image on the same Mac. No paid cloud or public-project free tier is used.

**Low-cost settings (validated, not assumed):** half-model symmetry at zero yaw; steady incompressible RANS (simpleFoam, k-ω SST); potential-flow initialisation or mapping from the nearest previous run; one medium mesh justified by the Section 4.2a grid study; stop on force-coefficient convergence rather than a fixed iteration count. Finer meshes are used only for grid verification and finalist confirmation.

**Develop once, campaign later:** build and test the entire pipeline, all workspaces and the ORACLE loop against one real baseline run plus labelled synthetic data. Launch the full CFD campaign only after the pipeline passes G1 checks, so every production run comes from the final, frozen pipeline.

**Solvers:** use the single primary solver selected under Section 3.3. Record the OpenFOAM distribution and release or Autodesk version, execution mode and automation limits. Require mesh refinement, force stability and conservation checks appropriate to the case. Cross-solver comparison is optional; DAFoam and OpenMDAO remain roadmap work.

### 4.2a Grid verification procedure

For a representative baseline case, the aerodynamics lead runs at least three systematically refined meshes with comparable geometry, boundary conditions, solver settings and wall-treatment intent. Record mesh sizes/refinement ratios, iterative convergence, force stability and the quantities of interest. Check whether refinement supports an observed convergence order and an asymptotic-range assessment before applying Richardson extrapolation and reporting a Grid Convergence Index (GCI).

If convergence oscillates, diverges or does not support the procedure's assumptions, publish the mesh results and unresolved numerical sensitivity; do not force a GCI estimate. Recheck representative finalists or changed flow/geometry regimes rather than assuming one baseline study verifies every candidate. Track iterative, discretization, input and model-form uncertainty separately where estimable; label unquantified sources. Distinguish these from surrogate, propulsion/track and measurement uncertainty downstream. Combine sources only with justified dependence assumptions; do not use naive quadrature as a default. GCI addresses discretization uncertainty and does not establish physical accuracy or total uncertainty.

Procedure reference: NASA/NPARC, [Examining Spatial (Grid) Convergence](https://www.grc.nasa.gov/www/wind/valid/tutorial/spatconv.html). Record the selected implementation and assumptions in the run manifest.

## 4.3 Physical modelling caveats

STEM Racing uses a short accelerating run, so steady fixed-velocity CFD must be translated cautiously into a speed-dependent force relationship. Investigate wheel rotation, ground proximity, track tether interaction, lift/downforce effects on wheel loading, yaw sensitivity and changing Reynolds number if they can materially affect ranking and are computationally feasible. Do not infer that a static CFD drag coefficient predicts actual elapsed time alone.

CFD outputs store actual **force** and reference values; `C_dA = 2F_d/(ρv²)` only when the definitions, reference speed and force direction are coherent. Avoid treating aerodynamic drag/lift at one operating point as constant over all speeds without validation.

### 4.3a Bounded speed-sensitivity study

Before scaling the candidate sweep, compare the baseline and one consequential alternative at three to five nonzero speeds spanning the estimated race-speed envelope. Declare speeds, force/reference definitions, boundary treatments and a decision threshold before inspecting results. Record ground/wheel assumptions; introduce moving-ground or rotating-wheel treatments only where appropriate to the physical setup and test their influence within the study budget.

Fit or interpolate CdA(v) only within the sampled range and propagate its uncertainty through TITAN. Compare candidate ordering and predicted time differences against the frozen single-speed approximation. If the difference exceeds the predeclared engineering threshold or reverses the ranking, adopt the speed-dependent representation and budget any needed extra samples. Otherwise retain the simpler approximation with the tested domain and sensitivity limits. This study does not establish that steady CFD captures all acceleration effects.

## 4.4 Outputs and visual representations

- A 3D vehicle viewer linked to part hierarchy and selection.
- Preprocess real solver outputs in ParaView. Export decimated surface GLBs with scalar colours and precomputed streamline geometry for the shared Three.js viewer. Preserve scalar units, ranges, legends, operating conditions, geometry/run hashes and preprocessing settings; retain raw fields for quantitative inspection. Static images/video from those same runs provide the offline fallback.
- Force history, residuals, mesh resolution comparison and operating-condition matrix.
- Drag/lift/side-force response surfaces with applicability-domain shading.
- Side-by-side candidate overlays and shape-difference map, with geometry registration.

### 4.4a Component force accounting

Extract pressure and viscous force vectors for versioned, non-overlapping semantic surface groups such as body, wheels and supported wings. Use the pinned solver's force integration, including OpenFOAM `forces` function objects per patch group where supported; validate the alternate solver import rather than inventing unavailable breakdowns. Store patch membership, component IDs, density/pressure conventions, coordinate frame and averaging interval. Include an explicit unassigned group for remaining vehicle patches.

For the same case, compare the sum of component forces with the independently extracted whole-vehicle force within a declared numerical tolerance. Flag overlaps, omissions, unresolved semantics or inconsistent averaging; a failed sum check prevents a trusted breakdown. Account separately for any non-surface contribution included by the solver. Show signed component bars and pressure/viscous splits in Simulate, linked to surfaces and raw histories. These forces describe contributions in the assembled flow, not isolated causal effects of removing a component.

Reference: [OpenFOAM forces documentation](https://doc.openfoam.com/2306/tools/post-processing/function-objects/forces/forces/). Pin syntax and supported contributions to the selected distribution/release.

### 4.4b Virtual tunnel run sheet

Reuse the existing job system for a declared, versioned operating-condition matrix. Start with the required speed study; permit yaw and ground-clearance/wheel-condition variants only when the physical setup and engineering question justify them. A clearance change must correspond to a valid geometry/setup revision, not an unsupported runtime slider.

Before approval, preview Cartesian-product case count, bounds/units, estimated compute/storage cost and remaining budget. Each case retains design, condition, mesh/configuration IDs and its own quality status. Deduplicate identical case manifests, support cancellation and explicit bounded retries, and leave failed/missing cells visible. Summarize forces, quality and cost in one run-sheet table; never fill missing cells with unlabeled interpolation. Expanding sweep dimensions requires a new budget approval. This adds bounded campaign automation, not a second solver or a new search engine.

### 4.4c Virtual Wind Tunnel Studio and flow investigations

Make the **Virtual Wind Tunnel Studio** the primary experience inside Simulate. Place the selected car and domain in the main viewport, approved case conditions and run controls beside it, and force/quality results below or in an inspector. Support viewport maximization, component isolation, matched-condition A/B views, run-sheet selection and direct navigation to mesh/convergence evidence. A parameter edit previews geometry; requesting CFD creates an approved asynchronous job. Cached results and surrogate estimates retain distinct labels and design/run IDs.

The core display includes actual surface pressure, solver-derived streamlines, total/component forces, mesh-quality evidence and a bounded set of precomputed velocity/wake slices when the run contains the required fields. Store slice origin/normal, upstream reference speed, sampling/interpolation settings, time/iteration, units and field hashes. Define wake deficit against the declared reference velocity and retain signed values; missing volume fields produce an unavailable state rather than invented airflow. Preprocessing in ParaView exports lightweight slice meshes/images and streamline geometry for the existing viewer and offline bundle. Arbitrary live slicing and full volume rendering remain Tier 2.

Pressure coefficient displays must define reference pressure, density and speed and distinguish physical from kinematic pressure. Near-wall/shear displays require the relevant fields and documented wall-treatment applicability. Keep these advanced diagnostics Tier 1 after basic fields and force quality are established.

Vortex investigation is a conditional Tier 1 diagnostic: compute an explicitly defined indicator such as vorticity or Q-criterion from the actual velocity field; record units, derivative method, thresholds and mesh sensitivity. A coloured isosurface alone does not establish resolved transient vortices or improved performance. Expose unavailable/unreliable states and preserve any coarse-resolution limitation. Use precomputed assets before proposing a hosted scientific renderer.

Post-processing reference: [ParaView filtering documentation](https://docs.paraview.org/en/latest/UsersGuide/filteringData.html). Verify exported numerical/visual consistency against the raw case and pin the processing version/settings.

## 4.5 Acceptance evidence

CAD-to-mesh-to-solver-to-forces must run reproducibly on at least one representative legal parameterized case, with mesh/convergence evidence and a comparative experimental plan. Keep failure logs rather than hiding nonconvergent cases.

---

# 5. Flagship III — TITAN: Physics-Calibrated Race Digital Twin

## 5.1 Minimum governing model

Let `x(t)` be track distance, `v = dx/dt`, and `m_eff` effective inertial mass (include rotating wheel inertia where material):

`dx/dt = v`  
`m_eff * dv/dt = F_prop(t, x, v, state) - 0.5 * rho * v^2 * CdA(v, orientation) - F_roll(v, load) - F_tether(v, geometry) - F_other`.

Integrate to the **officially defined timing endpoint** under the competition's applicable start/end conventions. Treat human reaction as a separately reported variable unless the official measured metric demonstrably includes it.

### 5.1a Model hierarchy and complexity checks

| Model | Included terms | Role |
|---|---|---|
| M0 | Constant acceleration | Analytic baseline and simple prediction comparator |
| M1 | Time-varying propulsion, measured mass and a declared mass-history assumption | Propulsion baseline |
| M2 | M1 plus aerodynamic drag and bounded rolling resistance | Main engineering candidate |

Fit on calibration data and compare frozen versions on the same held-out protocol. Report added parameters, correlations, identifiability and numerical sensitivity. Select added complexity for demonstrated predictive benefit or a justified physical requirement; report inconclusive comparisons. Test timing conventions, launch transient assumptions and work/energy consistency using reference cases appropriate to each model.

## 5.2 Measurement and parameter identification

- Input mass from measured assembled car; measured centre of mass and wheel geometry where useful.
- Propulsion may be a measured/reconstructed thrust curve or bounded approximation; an 8 g label alone does not supply force-vs-time.
- Bearing/rolling and guide/tether friction should be experimentally bounded rather than tuned arbitrarily to fit one run.
- Calibration parameters need identifiability checks: two different forces can explain the same elapsed time. Prefer velocity splits/high-speed video or repeated runs in distinct controlled conditions if available.
- Maintain separate calibration and held-out validation runs by car/configuration/time.

## 5.2a Measurement acquisition and identification gate

The core evidence plan includes a supervised, reviewed thrust-measurement setup and a video-tracking script for distance/velocity observations. Existing suitable measurement equipment may satisfy the thrust requirement. Log sensor calibration, fixture/configuration, sample timing, units, cartridge batch, raw signals, synchronization and uncertainty. The team must approve the physical test procedure and suitable equipment before acquisition; this specification is not a hardware construction procedure.

Record runs with high-frame-rate phone video (240 fps or better) and a measured distance scale in frame. Track position with **[Tracker](https://physlets.org/tracker/)** (Open Source Physics video analysis, free) and export its CSV; an OpenCV script may automate repeat tracking once Tracker results validate it. Retain original footage, tracking choices, position traces and uncertainty. Differentiated velocity/acceleration must show filtering choices and noise sensitivity. Photogate splits can supplement the video. A load cell with an HX711 amplifier and microcontroller logger is a suitable low-cost thrust setup if supervised and approved. Import CSV/JSON into Daedalus X; automated device control and live sensor streaming are outside the release.

Collect repeat traces and repeated baseline races to estimate variation. One trace demonstrates acquisition, not sufficient calibration or statistical power. If propulsion and friction remain unidentifiable, report parameter bounds and collect a discriminating measurement rather than fitting arbitrary forces to elapsed time.

### 5.2b Physical-build confounding

Record physical build, body, wheel/axle set, alignment, setup revision and independent friction/coast measurements where available. Choose feasible controls such as repeated nominal builds, controlled wheel/axle swaps or blocked tests before collecting outcomes. Preserve setup changes and build dependencies in the protocol. If each design has only one build and effects cannot be separated, report a difference between those tested builds, not an isolated geometry effect; repeated races of one build do not supply independent manufacturing replication.

## 5.3 Prediction outputs

Predicted car travel time and interval; speed and acceleration profile; peak speed; contribution of force terms; sensitivity per design variable; parameter/posterior uncertainty; validation error; observed racing time; and potentially a human reaction-time distribution kept separate.

### 5.3a Monte Carlo uncertainty propagation

Propagate declared thrust, rolling/friction and relevant launch-condition variation through the frozen TITAN model using existing NumPy/SciPy tools. Keep human reaction separate unless the official metric includes it. Record input sources, distribution assumptions, dependence/correlations, parameter bounds, model IDs, seeds and sample count. Preserve aerodynamic posterior dependence over speed when included. Distinguish variability between physical runs from uncertain model parameters and disclose which sources remain unquantified.

Check time quantiles and estimated probabilities for Monte Carlo stability as sample count increases, with a stated tolerance and sampling error. Report non-finishing and invalid trajectories separately; do not silently drop them or replace them with finite times. Show conditional finish-time summaries alongside finish probability when relevant. Synthetic/assumed distributions produce illustrative or scenario outputs, not calibrated physical confidence claims. Validate prediction intervals on independent races. Race-day win-probability strategy remains outside the core until the event format and inputs support it.

## 5.4 Rigorous validation

- Solve limiting analytic cases (constant thrust/no losses, constant deceleration, zero thrust) and numerical stability tests.
- Check SI units with Pint; benchmark integration step/error tolerance.
- Calibrate only on training data; calculate MAE/RMSE and interval coverage on genuinely held-out runs.
- Report residuals by track condition, cartridge batch, wheel/bearing setup and model revision where data permit.
- Guard against “calibration leakage”: never tune against a hidden validation set or silently retroactively overwrite old predictions.

---

# 6. Flagship IV — FORGE: Manufacturing Intelligence and Digital Scrutineer

## 6.1 Two different truths

- **Design compliance:** what nominal CAD geometry predicts against machine-encoded requirements.
- **Manufactured compliance:** what measured, actual, fully assembled physical parts demonstrate under official methods.

They must have distinct badges and approval gates. CAD compliance never guarantees scrutineering acceptance.

## 6.2 Rule engine

Each requirement includes `rule_id`, revision, verbatim official text location, class, measurement method, geometric referent, unit, min/max/exact or nonnumeric condition, severity/penalty if given, tolerance/measurement interpretation, evidence file ID, status and human reviewer. Implement deterministic checks for explicit computable rules; defer subjective or procedural rules to human verification. Never fabricate penalty points.

States: `pass_measured`, `fail_measured`, `pass_cad_only`, `at_risk`, `manual_review`, `not_tested`, `not_applicable`, `rule_ambiguous`. A “green” overall sign-off requires the applicable official verification route, not the number of green widgets.

## 6.3 Measurement capture

Track part and build IDs, instrument/calibration date and resolution, operator, temperature where relevant, units, repeated readings, measurement locations and actual measured dimension. Distinguish repeated **readings of one part** from repeat manufactured **parts** and measurement-system error. Preserve raw readings.

## 6.4 Statistical layer

- Start with worst-case margins and observed measurements.
- Fit process distributions only with an appropriate independent batch and a justified distribution choice.
- Correlations between features can invalidate naive multiplication of independent pass probabilities; use a joint model or report only bounded/unknown aggregate risk.
- Report estimate uncertainty (sample size and confidence/credible interval), not invented precision.
- Defer process capability indices, fitted aggregate compliance probabilities, gauge R&R studies and scan-based deviation maps to the research roadmap. Retain instrument uncertainty and repeated raw readings in the core.

## 6.5 Manufacturing feedback

Compare measured dimensions against nominal CAD and show systematic deviations with sample size and uncertainty. A student/manufacturer reviews process decisions. Automatic geometry compensation and G-code generation are outside the nationals release.

## 6.6 Deliverables

A release-ready scrutineering evidence pack: rules-to-components map, measured margins, inspection photos, exceptions, known risks, revision trace and sign-off. Interactive clickable 3D highlighting is a viewer aid, not a legal determination.

---

# 7. Flagship V — ATLAS: Engineering Evidence and Decision Cockpit

## 7.1 Design goal

A high-end engineering instrument, visually closer to professional motorsport telemetry and digital engineering software than a generic school project website. *Every attractive visualization must correspond to a real engineering state.* Judges must understand the system in 60 seconds and be able to challenge it for 10 minutes.

## 7.2 Visual design system

- **Visual language:** restrained motorsport engineering UI. Graphite/near-black backdrop with neutral elevated panels, off-white typography, a single electric-cyan interaction accent and amber/red reserved for unresolved risk/violations. Dark theme only; print-safe evidence exports.
- **Typography:** legible technical sans-serif; tabular numerals for timing, mass and coefficients; code/monospace only for IDs and snippets. No overlaid decorative unreadable HUD text.
- **Information hierarchy:** 3D car and current design status as primary, decision-changing metrics next, derivation/evidence one click away.
- **Motion:** smooth camera/part transitions, 150–250 ms interaction response targets for cached changes; reduce-motion mode; never animate a simulation that has not actually run.
- **Semantic palette:** measured, simulated, surrogate-predicted, estimated, example and missing need distinct consistent labels; colors alone are insufficient.
- **Desktop-only:** 1440 px competition booth display; workable laptop 1280 px; support offline without network fonts or CDN dependencies.

## 7.3 Six workspaces in one application

| Workspace | Integrated responsibilities | Main capability |
|---|---|---|
| Design | Canonical CAD import/generation, supported parameters, component selection, revision comparison and geometric preflight | AETHER |
| Simulate | Approved CFD jobs, configuration, mesh/convergence review, forces and real field visualization | AETHER |
| Optimize | Objective and bounds, budget, next-experiment recommendation, approval, candidate comparison and benchmark | ORACLE |
| Race | Propulsion/velocity imports, dynamics, uncertainty, sealed predictions and held-out scoring | TITAN |
| Inspect | Official requirement sources, build measurements, CAD-only/measured/manual states and release review | FORGE |
| Evidence | Revision history, experiment notes, raw artifacts, predictions, decisions, validation and exports | ATLAS/shared |

A persistent header holds project, design revision, build, evidence status and job progress. Each workspace uses the same entity IDs and links. A run/status panel exposes logs and import failures; project setup holds rulebook, units and resource limits. Competition Mode saves scenes from these same records.

## 7.4 Shared interactions

Select a component to inspect its parameters, CFD evidence, measurements and applicable rules. Compare two exact revisions using linked views and plots. Click a metric for its units, equation, uncertainty and source IDs. Show why an experiment changed a decision, including rejected options and failed runs.

Retain hypotheses, procedures, observations and conclusions as experiment notes in Evidence. No separate notebook product is required. Use 2D plots by default and 3D fields where spatial information matters.

## 7.5 UI and visualization implementation

Use Next.js/React/TypeScript, Tailwind and accessible Radix/shadcn primitives, ECharts for linked plots, and React Three Fiber/Three.js for the common 3D panel. Use TanStack Query for server state and a small shared selection state. Validate contracts with Zod/generated API types.

Ship a fixed professional layout with useful panel resizing, viewport maximization and saved presentation scenes. Fully dockable layouts and arbitrary workspace customization remain roadmap work.

Pre-bake CFD assets in ParaView and load lightweight, versioned GLBs in the shared viewer. Preserve raw solver fields and scalar metadata; coloured geometry is a presentation asset, not a substitute for numerical data. Streamlines require actual solver-derived trajectories. General volume rendering, live slicing and trame/VTK.js hosting are deferred until a demonstrated engineering need justifies their cost. Cached images/animations remain available offline.

Keep rendering behind the shared workspace context so a future specialized CFD renderer can coexist without another application. Avoid a browser CAD editor, decorative synthetic airflow or a separate competition dashboard.

---

### 7.6 Workspace interaction and failure contracts

| Workspace | Must-work interaction | Required failure/empty state |
|---|---|---|
| Design | Change a supported parameter, preview and commit a new revision | Static STEP import explains missing parametric features; failed semantic mapping blocks unsupported checks |
| Simulate | Compare two cases with aligned views and a common scalar scale | Show quality rejection, logs and raw sources; completed execution alone is not scientific acceptance |
| Optimize | Inspect why a candidate was selected and approve bounded work | Show domain, budget, objective failure and no-feasible-candidate states |
| Race | Align prediction/measurement by matching timing conventions | Missing thrust data shows explicit bounded assumptions and validation limits |
| Inspect | Select a rule and inspect separate nominal/measured evidence | Ambiguous, unsupported or unmeasured requirements retain review status |
| Evidence | Trace a decision to raw sources and export the selected records | Missing/corrupt sources block the unsupported claim and offer an honest cached fallback |

Use a persistent project/rulebook/design/build strip, shared entity selection, linked chart cursors, aligned A/B cameras and an evidence drawer with source IDs, units and equations. Support keyboard navigation, visible focus, text-plus-colour statuses, reduced motion, chart summaries and readable/zoom-safe legends. Undo applies to uncommitted input; committed evidence keeps immutable history.

Measure offline cold start, first usable render, memory/browser behaviour and fallback/reset on the actual event computer. Test missing/corrupt assets, keyboard operation and representative laptop/projector layouts. These are G5 checks, not new workspaces or arbitrary docking requirements.

---

### 7.7 Integrated comparison, telemetry and campaign browsing

**Race channel viewer:** show measured thrust, position/video-derived velocity, model predictions and residuals with a shared cursor and linked range selection. Choose time or distance as the alignment basis and expose clock offsets, start definition, interpolation, filtering and units. Retain original samples, do not extrapolate missing channels, and do not imply simultaneous acquisition across different tests. Two-run delta traces require a declared reference and compatible alignment; curves differentiated from video retain noise warnings.

**Evidence correlation view:** compare compatible CFD, surrogate, TITAN and physical observations with source IDs, units, operating conditions, error bars and residuals. Add coast-down channels only when recorded. Treat drag-versus-race-time comparisons through the frozen physics mapping rather than subtracting incompatible quantities. Distinguish a held-out evaluation from calibration and exploratory comparisons. Baseline compatible-data/residual views are core; automated disagreement detection and expanded design-delta inference stay Tier 1. Make this view available in presentation scenes using the same records.

**Campaign/run browser:** filter existing records by campaign, design/build revision, conditions, solver/model version, provenance, scientific quality and job state. Compare selected runs with cost, warnings and applicability visible; trace dependencies and show which analyses are stale for the selected revision. Keep failure and partial-result records discoverable. Use the existing evidence store, not a new experiment-tracking service.

---

### 7.8 Named experiences and Competition Mode

The **Virtual Wind Tunnel Studio** (Section 4.4c) lives in Simulate, the race channel viewer in Race and the correlation view in Evidence; these are names for views in the existing workspaces, not separate engines or dashboards. A replay cursor may place a car only where the selected trace supplies that state. Offer design-, simulation- and judging-focused presets on the fixed layout.

Competition Mode is a read-only curated scene playlist over a frozen evidence bundle, with a short introduction, longer source drill-down, offline reset and static fallback. It keeps provenance labels visible.

**Public naming:** ATLAS is an internal name; review possible confusion with the existing [ATLAS motorsport product](https://docs.atlas.mclarenapplied.com/introduction/) before public branding.

---

# 8. Release stack and tool ownership

| Responsibility | Release decision | Boundary |
|---|---|---|
| Geometry | FreeCAD Python or build123d, selected at Gate 1; STEP/native source, GLB for display only | Existing native CAD preserved; no competing canonical generators |
| Solver | OpenFOAM via OpenFOAM.app on the team Mac, driven by foamlib; Docker image fallback | One primary solver and fidelity; zero paid services |
| Meshing | snappyHexMesh in the versioned case template | Mesh-quality and refinement evidence required |
| Post-processing | ParaView offline export | Raw forces/fields retained; cached GLB/images for browser |
| Experiment selection | Ax (BoTorch GP + log-EI) + frozen TITAN candidate-set objective | Hard geometry constraints; SciPy LHS baseline; Section 3.3 owns the contract |
| Race physics | Python + SciPy solve_ivp | Analytic reference tests, calibrated inputs, held-out scoring |
| Units and contracts | Pint, Pydantic, generated OpenAPI types and Zod | Explicit units and provenance on import |
| API and jobs | FastAPI, local durable job table, isolated solver process | Logs, cancellation, bounded retries; no distributed platform |
| Storage | SQLite + content-addressed local artifacts | Backups and immutable run manifests |
| Frontend | Next.js + TypeScript | One application, six workspaces, offline presentation |
| Visualization | Three.js/React Three Fiber + ECharts | One selection context and linked plots |
| Inspection | Python checks + human review | Sourced requirements; measured and CAD-only states distinct |
| Verification | pytest and browser checks for scientific/import/core workflows | Pin dependencies and run reference cases |
| Evidence export | CSV/JSON and printable evidence views | Auto-generated portfolio report is Tier 1 |

Use a single host first. Solver execution may live on a CFD-capable machine, but service boundaries are code boundaries until deployment requires separation. No standalone AI assistant, unrestricted agent, Kubernetes, authentication service or multi-user system belongs in the initial release. A local deployment still needs path validation, bounded jobs and protected raw evidence.

Review licenses for pinned components before distribution. Upstream links below are inherited research references, not a new verification of compatibility or license terms.

# 9. Core domain model and data contracts

All outputs are linked with immutable IDs. Minimum logical entities:

| Entity | Mandatory fields | Relationship |
|---|---|---|
| Project | project_id, team, competition_class, date | owns studies |
| Rulebook | rulebook_id, origin, class, revision, effective_date, source_hash | owns individual rule tests |
| Design | design_id, parent_design_id, geometry_hash, CAD_source, parameters, units | produces artifacts and simulations |
| Component | component_id, design_id, semantic_name, datum/coordinate frame | maps rules to geometry |
| Experiment | experiment_id, hypothesis, input_design, fidelity, protocol, budget, approval | produces observations |
| SolverRun | run_id, experiment_id, solver/version, mesh_id, boundary_conditions, convergence_status, artifacts | produces CFD data |
| Observation | observation_id, origin (`measured/simulated/predicted/estimated/synthetic`), value, unit, uncertainty, timestamp, source, protocol_id | feeds training/validation |
| PhysicalBuild | build_id, design_id, build_batch, manufacturing_route, deviations | produces measurements and track runs |
| Inspection | inspection_id, build_id, rule_id, instrument, raw_readings, operator, verdict | supports scrutineering |
| RaceRun | race_run_id, build_id, timing_definition, measured_time, conditions, calibration_split | supports physics validation |
| Model | model_id, training_data_hash, algorithm/config, validation_report, domain | generates predictions |
| Prediction | prediction_id, model_id, design_id, inputs, uncertainty, interval_definition, domain_status, sealed_at, manifest_hash | supports held-out scoring and decisions |
| ValidationProtocol | protocol_id, hypothesis, objective, split_ids, blocks, allocation_seed, planned_n, minimum_detectable_effect, analysis, success_threshold, frozen_at | defines comparison before outcomes |
| Acquisition | acquisition_id, protocol_id, build_id, instrument, calibration, raw_artifact_hash, timing, units, uncertainty | supplies thrust/video/split observations |
| Decision | decision_id, candidate_ids, accepted_id, rationale, supporting_ids, reviewer | freezes human choice |
| AIUseLog | event_id, tool/model, task, output, human_verification, accepted/rejected | supports transparency |

## 9.1 Minimum JSON shape (illustrative schema, not formal final API)

```json
{
  "design_id": "design_0007",
  "geometry_hash": "sha256:<digest>",
  "source_kind": "build123d",
  "parameters": [{"name": "front_wing_angle", "value": 4.0, "unit": "degree"}],
  "rulebook_id": "pending_official_rulebook",
  "origin": "synthetic",
  "evidence_status": "not_validated"
}
```

Every numerical record must declare units or be dimensionless. Every published metric defines its aggregation/window and uncertainty interpretation. A file hash identifies an artifact; it does not establish instrument provenance. Imported measurements require instrument, protocol, operator and raw-source metadata; a digital signature alone does not establish measurement quality.

## 9.2 Reproducibility contract

Inputs, solver and mesh settings, dependency versions, random seeds, data split definitions, CAD hashes, outputs and warnings are immutable per run. New calibrations create new model IDs, not silent updates to previously published predictions. Before a physical test, seal a prediction manifest containing model/data/config hashes, build ID, timing definition, expected time, interval level and interpretation, and analysis protocol. Export its hash and timestamp to a reviewer or independently retained record before outcomes become available; a local hash alone does not establish when a prediction existed. Corrections create a new record and preserve the original score. Support CSV/JSON/PDF exports and an offline static judging evidence bundle.

---

### 9.2a Dependency validity and backup

Retain immutable upstream IDs for geometry, rulebook, mesh, operating conditions, model, prediction and decision. Enforce referential integrity at import/commit; missing references prevent publication. A changed input creates a new revision. Existing results remain valid records of their original inputs but appear `stale_for_selected_revision` when incompatible with the current context; never relabel them as current. Compare dependency manifests rather than deleting history.

Back up the SQLite database and artifact folder together before each gate, with an independently retained copy of sealed predictions.

---

## 9.3 Shared artifact and evidence semantics

Use one artifact envelope with `artifact_id`, `kind`, `schema_version`, `source_entity_id`, `input_manifest_id`, content SHA-256, geometry/solver/config IDs where applicable, declared units, coordinate-transform reference, creation time and warnings. Examples are schema fixtures, never actual measurements. Validate imports, references and version compatibility; migrate supported old schemas explicitly and reject unsupported versions without altering raw files.

Keep independent fields for provenance (`measured/simulated/predicted/estimated/synthetic`), scientific acceptance (`pending_review/accepted/rejected/not_assessed`), job lifecycle, revision relevance and source integrity. Do not pack them into one status enum: a simulated result may be computationally successful, scientifically rejected and historical at the same time. Only acceptable, compatible observations enter the production aerodynamic training set; synthetic/reference datasets stay separate. An import label or generated inference cannot establish measured provenance.

AETHER owns geometry/CFD and the aerodynamic GP; TITAN owns race models and sealed predictions; ORACLE owns plans/selection using their frozen versions; FORGE owns sourced requirements, inspection and review; ATLAS reads, compares and exports their records. All use one project evidence store.

---

# 10. Orchestration, jobs and security

## 10.1 Service boundaries

- `web`: Next.js frontend and static evidence viewer.
- `api`: FastAPI endpoints for studies, designs, rules, model status and decisions.
- `engineering`: Python scientific service for geometry adapter, dynamics, surrogates, optimization and inspections.
- `simulation-runner`: isolated on a CFD-capable host, executes pinned solver templates after human-approved configuration; stores artifacts.
- `data`: SQLite + content-addressed artifact folder; optional lightweight job table.

**No immediate need** for Kubernetes, distributed event streaming or microservice proliferation. Slow jobs require durable job state, cancellation, logs and retries even if the first deployment uses one local queue/process. Do not run expensive CFD inside a web request thread.

### 10.1a Durable job lifecycle

Use persisted states `queued → running → succeeded | failed | cancelled`. On cancellation, stop the solver process and keep logs; on restart, mark lost jobs failed. Never label partial output successful, and keep solver completion distinct from scientific quality approval.

### 10.1b Adapter boundaries

Keep CAD build/export/inspection, CFD case/mesh/solve/extraction/quality review, race simulation/calibration/scoring/sealing and inspection import/review as explicit operations in the existing backend packages. Each declares typed inputs/outputs, units, failure states, idempotence behaviour and allowed artifact paths. Use isolated per-run working directories and preserve stdout/stderr plus manifests. Do not create wrappers, services or empty folders merely to mirror this list; reuse the selected libraries and keep one implementation per responsibility.

## 10.2 Safety boundaries for AI automation

AI may propose parameter changes, write draft code, query evidence and request allowed tools. It may **not** execute arbitrary shell commands from the browser, alter official raw measurements, sign scrutineering forms, machine parts or consume an uncontrolled compute budget. Use whitelisted tool schemas, workspace path validation, approval for expensive actions, isolated solver processes and explicit audit logs. Keep raw imported documents untrusted; they cannot override system behavior.

## 10.3 Performance targets (engineering goals, not promises)

- Fast cached candidate compare: typical UI update target below 250 ms on representative event hardware.
- Fast surrogate inference: aim below 1 s for an individual design including API/UI overhead; benchmark rather than assume.
- Heavy CFD: asynchronous with accurate status/logs and offline cached evidence. Do not fake real-time simulation.
- Competition Mode: launches offline; precomputes costly views; has an emergency static fallback, a 1-click reset and no untested software updates before judging.

---

# 11. Technical work packages and repository structure

```text
daedalus-x/
  apps/
    cockpit/                 # Next.js UI; design system, 3D and charts
    api/                     # FastAPI public API and local access boundaries
  packages/
    contracts/               # generated API/types, unit and evidence contracts
    ui/                      # reusable interface components and tokens
  engineering/
    geometry/                # build123d / FreeCAD adapters, semantic parts
    regulations/             # parsed rule assertions, manual review hooks
    aerodynamics/            # CFD exporters and post-processing
    dynamics/                # solver, calibration, test cases
    surrogates/              # GP model, applicability and CV
    experiment_design/       # acquisition, budgets and comparison baselines
    manufacturing/           # measurements and tolerance evaluation
    evidence/                # artifacts, lineage and reproducibility
  runners/
    cfd/                     # job templates, resources and health monitors
  data/
    example_synthetic/       # prominent synthetic watermark/metadata
    official_rules/          # sourced, versioned documents (access control)
  tests/
    unit/
    scientific_reference/
    contract/
    integration/
    end_to_end/
  docs/
    decisions/
    validations/
    competition/
    ai_assistance_log/
  scripts/
```

## 11.1 Initial APIs

- `POST /v1/designs` create validated design and geometry artifact.
- `POST /v1/designs/{id}/check` run deterministic geometry/rule preflight.
- `POST /v1/experiments/propose` return suggested and explicitly costed candidates.
- `POST /v1/experiments/{id}/approve` human approval of bounded job.
- `POST /v1/cfd-runs` enqueue one approved simulation.
- `GET /v1/cfd-runs/{id}` return state, health flags and immutable artifacts.
- `POST /v1/models/surrogate/train` create versioned trained model and CV report.
- `POST /v1/race/predict` deterministic/stochastic time prediction + trace.
- `POST /v1/measurements/import` validate and import observation batch.
- `POST /v1/validations/evaluate` produce held-out metrics.
- `GET /v1/rules/{rulebook_id}/assessment/{build_id}` measured and manual compliance states.
- `POST /v1/decisions` save reviewed comparative decision.
- `GET /v1/evidence/{entity_id}` provenance chain.

All long-running endpoints return a job identifier. Client-supplied evidence labels cannot upgrade `synthetic` to `measured` without a distinct, authorized import workflow.

---

## 11.2 Requirements handoff

Track agreed requirements with stable IDs (`REQ-O-001`, etc.) linked to owner, release tier, issue and test evidence. For each dependency, record pinned version, license, adopted responsibility and exit path. Admit new work only if it changes an engineering decision, reduces risk, satisfies an official requirement or makes real evidence clearer to judges, and assign its Section 13 tier first. Work in dependency order: evidence contracts and reference physics, canonical geometry and CFD, surrogate and ORACLE loop, physical validation, then linked views and offline rehearsal.

---

# 12. Scientific validation plan — the critical judging asset

**Every major innovation requires an experiment proving what it contributes.**

| Flagship | Hypothesis | Baseline | Experimental test | Required disclosure |
|---|---|---|---|---|
| ORACLE | It finds a better candidate or model with less budget | random/LHS and student-curated experiments | repeated budget-matched optimization runs on frozen objective | average, spread, runs, failed cases, selection bias |
| AETHER | A surrogate trained on the primary CFD configuration ranks unseen candidates within a predeclared error target | simple fit on the same data | held-out CFD comparisons, mesh-refinement checks, rank agreement | domain, mesh sensitivity, convergence, solver settings |
| TITAN | The calibrated physics model predicts unseen race times better than simpler model | constant-acceleration or initial physical baseline | time-split or build-split held-out races | MAE, RMSE, interval coverage, data volume |
| FORGE | Inspection/tolerance feedback reduces compliance risk or rework | nominal CAD checks only | repeated manufactured part measurements / blind inspections | sample size, instruments, dependencies, rule interpretation |
| ATLAS | Users can retrieve and audit linked engineering evidence | shared-folder workflow on the same task | exploratory timed retrieval/reproduction tasks with team members and available outside reviewers | task definitions, reviewer familiarity, participant count, bias; no broad efficacy claim |

Choose one primary ORACLE endpoint before the campaign: independently confirmed simulated race-time objective improvement, or held-out predictive-quality improvement. Declare the other secondary if evaluated; do not switch endpoints after results. The required optimizer comparator remains budget-matched LHS. Random/student-selected plans are optional additional baselines when fair resources permit; apply identical initial information and account for failures. No optimization metric substitutes for measured physical performance.

## 12.1 Scientific controls

- Register hypothesis, analysis protocol and success threshold **before** examining held-out outcomes.
- Reserve one locked test set, and report test-set reuse if a later revision uses it for decisions.
- Report uncertainty calibration, not just mean accuracy. An interval that misses actual outcomes repeatedly is not reliable.
- Where only a few physical runs exist, label findings exploratory and avoid confident inferential claims.
- Separate simulator success from actual physical-car improvement. A mathematically improved predicted time is **not** a racing result.
- Keep negative findings, failed solver runs and models abandoned due to bias or extrapolation.

## 12.2 Noise floor, power and track-test design

Run a repeated baseline pilot before selecting the improvement claim. Record cartridge batch, lane, session, environmental conditions, build and timing system. Estimate within-condition variation and timing/measurement uncertainty. Define the smallest engineering improvement worth detecting before the main comparison.

Use pilot variability to plan sample size and a minimum detectable effect at a declared significance level and target power (planning defaults: two-sided alpha 0.05 and 80% power, subject to a recorded protocol decision). Use simulation or a suitable paired/blocked calculation matching the planned analysis. A tiny pilot gives an uncertain variance estimate; report that limitation and sensitivity to variance assumptions. Distinguish this calculation from a guarantee of a positive result.

Randomize A/B order within matched lane/session/cartridge-batch blocks where feasible. Cartridge reuse is not a valid pairing; match independent runs by controlled conditions. Define exclusions and failed launches before testing, preserve raw runs, and report assigned and usable sample counts. Do not count video frames or repeat readings as independent races. If resources cannot detect the claimed millisecond difference, increase testing, target a larger effect or report an inconclusive comparison.

Keep calibration races separate from a locked test group. Seal predictions before viewing that group's outcomes under Section 9.2. Score the original predictions, then document any model revision against fresh held-out data. Report effect estimates and intervals as well as prediction errors; disclose stopping, exclusions and any reused test data.

ORACLE comparisons use repeated seeded trials and the same total simulation/time budget as LHS, including warm-up samples and failures. Choose the objective, resource accounting, evaluation pool and success threshold before running comparisons. An offline replay supports a benchmark claim only within that recorded dataset; a prospective approved experiment demonstrates the live loop. Keep physical performance claims separate.

### 12.2a Power-aware experiment display

For a proposed physical A/B comparison, ORACLE displays predicted time difference with model uncertainty, the pilot noise estimate and its uncertainty, planned independent runs/blocks, resource cost, minimum detectable effect, and power at the protocol's declared effect size. Keep model uncertainty separate from run-to-run variation. If inputs are insufficient, display `power_not_established` rather than a precise estimate.

When the current plan cannot resolve the target difference, offer a larger sample plan, a better-controlled measurement, an identification experiment or an explicitly exploratory comparison. Do not automatically reject an experiment solely because uncertainty is large: reducing that uncertainty may justify the test. A student approves the action under the existing budget. Keep this as a view of the registered protocol and existing power calculation; adaptive stopping and a new information-gain acquisition engine remain deferred.

### 12.2b Consequential design decisions

Target two or three real design decisions across the project. For each, preserve the original hypothesis, alternatives, pre-test recommendation and prediction, human choice, exact design/build IDs, experiments, measured consequences and uncertainties, and any subsequent change of mind. Include neutral or negative results and identify confounding changes. If only one decision has defensible evidence, report one; do not manufacture additional success stories.

Evidence and presentation mode use these records to explain how Daedalus X influenced the car. Compare with the team's prior choice where documented, without asserting that software caused a performance gain beyond what the experimental design supports.

### 12.2c Adaptive sampling and independent evaluation

Before acquisition, reserve a space-filling CFD holdout with immutable IDs and a declared domain. Exclude its outcomes from fitting, preprocessing choices, acquisition, stopping and model selection. Use training-only diagnostics for development and release the holdout for the prespecified evaluation. After exposure, preserve the score and identify it as consumed; later independent claims require fresh evaluation data. Report cross-validation on adaptive samples as secondary evidence with its selection limits. In offline optimizer replay, separate the candidate pool from this holdout.

Before physical comparison, confirm the selected finalist and its comparator using independently generated verification runs under a prespecified mesh/solver-quality procedure. Keep verification results outside selection training until the confirmation decision is recorded. Report whether apparent improvement shrinks, disappears or reverses; investigate discrepancies before claiming superiority. This reduces selection optimism but does not prove physical accuracy. Budget confirmation for both sides and record any subsequent reselection.

Name one primary physical comparison and its target effect. Label other comparisons exploratory or preregister a multiplicity procedure. Check timing resolution, calibration and repeatability against the target difference. Include sensitivity of sample-size plans to uncertainty in pilot variance rather than treating a small pilot variance estimate as exact.

## 12.3 Example of an acceptable judge-facing claim

“Across **N** previously unseen CFD configurations, surrogate absolute drag-force error was **X** [units] and interval coverage **Y%**. ORACLE selected **K** further runs, after which held-out error changed to **Z**. The chosen candidate then achieved a measured track time of **T** across **R** trials under documented conditions.”

The letters are placeholders. Only replace with evidence generated by the team. Do not invent statistics to complete a portfolio.

---

## 12.4 Automation savings

Only claim time savings if the team times comparable manual and integrated tasks (including setup and rework). Otherwise make no productivity claim.

---

# 13. Single delivery backlog and dated evidence gates

## 13.1 Tier 0: nationals release

- One unified application with Design, Simulate, Optimize, Race, Inspect and Evidence, plus offline presentation mode. Section 4.4c makes the Virtual Wind Tunnel Studio prominent with precomputed real velocity/wake views where source fields exist.
- One canonical car family, initially four to six supported variables, one primary solver, the Section 4.2a grid-verification report, component force accounting and bounded virtual-tunnel run sheet under Sections 4.4a–b, including the Section 4.3a speed study.
- One shared aerodynamic GP and frozen-TITAN race-time expected-improvement recommendation, student approval, result ingestion and a budget-matched LHS benchmark. ORACLE is core.
- Calibrated race physics, supervised thrust acquisition, video position/velocity traces, manual imports, declared Monte Carlo uncertainty propagation under Section 5.3a and held-out prediction scoring.
- Baseline noise study, power/sample-size plan, power-aware experiment display, blocked/randomized physical comparisons where feasible and sealed predictions.
- Sourced rule checklist, measured dimensions/margins, CAD-only versus measured states, manual review and human release approval. Full automatic rule coverage is not a gate to honest inspection.
- Immutable design/run/model links, experiment notes, consequential decision records under Section 12.2b, raw evidence, CSV/JSON/print export and cached authentic presentation assets. Section 7.7 defines synchronized channels, compatible-data correlation views and campaign browsing; Section 15.3 defines tiered CI.

## 13.2 Tier 1: after core gates pass and capacity remains

- Model disagreement report inside validation, using compatible quantities and calibrated intervals.
- Source-backed pressure-coefficient/near-wall diagnostics and conditional vortex indicators under Section 4.4c, with applicable field, resolution and uncertainty checks. No live-volume platform is required.
- Expanded deterministic rule coverage and linked component highlighting; baseline inspection remains Tier 0.

- Auto-generated portfolio from Evidence using one selected report tool, Quarto or Typst after an export proof of concept. Each figure carries source IDs, data hash, units and status; retain narrative experiment notes and disclose AI assistance. This is an export, not a notebook application.
- Additional presentation assets and limited saved engineering layouts where they improve the judged workflow.

## 13.3 Tier 2: roadmap only

SolidCraft; DAFoam/OpenMDAO or SU2 adjoints; mesh/geometry morphing; neural operators; multi-fidelity scheduling; categorical/conditional and multiobjective search; alternate surrogate/acquisition families; scan-to-CAD; automatic manufacturing compensation; capability indices and global compliance probabilities; multi-user roles; fully dockable workspaces; live volumetric CFD hosting; automatic hardware control and general AI agents.

A future morphing adapter must emit hashed, versioned geometry through the canonical study pipeline and repeat geometry/rule/mesh checks; it cannot silently modify a previously solved design. Adjoint sensitivity maps require a justified design question, compatible solver, derivative validation and an approved installation/compute budget before promotion.

Z3-based formal constraints also remain research work. Any future certification claim must define the encoded mathematical domain, numerical tolerances and excluded rules; it cannot certify unencoded requirements or a manufactured car's official legality.

### 13.3a Conditional investigations

Mass-loss and stand-to-car thrust transfer are Tier 2 roadmap investigations; retain the constant-mass and stand-equals-car assumptions explicitly in model reports.

### 13.3b Compute and test budget

Before scaling at G1, measure wall time, core-hours, memory and artifact size on representative cases. Plan:

`N_total = N_initial + N_acquisition + N_holdout + N_grid + N_speed + N_confirmation + N_retry_reserve`.

Count additional unique runs in each category once. For speed-dependent campaigns, count each required speed/design case; for live repeated benchmarks, multiply the appropriate campaign terms by repetitions. Offline replay uses a separately budgeted fixed candidate pool plus CPU time for refits/acquisition; it is not a collection of independently executed CFD campaigns.

`planned_core_hours = sum(N_category * representative_core_hours_category)`; estimate elapsed time from measured concurrency, queue availability and workstation limits rather than assuming linear speedup. Budget track runs, cartridges, manufacturing access and independent builds separately. Log actual runtime, failed/cancelled attempts and remaining approval limits. Include common verification/holdout costs transparently in benchmark accounting. Never assume a fixed runs-per-dimension rule or a mandatory 80–150-run pool; choose sample counts from resources, learning curves and the declared claim.

If the full campaign does not fit, reduce parameter count, prospective iterations or claim breadth before consuming the reserve. Do not fund optimization by using the holdout as training data.

**Indicative minimum campaign (four variables):** about 4 grid-verification runs, 10 initial Latin-hypercube runs, 10 ORACLE-selected runs, 5 untouched holdout runs and 4 speed-study runs, roughly 30–35 runs. One run gives one drag value and cannot rank designs, train the surrogate or demonstrate experiment selection; replace these counts with measured budgets at G1.

## 13.4 Calendar and resource lock

Deadline, team capacity and compute have not been supplied. **No calendar dates are approved.** Before implementation scheduling, the innovation lead records the nationals date, portfolio deadline, available student hours, solver hardware/runtime budget, track access, cartridge budget and reserve for retesting. Assign calendar dates to the gates below in dependency order; reserve an offline rehearsal and freeze interval before judging. Do not present relative targets as agreed dates.

| Gate | Owner | Target date | Acceptance evidence | Response if missed |
|---|---|---|---|---|
| G0: intake and protocol | Innovation + discipline leads | Unassigned; set before G1 work | Applicable rules/class, solver/CAD choice, resources, one primary comparison, pilot protocol and gate calendar | Resolve blockers and reduce variable count; keep assumptions visible |
| G1: reproducible aerodynamic chain | CAD + aerodynamics | Unassigned; after G0 | One car variant through CAD → mesh → solver → forces, hashes/logs, Section 4.2a grid report, component-to-total force check and bounded run-sheet execution; complete Section 4.3a speed study before scaling sweeps; truthful field/slice export or explicit missing-field state; exact host/coordinate contract, integration reuse decision and measured campaign budget | Use documented human-executed solver fallback; drop secondary integrations and visual extras |
| G2: physical acquisition | Testing lead | Unassigned; after approved acquisition procedure; may overlap G1 | At least one calibrated thrust trace and one scaled/time-calibrated video trace with uncertainty; repeated baseline pilot and sample-size plan | Prioritize equipment/access; narrow physical claims if data remain insufficient |
| G3: held-out race prediction | Testing + analytics | Unassigned; after G2 and calibration | Pre-outcome sealed manifest, held-out run scored with interval; model-hierarchy comparison, Monte Carlo stability/non-finish report, build-confounding statement, reference tests and error report | Diagnose identification/model error; freeze advanced features and report failures |
| G4: experiment-selection loop | Innovation + aerodynamics | Unassigned; after G1 and suitable training data | Feasible proposal approved, executed, imported and scored; budget-matched baseline evaluation and physical-test power display (or explicit insufficient-data state), untouched evaluation, finalist/comparator confirmation and composite-objective execution checks | Simplify objective/search bounds; retain recommendation and disclose inconclusive/no-benefit results |
| G5: nationals freeze | Presentation + engineering leads | Unassigned; after G3/G4 evidence review and before event | Authentic cached offline scenes, reset/fallback rehearsal on event hardware, inspection evidence, consequential decision records, Section 7.6 interaction/offline checks, CI evidence, readiness labels and reproducible exports | Stop feature work; fix presentation blockers and narrow claims to verified capability |

A gate records evidence completion separately from hypothesis success. A failed prediction or a benchmark showing no improvement can complete an honest evaluation; it cannot support a positive performance claim. One held-out race demonstrates scoring, not reliable interval coverage. Evaluate coverage across enough independent held-out races to support the stated conclusion.

If a gate slips, remove Tier 1 work before reducing core evidence collection. If core evidence cannot be obtained, label the affected capability experimental and revise the nationals claims. The five capability names remain; the interface shows their actual readiness.

---

# 14. Competition Theatre: exact narrative storyboard

**Scene 1 — The problem (15–25 s).** Show real Veloira model and one consequential design trade-off. State current measured baseline and what is unknown.  
**Scene 2 — What we tested (25–35 s).** Show design alternatives and a genuine comparison. Reveal one failed or rejected choice.  
**Scene 3 — The intelligence (30–45 s).** Show why ORACLE chose a particular next experiment, its cost and predicted information value.  
**Scene 4 — The physics (30–45 s).** Open a real simulation, convergence/force and race-model chain. Explain uncertainties and modeling assumptions.  
**Scene 5 — Manufacture and legality (20–35 s).** Open the actual physical build's inspection and rule-specific measured margin. Demonstrate that CAD-only checks do not certify the physical car.  
**Scene 6 — Reality check (35–50 s).** Show a locked prediction before real tests, measured results, residuals and how the model was corrected, with validation kept distinct.  
**Scene 7 — Engineering decision (20–30 s).** Reveal the final selected design, alternatives, reason and remaining risks.  
**Scene 8 — Technical questioning (open).** Allow judges to inspect formulas, original CSVs, source model/run IDs and AI-use log.

**The single strongest screen:** two linked real designs, their predicted-versus-measured time, uncertainty, compliance evidence and the experiment which changed the team's decision.

**Failure plan:** entirely local saved dataset; a video or static screenshots as backup; mark precomputed vs truly live outputs; do not swap fake demo numbers for real measurements.

---

# 15. Milestone acceptance and definition of done

A flagship is not complete because a page exists.

**ORACLE complete when:** it uses the shared AETHER model and frozen TITAN objective to propose a feasible experiment, imports its result, updates through versioned model artifacts and documents budget-matched comparison and independent confirmation.

**AETHER complete when:** a real CAD variation passes geometry gates, produces traceable CFD outputs, includes solver quality checks and publishes the shared aerodynamic model ID with its untouched-holdout evaluation and applicability report.

**TITAN complete when:** physics tests pass, actual race data is imported, calibration is isolated from validation and unseen-run errors are published.

**FORGE core complete when:** real applicable requirements are sourced, supported deterministic checks and actual physical measurements are differentiated, unsupported/manual rules are routed for review, measured margins are recorded and the evidence pack can be regenerated. Full automatic rule coverage remains Tier 1.

**ATLAS complete when:** all six workspaces show synchronized real entity IDs and honest provenance, an offline demo can be reset, accessibility/legibility tested and an outside reviewer can reproduce selected claims.

**System complete when:** one real design decision traverses all relevant stages with intact evidence and clearly stated limitations. No synthetic sample may be mistaken for an actual race, measurement or CFD result.

---

## 15.1 Acceptance evidence and regression cases

Before claiming completion, retain small representative fixtures and automated checks for the implemented paths:

- Unit/coordinate conversions and force signs; analytical ODE limits, finish-event stability and applicable work/energy checks.
- GP fit/sample shape and seed repeatability, independent-holdout segregation, composite objective/reference agreement and acquisition failure handling. Check gradients only if a differentiable path is adopted.
- Geometry variation with stable semantic/boundary mapping, solver quality rejection and linked force/field imports. Static STEP need not expose an editable native feature tree.
- Rule boundaries/applicability, ambiguous/manual cases, instrument metadata and nominal-versus-measured status.
- Duplicate import/submission, cross-project reference rejection, stale selection, schema compatibility and corrupt/missing artifacts.

Exercise one connected approved simulation/recommendation flow and one sealed-prediction → measurement → unchanged original score flow. Verify synthetic examples cannot become measured through relabelling. G5 includes an offline cold start, source drill-down and deliberately missing-asset fallback on event hardware. Record tolerance-aware comparisons rather than requiring bit-identical CFD floating-point outputs.

For the named studios, compare an exported slice/pressure asset against a reference sample from its raw field; verify coordinate transform, scalar legend and units. Test common A/B scales, unsupported field states and steady-flow animation labels. Restore saved layout/selection presets with missing and stale runs, and verify replay cursor values against the selected source trace. Conditional vortex diagnostics require a recorded derivative/threshold and resolution check before an engineering claim.

## 15.2 Capability readiness labels

Each capability shows one readiness label: `prototype`, `verified` or `competition_ready`, linked to its checks. Offline presentation readiness does not imply physical validation.

---

## 15.3 Tiered continuous integration

Run fast checks (analytic dynamics, units, schemas, objective reference cases, rule boundaries, job lifecycle) on every change with pytest. Run full OpenFOAM reference cases only when solver/geometry templates change and before a release; a skipped solver check blocks the related claim rather than passing.

---

# 16. Technical risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Rulebook mismatch (World/other country vs India Nationals) | illegal car, misleading report | rule version lock; organizer clarification; strict per-class rule engine |
| No parameterized teammate CAD | no automated design search | build controlled parameter adapter for a subset; still import static geometry |
| Too many geometry variables for small CFD set | surrogate overfit and extrapolation | start with 4–6 supported variables; reduce count when budget/data require |
| CFD simulation not converged/mesh independent | false optimization target | solver health, mesh study, independent cross-checks |
| Small, biased training data | miscalibrated uncertainty | held-out tests, domain flags, active learning and uncertainty checks |
| One race time does not identify forces | misleading physics fit | additional measurement modalities, bounds and parameter identification checks |
| Correlated measurements | false pass probability | dependency-aware analysis, no unsupported global probability |
| AI-generated artifacts passed off as original measurements | judging credibility and compliance risk | immutable evidence provenance and assistance log |
| Overbuilding infrastructure | features never proven | single-process/host first, conditional advanced branches |
| Licensing/integration incompatibility | blocked redistribution or unreliable adapter | pin repositories, review licenses, isolated adapters, exit plan |
| Offline judging or failed GPU | broken demonstration | local assets, precomputed results, low-poly fallback, rehearsal |
| Model improves simulation metric but not car | award narrative collapses | preregister physical validation and report negative results |

---

# 17. Ownership and team operating model

**Innovation lead:** owns research hypothesis, system integration and judge narrative; documents original contributions and AI-assisted work.

**CAD/mechanical lead:** controls geometric source-of-truth, legal geometry, part datums and final manufacturable configuration.

**Aerodynamics lead:** owns solver cases, boundary conditions, mesh studies, force extraction and CFD quality approvals.

**Manufacturing lead:** owns physical build IDs, inspection plans, equipment logs and dimensional samples.

**Testing/analytics lead:** owns timing definitions, measurement collection, frozen validation splits and statistical interpretation.

**Presentation/design lead:** owns polished UI, accurate visuals, offline demonstration, accessibility and portfolio evidence layout.

Roles may overlap; technical sign-off must be explicit. Assign ownership in the issue tracker once staffing is known.

---

# 18. Intake checklist: assets required from Veloira

- [ ] India Nationals competition and technical rules, including version and applicable class
- [ ] Organizers' award rubric/scorecards and guidance on innovation/AI attribution
- [ ] Current model in editable native CAD/STEP plus component tree, if available
- [ ] Material stock, machining route, workshop availability and safe manufacturing constraints
- [ ] CFD package and version, example case, raw solver exports, available computing resources
- [ ] Full assembled-car masses and wheel/bearing/tether geometry and component specifications
- [ ] Supervised thrust acquisition equipment/procedure, calibration, raw thrust traces and track timing definitions
- [ ] Scaled/timed video or photogate records, baseline repeatability pilot, cartridge budget and planned independent track trials
- [ ] Frozen analysis protocol, minimum detectable effect/sample-size plan and independently retained sealed-prediction record
- [ ] Actual trial run times, conditions and number of independent trials
- [ ] Inspection measurements, instrument resolution and actual manufactured part IDs
- [ ] Team roles, nationals event date, budget and time available for iterations
- [ ] Current website/brand identity, logos and design assets for ATLAS

**No asset is a prerequisite for starting:** data schema, synthetic examples, interface shell, equations unit tests and geometry adapter can be built with explicit placeholder evidence status. Real performance and legality claims *do* require appropriate real data.

# 20. Research source register and validation notes

The original v1.0 specification states that its authors checked or referenced the following sources on **25 October 2026**. The v1.3 revision retains that attribution without independently rechecking those claims. This section documents publicly available capabilities and regulation access, **not** Veloira experimental results.

1. STEM Racing Global, official resources and AI guidance: https://www.stemracing.com/resources . AI use is encouraged with transparency and responsible verification; review your event's specific requirements.
2. STEM Racing USA, 2026–27 competition rules and technical-rule access notice: https://www.stemracing.us/rules-regulations . Some technical regulations are in a registered portal.
3. STEM Racing Canada, class-specific regulations and technical access notice: https://www.stemracing.ca/rules-and-regulations . National details can differ.
4. FreeCAD official source and licensing: https://github.com/FreeCAD/FreeCAD . Mature parametric open-source 3D CAD; LGPL-2.1.
5a. CfdOF: https://github.com/jaheyns/CfdOF . Optional FreeCAD GUI for authoring the first OpenFOAM template; GPL-3.0; macOS not widely tested.
5. build123d official repository: https://github.com/gumyr/build123d . Python B-rep modelling based on Open Cascade, parametric and export-capable; Apache-2.0.
6. SolidCraft project documentation and roadmap: https://docs.solidcraft.io/ and https://github.com/tangency-labs/solidcraft/blob/main/ROADMAP.md . Early-stage Rust CAD with CLI/MCP and browser capabilities; surfaces, CAM and simulation remain incomplete according to its own project documentation. Do not treat it as an industrial CAD replacement by assumption.
7. DAFoam official repository: https://github.com/mdolab/dafoam . Discrete-adjoint high-fidelity multidisciplinary optimization built around OpenFOAM with OpenMDAO interfaces; advanced GPL-3.0 toolchain and installation considerations.
7a. Ax: https://ax.dev/ . Adaptive experimentation platform on BoTorch; MIT.
7c. OpenFOAM.app: https://github.com/gerlero/openfoam-app . Native macOS OpenFOAM builds via Homebrew.
7d. foamlib: https://github.com/gerlero/foamlib . Python library for writing, running and reading OpenFOAM cases.
7b. Tracker: https://physlets.org/tracker/ . Open Source Physics video analysis and modelling tool; GPL.
8. BoTorch official project: https://botorch.org/ and https://github.com/pytorch/botorch . Bayesian optimization library; advanced acquisition methods require appropriate experiment modelling.
9. OpenFOAM official distributions: https://openfoam.org/ and https://www.openfoam.com/ . Select one compatible release/toolchain and capture solver setup.
10. OpenMDAO: https://openmdao.org/ . Multi-disciplinary optimization framework; useful as research extension.
11. Gmsh: https://gmsh.info/ ; ParaView: https://www.paraview.org/ ; PyVista: https://pyvista.org/ . Meshing and scientific visualization; check format and license implications.
12. Three.js: https://threejs.org/ ; React Three Fiber: https://r3f.docs.pmnd.rs/ ; Apache ECharts: https://echarts.apache.org/ . UI/3D/chart infrastructure, not substitutes for validated scientific calculations.

**Original source used:** the team's supplied “Daedalus — Predictive Engineering Platform” specification (uploaded 25 October 2026). Its four core directions (CFD surrogate, race-time physics, predictive scrutineering, validation) were retained and critically extended, while its exclusion of autonomous design experimentation, broad 3D visualization and advanced integration was deliberately reconsidered. Former illustrative performance figures were not accepted as observations.

---

# 21. Single-sentence pitch and final directive

**Daedalus X is Veloira's autonomous engineering research system: it determines which car design to test next, integrates aerodynamic and race physics with manufacturing and competition constraints, and shows whether its predictions actually held up on the track.**

**Build order:** get one end-to-end real experiment working, validate it, then make the interface exceptional. The visual spectacle amplifies the evidence; it cannot replace it.

## Appendix B — Commercial-grade visual and insight features (added 2026-10-30)

All features run on data the pipeline already exports (`viz.json`/`viz.bin`, force histories, Monte Carlo), except B.3 #7, which needs one extra free OpenFOAM adjoint solve. Every visual shows its provenance and run acceptance, and none may render a number from a rejected run without the rejection banner.

### B.1 AETHER Wind Tunnel
1. **Pressure Skin:** smooth contour-banded surface Cp with hover readout.
2. **Smoke Streams:** glowing animated streamlines with depth fade.
3. **Wake Scanner:** a draggable slice plane, front to back, through the flow.
4. **Flow Arrows:** velocity glyphs on slices.
5. **Split Compare:** two designs side by side plus a difference map.
6. **Fly-through:** a scripted cinematic camera path, nose to wake.

### B.2 AETHER Design
7. **Studio Render:** physically based paint, environment reflections, soft shadows, turntable.
8. **Exploded View:** animated assembly separation.
9. **Measure Callouts:** dimensions and clearances drawn on the model.

### B.3 Flow insight (commercial CFD staples)
1. **Q-criterion vortex cores:** 3D vortex tubes (wing tips, wheels).
2. **Iso-surfaces:** wake shell at Ux/U∞ = 0.5.
3. **Surface oil flow:** wall-shear streaks showing skin-friction direction.
4. **Separation and reattachment markers** from wall shear.
5. **Total-pressure loss** on wake slices.
6. **Drag build-up curve:** cumulative drag from nose to tail.
7. **Adjoint sensitivity map:** surface coloured by d(drag)/d(normal displacement) (OpenFOAM adjoint, free). Highest-value feature.
8. **Delta maps:** design A − B for surface Cp and wake.
9. **Mesh viewer:** grid and refinement zones.
10. **Convergence health dashboard:** traffic-light status per run, live solver monitor.

### B.4 TITAN Race
1. **Race Replay:** 3D car on the track, synced to telemetry.
2. **Telemetry Wall:** ATLAS-style stacked channels with one synced cursor.
3. **Spread Fan:** Monte Carlo race-time band over the speed trace.
4. **What-if sliders:** mass, CdA and thrust giving live race time and spread.
5. **Ghost race:** two designs racing side by side with the time gap.

### B.5 ORACLE, FORGE, ATLAS, presentation
1. **Design Map:** tested designs coloured by drag, with an uncertainty cloud.
2. **Next-Best Card:** the recommended experiment with expected gain and confidence.
3. **Rule Hotspots:** near-fail and fail parts glow on the car, with margins.
4. **Run Timeline:** runs and predictions with hash-verified badges.
5. **Prediction Scorecard:** predicted against measured.
6. **Story Deck (Competition Mode):** full-screen judge walkthrough.
7. **One-click report:** PDF engineering report generated from evidence.
8. **AR view:** car and flow on a phone via WebXR.

### B.6 Build order
1. Adjoint map, Q-criterion, oil flow, Pressure Skin and Smoke Streams.
2. What-if sliders and ghost race.
3. The remaining AETHER items.
4. ORACLE and FORGE visuals.
5. ATLAS, the report and Competition Mode.
6. AR last.

### B.7 Implementation source of truth

The component-level build list and the open-source apps to borrow from for B.1–B.6 are in [docs/build/UI-MASTER-PLAN.md](build/UI-MASTER-PLAN.md). Use permissive (MIT/BSD/ISC/Apache) code only; GPL and AGPL apps are layout references only.

## Appendix A — Revision note

v1.0–v1.7 (25–26 October 2026) consolidated the original Daedalus brief into one application, one backlog (Section 13) and G0–G5 gates. v1.8 removed duplicated sections, renamed-feature studios, revision logs and illustrative savings arithmetic, and adopted CfdOF; v2.0 replaced it with a free local path (OpenFOAM.app + foamlib case template), CfdOF optional. v1.9 adopted Ax for experiment selection and Tracker for video analysis, and cut light/tablet modes, the M3 model, mass-loss and stand-transfer investigations, complex job recovery, restore drills, tolerance/sensitivity Tier 1 items and multi-level readiness labels. No implementation or measurement has been performed; Section 18 lists outstanding intake.