> **Exact to-do with how-to: `TODO.md`.** **Review (2026-11-03, Claude).** This is the master test/edit/remove/add checklist. `MASTER-PLAN.md` holds the background; this file is what to work through.
>
> **Priority tiers (a school team cannot do all ~600 bullets; work P0 → P1 → P2):**
> - **P0, before Nationals:**
>   - §2 FORGE India rules and rule→CAD jump
>   - §4 drawing pack (60 pts)
>   - §5 accepted CFD campaign with grid study, Wind Tunnel defaulting to the best accepted run
>   - §6 equal-budget ORACLE benchmark (Optuna TPE, scipy.stats.qmc Sobol/LHS, random)
>   - §7 slider stacks into presets
>   - §8 calibration and the paired physical tests
>   - §10 physical testing
>   - §12 judge walkthrough
>   - §17 the eight innovation items
>   - §18 release gate
>   - §1.7 offline/demo-day checks
> - **P1, if time:**
>   - §1.2 CI, coverage and Hypothesis tests
>   - §1.4 analytic benchmarks
>   - §9 CalculiX (only with real material data)
>   - §11 OpenTimestamps and the QR verify page
>   - pymoo Pareto front
>   - stadium/TV mode
> - **Removed (not doing):** see the "Removed for good" list in `TODO.md`.
>
> **Corrections:**
> - The India rulebook YAML has 79 entries, not 80 (§2 Test). Recount against the PDF.
> - §15 matches the MASTER-PLAN §24 cut list.
>
> **Already shipped (verify, don't rebuild):**
> - SALib sensitivity
> - Dockview Pit Wall
> - React Flow lineage
> - uPlot telemetry
> - run-vs-run ΔCp and wake Q-criterion
> - closed loop up to FORGE (CFD hand-off still missing)
> - calibration UI with held-out scoring
> - judge pack ZIP
> - RFC 3161 timestamps
> - test planner
> - legal-frontier map
> - points objective
>
> **Open source still to adopt:**
> - Optuna (baseline benchmark)
> - scipy.stats.qmc (baseline benchmark)
> - pymoo (Pareto front)
> - ArviZ (posterior diagnostics)
> - pmndrs/racing-game scene (replay rebuild)
> - f1-dash timing layout (replay rebuild)

Daedalus-X Master Test, Edit, Remove, Improve and Add Checklist
Prepared 2 November 2026 for the STEM Racing India National Finals. Scope: the Daedalus-X platform only (ORACLE, AETHER, TITAN, FORGE, ATLAS, Design Studio, Wind Tunnel, Race, Evidence, Report, Presenter). Every item is written as an action. Work top to bottom inside each section.
0. How to use this checklist
• Mark each bullet as PASS, FAIL, FIXED, CUT or DEFERRED, with the date and the initials of the person who verified it.
• Every FAIL gets a one line cause and a one line fix before it is closed.
• Every number shown anywhere in the app must carry one provenance label: measured, simulated or synthetic. Test this on every screen.
• Freeze rule: once a section is marked complete, change it only through a logged edit with a reason.
• Define done for innovation as the eight evidence items in section 17. Nothing else counts toward done.
1. Global tests to run before anything else
1.1 Build, install and environment
• Clean clone test: clone on a machine that has never run the project, follow the README only, and log every step that fails or is undocumented.
• One command installs all backend and frontend dependencies with pinned versions and lockfiles committed (uv or pip-tools for Python, package-lock or pnpm-lock for Node).
• Fresh virtual environment test: install on Python and Node versions stated in the README, then on one version newer and one older, and record what breaks.
• Cold start test: start API and frontend from nothing and time the first usable screen. Target under 10 seconds on the demo laptop.
• Warm start test: time restart with cached data.
• Disk and repository size test: record repository size, Chili3D bundle size and evidence store growth per run.
• Dependency licence scan: regenerate THIRD_PARTY.md from installed packages with a tool such as pip-licenses and license-checker, and confirm every entry has a licence and a source revision.
• Dependency vulnerability scan: run pip-audit and npm audit, fix or document every high and critical finding.
• Secrets scan: run gitleaks or trufflehog over the full git history, not only the working tree.
• Path portability test: grep for absolute personal paths, usernames and hard coded Downloads folders.
• Environment variable test: start with every optional variable unset and confirm sensible defaults and clear errors.
• Version stamp test: confirm the app displays its git commit hash, build date and rulebook version, and that the stamp appears in every exported PDF.
1.2 Automated test suite and static checks
• Typecheck, lint, formatter and knip all pass on main with zero errors and zero new warnings.
• Unit tests pass, with a coverage report for physics, FORGE, ORACLE, calibration and evidence code. Target at least 80 percent on those modules.
• Property based tests (Hypothesis): random legal and illegal designs never crash FORGE, rule margins are monotonic in the dimension, energy is never created.
• Golden file regression tests: freeze outputs for the baseline car (rule sheet, race time, Cd, hashes) and fail the build if they drift without a logged reason.
• Contract tests for every API endpoint: schema, status codes, error bodies, pagination, and that no endpoint returns NaN or Infinity.
• OpenAPI schema is generated and committed, and the frontend types are generated from it so they cannot drift.
• Continuous integration runs all of the above on every push and the badge is green on main.
• Pre commit hooks run formatting, lint and secrets scan locally.
• Flaky test hunt: run the whole suite 20 times and quarantine or fix any test that fails once.
1.3 End to end functional paths
• Golden path test: import car, run FORGE, view rules, jump to CAD, launch a job, view accepted result, run race prediction, seal it, generate report, open presenter. Script it with Playwright and run it nightly.
• Failure path tests for each step: missing file, corrupted STEP, solver crash, full disk, API timeout, rejected CFD run.
• Undo and recovery: kill the API and the browser at random points and confirm no half written design, run or evidence record is left.
• Large data test: 1,000 evidence records, 50 CFD runs, 10,000 Monte Carlo samples and a 5 million cell result load without freezing.
• Idempotency test: pressing any action twice, or reloading mid action, never creates duplicate records.
• Deep link test: every screen, run and rule has a stable URL that reopens the same view.
1.4 Numerical correctness and scientific regression
• Analytic benchmark tests for each physics model (constant thrust, drag only, rolling only) against closed form answers within a stated tolerance.
• Unit consistency test: every quantity carries units, and a unit lint rejects mixing millimetres, metres, grams and kilograms silently (use pint or similar).
• Dimensional analysis test on every formula in the race model and the points model.
• Cross implementation test: compare TITAN output with an independent simple script written separately, for example a scipy ODE integration.
• Convergence test on time step: halve the integration step and confirm the race time moves by less than the stated tolerance.
• Random seed test: results are identical for the same seed and differ in the expected way for different seeds.
• Float edge test: zero, negative, huge and NaN inputs are rejected with clear errors.
• CFD case regression: the baseline case reproduces its Cd within tolerance after any solver, mesh or script change.
• Rulebook regression: every rule has at least one passing and one failing test fixture.
• Points formula test: reproduce the C9.5 and C9.6 reaction and knock out formulas against hand worked examples from the regulations.
1.5 Data integrity, provenance and evidence
• Every displayed number carries one label: measured, simulated or synthetic. Crawl every screen automatically and fail on any unlabeled number.
• Hash chain integrity: alter one byte of any record and confirm verification fails and names the record.
• Backup and restore test: export the evidence store, wipe, restore, verify all hashes still match.
• Time sanity test: timestamps are monotonic, stored in UTC and tolerate clock skew.
• Migration test: upgrade an old store to the current schema without losing records.
• Orphan test: no record refers to a missing parent, no file exists without a record.
• Export test: every PDF, CSV and image export embeds the commit hash, rulebook hash and run identifier.
1.6 Performance and resource budgets
• Frame rate budget: 60 frames per second in Race replay and the Wind Tunnel viewer on the demo laptop, with adaptive quality verified on a weak laptop.
• Memory budget: record peak resident memory for the browser, API and solver, and set a ceiling that leaves headroom on the demo laptop.
• Time to interactive budget for each major screen under 3 seconds after data load.
• Bundle size budget with a CI check, and lazy loading confirmed for Chili3D, vtk.js and React Flow.
• Profile the five slowest API endpoints and fix or cache them.
• Thermal and battery test: run the full demo for 30 minutes on battery and confirm no throttling stutter.
• Job throughput test: time a full meshing and solve on the machine that will run it, and compute the number of runs affordable before the freeze date.
1.7 Resilience, offline and demo day
• Offline test: disconnect the network and confirm the demo path (car, rules, replay, evidence, presenter) works with no external fetches. Block all outbound traffic in a firewall and watch the logs.
• Font and asset test: no remote fonts, CDN scripts or images are needed at runtime.
• Power loss test: pull the plug mid job and confirm clean recovery on restart.
• Second device test: the full demo runs from a backup laptop restored only from the backup drive.
• Projector and display test: 1280 by 720 and 1920 by 1080, dark room and bright room legibility, HDMI and USB C adapters, mirrored and extended displays.
• Screen sleep, notification and update suppression checklist for presentation time (do not disturb, no auto update, no battery saver).
• Fail safe demo mode: a recorded video of the whole demo path plays from the Presenter if the live system fails.
• Hash and timestamp verification page works from a phone on mobile data and offline fallback instructions are printed.
• Pack list: chargers, adapters, mouse, clicker, spare cables, USB drives with the build, printed rule sheet and drawing pack.
1.8 Compatibility, accessibility and usability
• Browser matrix: Chrome, Edge, Firefox and Safari at 1440, 1024 and 375 pixel widths, with zero horizontal overflow.
• High DPI and zoom test at 100, 125 and 150 percent.
• Locale test: decimal separators, date formats and time zones.
• Keyboard only test: every action reachable, visible focus rings, logical tab order, command palette works.
• Contrast and colour blindness check on every chart, including purple, green and yellow sector colours.
• Screen reader labels on charts and controls, and a reduced motion setting honoured.
• Cold user test: three people who have never seen the app complete five defined tasks while you watch silently, and you log every hesitation.
• Judge walkthrough timing: the full evidence chain is inspectable in under three minutes by someone seeing it for the first time.
• Error message audit: every error says what happened, why, and what to do next, with no stack traces on screen.
1.9 Security and safety
• Input validation on every upload: size cap, type check, STEP and DXF parser sandboxing.
• Path traversal and injection tests on file and job endpoints.
• Subprocess safety: solver, Typst and mesh commands never build shell strings from user input.
• CORS, local only binding and no open ports beyond what the demo needs.
• No telemetry or outbound calls unless declared, confirmed by a network capture.
• Backups are encrypted or kept private, and no personal data of team members is stored in evidence exports.
1.10 Documentation and handover
• README with install, run, demo, test and troubleshooting sections, verified by the clean clone test.
• Architecture note: one page describing ORACLE, AETHER, TITAN, FORGE, ATLAS and their data contracts.
• Runbook: how to start, stop, recover, rebuild a mesh, rerun a case and regenerate every deliverable.
• Known limitations page that lists every estimate, manual check and unvalidated model, shown honestly in the app and the report.
• Changelog with one line per meaningful change and the reason for it.
• Every team member can run the golden path alone without help, confirmed in a timed drill.
2. Rules and FORGE (highest points per hour)
Test
• For every one of the 80 India NF entries, confirm the page reference, limit, tolerance, penalty and class match the source PDF word for word.
• Confirm the performance class has exactly 30 entries and each is treated as a hard constraint.
• Test each automated measure against a hand measurement of the same CAD: length, width, height, wheelbase, wheel diameter, wheel width, ground clearance, front wheel gap, overhangs, wing span, chord, thickness, nose cone, cartridge chamber depth and diameter, tether guide, halo pocket, wall thickness.
• Reproduce the T7.2.1 front wheel gap finding (33.00 mm against 38.00 mm minimum) from a fresh import and confirm it still fails.
• Boundary tests: feed designs at exactly the limit, 0.01 mm inside and 0.01 mm outside, and confirm pass or fail flips at the correct value.
• Tolerance tests: confirm the manufacturing spread input changes pass probability in the expected direction.
• Hash binding test: edit a saved design, confirm the remeasurement sidecar detects the mismatch.
• Rule to CAD jump: click every failed rule and confirm the correct part is selected and framed.
• Points at risk test: confirm penalties sum correctly and underweight costs 10 points per gram.
• Mass test: confirm predicted mass from volume times density against a kitchen scale and a 0.01 g scale, and confirm the 50.0 g minimum plus a scale margin.
• Ballast logic test: confirm ballast is only allowed under the halo and the 0.2 g per 0.1 g underweight rule is applied.
• Printable scrutineering sheet: print it, fill it by hand on the real car, and confirm every field is usable.
• Manual and unsupported checks must be visibly flagged, never silently passed.
Edit
• Move the source PDFs into data/reference/rules/india_nf_2025_26/ and register them in the evidence store with hashes (the directory is currently empty).
• Extract every remaining measurable T rule into the YAML with page, measure, min, max, penalty and tolerance.
• Replace any remaining UK reference numbers (60 g mass, D8.5 rear wing height) in docs, checklist and pitch text.
• Add the dimension and limit overlay inside the CAD view for failed and at risk rules.
• Add halo, helmet and standard part checks so unmodified fixed parts are confirmed in every geometry.
• Resolve the known source inconsistencies in the rulebook notes (T8.5.x numbering, T4.4.5 halo load) with a visible warning on affected rules.
Remove
• Any UK rule shown as if it were India NF.
• Any rule marked pass that is really an estimate.
Improve
• Add wall thickness by ray casting, wheel diameter by cylinder fit, chamber detection by hole detection, and section based chord.
• Show margin in millimetres and as a percentage on every rule.
• Rank rules by points at risk times probability of failure.
• Add a one page red, amber, green summary for the team manager.
Add
• A tolerance stack up tool that reports the probability each dimension ends up illegal and a suggested safety offset.
• A pre inspection mode that walks through the physical check order used by scrutineers.
• A legal frontier map with rule and page for every boundary, interactive.
• An inspection log that records who measured what, with which tool and when.
Section 2 extras: Test
• Run every rule against three fixture cars: a clearly legal car, a clearly illegal car and a car sitting exactly on every limit.
• Fuzz test FORGE with 10,000 random dimension sets and confirm no crash, no NaN and monotonic margins.
• Cross check each automated measure with a second method (for example bounding box versus mesh vertex extents).
• Re import the same STEP on two machines and confirm identical FORGE output.
• Test the printed scrutineering sheet with someone who did not build the app.
• Check every penalty value against the points table so the total points at risk matches a hand calculation.
• Test the rule search and filter by class, page, status and penalty.
Section 2 extras: Edit
• Add a source page link on every rule that opens the archived PDF at the correct page.
• Add a last verified date and verifier initials on every rule entry.
• Tag each rule as auto, estimated or manual, and make the tag visible everywhere the rule appears.
• Record every rule ambiguity as an organiser question with its date and the answer received.
Section 2 extras: Improve
• Show worst three rules first on the Rules screen, sorted by points at risk.
• Add a what if mode: drag a dimension and see margins and points change live before committing a design change.
• Add colour coded margin bars with the tolerance band shaded.
Section 2 extras: Add
• Inspection order planner that sequences physical checks to minimise handling of the car.
• Pass probability per rule from the measured manufacturing spread.
• Rule change detector: if a new rulebook version appears, diff it against the current YAML and list affected checks.
• Digital inspection record with photos, tool IDs and signatures for each manual measurement.
Section 2 extras: Remove
• Duplicate rule entries, stale UK mappings and any rule without a source page.
3. CAD and Design Studio
Test
• Import the real car STEP, save, reopen and confirm geometry is bit identical in volume, bounding box and part names.
• Export STEP and open it in a second CAD program to confirm interoperability.
• Confirm part selection, naming and focus messages work for every named part.
• Confirm undo, redo and unit handling (millimetres) in Chili3D.
• Stress test with a heavy assembly and a corrupted file and confirm graceful errors.
• Confirm mass and centre of gravity estimates against the physical car.
Edit
• Decide whether Chili3D is a full design tool or a view and small edit tool, and label it honestly.
• Wire the parametric.py draft into FORGE import, or leave it clearly marked as a study only.
• Add design diff with a deviation heat map in millimetres.
Remove
• Unused CAD panels and duplicate inspection views.
Improve
• Reduce Chili3D load time with lazy loading.
• Show provenance badge once, in the header only.
Add
• Parametric sliders for the four ORACLE variables that regenerate the car live.
• Manufacturing checks: minimum wall, tool reach, overhangs, ball nose tool radius of 6.35 mm on the halo pocket.
• Measured versus CAD deviation table from caliper readings.
Section 3 extras: Test
• Round trip test: import, save, export and re import 20 times and confirm no geometry drift.
• Test unit handling by importing a model in inches and confirming the app converts or rejects it clearly.
• Test very small features (the 3.175 mm halo pocket depth) for correct tessellation and measurement.
• Test selection by name, by click and from a rule link on a large assembly for speed.
• Test that the displayed mass and centre of gravity update after a part is edited.
• Test memory use with a heavy model open for an hour.
Section 3 extras: Edit
• Standardise part naming (a naming convention table) so rule links never miss a part.
• Add metadata fields to each part: material, density, process, finish and supplier.
• Write down the CAD kernel tolerance and mesh deflection used for measurements.
Section 3 extras: Improve
• Add section view with a live dimension readout at the cursor.
• Add measurement tools (point to point, distance, angle) that log to the inspection record.
• Add saved camera views for the standard drawing orientations.
Section 3 extras: Add
• Version history of designs with a visual diff and the reason for each change.
• Interference and clearance check between assembled parts.
• Exploded view animation for the verbal presentation.
• Link each CAD part to its physical measurement record and manufacturing step.
Section 3 extras: Remove
• Chili3D menus and tools the team never uses, hidden by default to reduce clutter.
4. Drawing pack (60 scrutineering points)
Test
• Verify all 13 C2.10.6 contents items exist in the exported A4 PDF.
• Check every dimension printed against the CAD and against the physical car.
• Check sections, exploded view key, virtual cargo highlight and identification marks.
• Print at A4 and confirm line weights, text size and scale are legible.
Edit
• Complete local chamber and bore dimensions, wing boundary markup, nose and tether geometry labels, finish and decal notes.
• Fill the review register with real reviewer names and dates.
Remove
• Draft watermarks and placeholder text before submission.
Improve
• Add title block consistency, revision letters and a drawing number scheme.
Add
• DXF and SVG importer with deviation check against the rebuilt 3D model.
• A separate render pack for the 20 point 3D renders criterion.
• A finish and assembly page for the 20 point finish criterion.
Section 4 extras: Test
• Have a person outside the team read the drawings and rebuild one dimension chain by hand to prove they are unambiguous.
• Check that every dimension is toleranced or covered by a general tolerance note.
• Check that views are projected consistently (first or third angle, stated on the sheet).
• Run the PDF through a validator and open it in three viewers to confirm identical rendering.
• Compare the printed scale with a ruler on the paper copy.
Section 4 extras: Edit
• Add a drawing index page with revision table and approval signatures.
• Add a materials and finish schedule consistent with the manufacturing route.
• Add a bill of materials with part numbers, quantities and masses that sum to the weighed car.
Section 4 extras: Improve
• Use consistent line weights, fonts and symbol standards across every sheet.
• Add datum references and geometric tolerances where precision matters for rule compliance.
• Add a mass summary that cross references the scale readings.
Section 4 extras: Add
• Render pack: hero, three quarter, front, rear, top, side and exploded renders with consistent lighting and neutral background.
• Assembly instruction sheet showing build order and adhesive or fastener use.
• Finish specification page showing paint, decal positions and surface treatment.
• A quality review checklist signed by two team members before submission.
Section 4 extras: Remove
• Auto generated clutter such as duplicated centre lines, overlapping text and unlabelled sections.
5. CFD and Wind Tunnel
Test
• Run the baseline car through the full case setup and confirm residuals, y plus, mesh quality and convergence gates.
• Grid independence: three mesh levels, Richardson extrapolation and GCI, report Cd with numerical uncertainty.
• Speed sweep from 15 to 25 m/s and confirm whether Cd is effectively constant across the race.
• Compare at least two turbulence treatments on the baseline to bound model form error.
• Repeat the same case on a perturbed mesh to estimate run to run noise.
• Check rotating wheel and moving ground set up against a published bluff body or wheel case.
• Confirm the halo and helmet are in every geometry.
• Confirm force integration and momentum deficit wake survey agree within a stated tolerance.
• Job queue test: launch, cancel, crash and recover jobs, and confirm logs are complete.
• Confirm rejected runs are never the default and carry a visible badge.
Edit
• Make the Wind Tunnel default to the best accepted run.
• Merge Flow views so a single vtk.js engine remains.
• Replace the toolbar clutter with one layer panel.
Remove
• Old R3F flow view remnants, 60 percent seed slider, duplicate status badges.
Improve
• Roughly 30 seed lines with tube look, dark floor, tone mapping and ambient occlusion.
• Cd convergence plot with an acceptance gate line.
• Mesh quality heat map and y plus map.
Add
• Drag decomposition by part, pressure versus friction.
• Run versus run delta: Cp difference, wake difference, force difference.
• Q criterion vortex surfaces coloured by vorticity.
• Wake planes at x over L of 1, 1.5 and 2, clip, slice and probe line plots.
• Surface streaks (LIC) and separation line markers.
• Ride height and yaw sensitivity studies.
• Frontal area versus Cd trade chart (CdA).
• Run wizard with live residuals and ETA.
Section 5 extras: Test
• Mesh quality statistics (non orthogonality, skewness, aspect ratio) checked against stated thresholds for every accepted mesh.
• Boundary condition audit: inlet velocity, outlet pressure, ground speed and wheel rotation verified in the case files.
• Domain size study: confirm blockage ratio and distance to boundaries do not affect Cd beyond tolerance.
• Time step and iteration study for transient or pseudo transient runs.
• Compare surface pressure integration with the reported forces for consistency.
• Check that residual drop, force convergence and monitor point stability all pass before acceptance.
• Run the baseline on two machines and confirm results agree within numerical noise.
• Test the job queue under a 20 job backlog with cancellations.
Section 5 extras: Edit
• Pin the OpenFOAM version and record it in every run record.
• Store the complete case directory hash with every run so it can be reproduced.
• Write a one page acceptance rule: exactly which numbers must pass for a run to be ACCEPTED.
Section 5 extras: Improve
• Add automated report per run with images, forces, convergence plots and mesh statistics.
• Add side by side comparison of any two runs with a difference summary in plain words.
• Add estimated time remaining that learns from earlier runs.
Section 5 extras: Add
• Turbulence model comparison table (k omega SST, transition model) on the baseline.
• Wheel rotation modelling comparison (moving reference frame versus sliding mesh versus rotating wall) with their Cd effect.
• Wind tunnel style validation case with published data to bound solver error.
• Cd and CdA with confidence intervals in every chart and table.
Section 5 extras: Remove
• Any default viewer layer that adds clutter without a decision purpose, and any run with no acceptance record from default lists.
6. ORACLE optimisation
Test
• Unit test the GP: known function recovery, interpolation, noise handling and hyperparameter stability.
• Leave one out validation with RMSE and calibration of predicted intervals.
• Confirm expected improvement is zero where uncertainty is zero.
• Confirm FORGE constraints are respected in every proposal, with zero illegal candidates proposed.
• Seed reproducibility test.
• Run the benchmark against Sobol, Latin hypercube, random, Optuna TPE and CMA-ES at equal budget over at least 10 seeds.
• Confirm results with a noise term included and with it removed.
Edit
• Add a nugget (noise) term estimated from repeated runs.
• Wire the proposal into the closed loop: ORACLE, parametric CAD, FORGE, CFD, feedback.
• Pre register the benchmark protocol in the evidence store before running it.
Remove
• Synthetic benchmark results presented without a synthetic label.
Improve
• Show why each run was chosen with an acquisition history.
• Report regret curves with confidence bands.
• Add variable importance through length scales and Sobol indices.
Add
• Constraint aware acquisition with a feasibility model.
• Expected racing points objective in place of drag only.
• Pareto front of drag, mass and rule margin.
Section 6 extras: Test
• Test on standard optimisation benchmarks (Branin, Hartmann, Rosenbrock in four dimensions) and compare with published performance.
• Test with deliberately noisy objectives to confirm the noise term stops the model chasing noise.
• Test with infeasible regions covering most of the space and confirm ORACLE still finds legal candidates.
• Test that the acquisition optimiser does not get stuck at local maxima (multi start check).
• Test restart from saved state reproduces the same next proposal.
• Test that variable bounds come from FORGE rules, not hard coded numbers.
Section 6 extras: Edit
• Record hyperparameters, kernel choice, priors and seeds in every ORACLE evidence record.
• Write the stopping rule down in advance (budget, regret threshold or expected improvement floor).
• Normalise inputs and standardise outputs consistently and document it.
Section 6 extras: Improve
• Show the predicted versus actual value of every candidate after its run, so surprises are visible.
• Show calibration of predictive intervals (do 90 percent bands hold 90 percent of results).
• Explain every proposal in one plain sentence for judges.
Section 6 extras: Add
• Batch proposals so several CFD runs can be queued at once.
• Trust region or local refinement around the best legal design late in the budget.
• Engineer in the loop mode: the team can veto or edit a proposal and the model records it.
• Comparison with a manual engineer search on the same budget, the most persuasive result for judges.
Section 6 extras: Remove
• Any plot of optimiser progress that mixes synthetic and real runs without a clear label.
7. Race, TITAN and replay
Test
• Verify physics: energy balance closes, thrust minus drag minus rolling equals mass times acceleration at every step.
• Verify against hand calculation for a simple constant thrust case.
• Verify tether friction and pulley losses with the 0.6 mm monofilament prior.
• Monte Carlo convergence: confirm p5, p50 and p95 stop changing as samples increase.
• Replay test: correct Z up orientation, wheel spin rate matching distance over radius, start, finish and sector gates.
• Performance test: 60 frames per second on the real presentation laptop, and with adaptive quality on a weak laptop.
• Camera tests: broadcast, chase, onboard, top, finish and director cuts.
• Photo finish and slow motion capture, PNG export.
• Comparison mode: predicted versus measured, two designs, ghost delta.
• Check the speed gauge, results, driver gap and mini sector components with extreme and empty data.
• Confirm reaction time handling and the total race time rule used in the points formulas.
Edit
• Hide the M1 model under an advanced drawer.
• Collapse the what if sliders into presets plus an advanced drawer.
• Merge telemetry, spread and ghost tabs into Replay and Analysis.
Remove
• Foreign branding and demo data from imported components.
• Illustrative launch puff if the gas is not confirmed, or label it illustrative.
Improve
• Linked cursors across speed, acceleration, drag and thrust in uPlot.
• Units on every axis and an uncertainty band on every time series.
• Annotations for launch, burnout, peak speed and finish.
Add
• Race day mode with big numbers, reaction entry, actual versus predicted and instant calibration update.
• Tornado chart and ms per gram, per cm squared of CdA and per 0.001 of rolling resistance.
• Time budget stacked bar for drag, rolling, mass and reaction.
• Head to head win probability and knock out round probability.
• Optimal mass study.
• Stadium timing and TV mode with timing tower, speed trap, event leaderboard and history strip, only if time remains.
Section 7 extras: Test
• Test with zero thrust, zero drag and zero mass edge cases for sane behaviour.
• Test thrust curve interpolation at the ends of the measured range.
• Test sensitivity to the integration step and the sampling rate of telemetry.
• Test replay position at the exact start, each sector boundary and the finish for off by one errors.
• Test that predicted and measured traces align in time with a documented offset convention.
• Test chart zoom, cursor linking and PNG export under rapid input.
• Test the finish line detection and photo finish frame selection for correctness.
• Test with a low end GPU and with hardware acceleration off.
Section 7 extras: Edit
• Document the coordinate system, time zero convention and unit conventions on one reference page.
• Replace any hard coded constants with named, sourced parameters.
• Make the reaction time convention (total time versus car time) explicit on every screen that shows a time.
Section 7 extras: Improve
• Add confidence bands to every predicted trace and a toggle for percentiles.
• Add keyboard shortcuts for play, pause, step and camera switch.
• Add a quality preset menu (high, balanced, low) with the automatic choice explained.
Section 7 extras: Add
• Scenario library: cold day, warm day, heavy car, light car, worst cartridge, best cartridge.
• Expected points calculator for different seeding and bracket positions.
• Race strategy advice: which of two cars to run each round given the field estimate.
• Auto generated race report page after each run with predicted, measured and error.
Section 7 extras: Remove
• Visual effects that reduce frame rate without helping understanding, and any replay element that is not backed by data.
8. Calibration and statistics
Test
• Posterior recovery test: simulate data with known CdA and Crr and confirm the posterior covers the truth.
• Prior sensitivity test with wide and narrow priors.
• Coverage test: do 90 percent intervals contain roughly 90 percent of held out runs.
• Outlier handling test with a bad launch and a timing error.
Edit
• Build the calibration UI and the shrinking error chart over runs.
• Separate model offset from measurement noise.
Improve
• Report information gain per physical test.
• Run a power analysis to set the number of paired runs before testing.
Add
• Paired design protocol: alternate baseline and candidate, same cartridge batch, same lane, confidence interval on the difference.
• Lane A versus lane B and cartridge batch comparison with a t test or a Bayesian equivalent.
• Reaction time statistics: mean, standard deviation and trend.
• Sensitivity analysis with SALib (Sobol and Morris) on the calibrated race model.
Section 8 extras: Test
• Simulation based calibration to confirm the Bayesian machinery returns correct posteriors.
• Check convergence diagnostics (effective sample size, R hat) if sampling is used.
• Check that posteriors shrink with more data and do not collapse to false certainty.
• Test with deliberately biased data to see whether model discrepancy is detected.
• Test the effect of reaction time variation on total race time statistics.
Section 8 extras: Edit
• Write the priors for CdA, Crr, thrust scale and friction with a source or reason for each.
• State the decision rules for accepting a result as significant before collecting data.
Section 8 extras: Improve
• Report effect sizes and intervals, not only p values.
• Use paired and blocked analysis wherever runs can be paired.
• Show a plain language summary next to each statistical result.
Section 8 extras: Add
• Posterior predictive checks that compare simulated data with measured data.
• Bayesian model comparison between friction models.
• Control charts for repeat runs to detect drift in the track or cartridges.
• Bootstrap intervals as an independent cross check on the Bayesian ones.
Section 8 extras: Remove
• Any claim of significance from a single run or an underpowered comparison.
9. Structural analysis
Test
• Beam FEM against closed form cantilever and simply supported solutions.
• Model the rule load tests: halo 1 kg, wheel 100 g, tether guide 200 g.
• Compare predicted deflection with a physical load test on a printed or machined part.
Edit
• Replace assumed material properties with measured or datasheet values for the real block, resin or foam.
Add
• CalculiX 3D analysis for the halo and wing mounts only, with a mesh convergence check.
• Safety factor display for each tested component.
Section 9 extras: Test
• Mesh convergence on stress and deflection for every 3D model.
• Boundary condition sensitivity: change supports and loads slightly and record the effect.
• Compare beam FEM with 3D FEA on the same part to bound the beam assumptions.
• Check material orientation effects if the material is anisotropic or printed.
• Destructive test of a spare part to find the true failure load.
Section 9 extras: Edit
• Record material source, datasheet reference and test method for every property used.
• State load cases from the regulations with their exact magnitudes and positions.
Section 9 extras: Improve
• Report safety factors and the margin to rule limits in one table.
• Plot deflection and stress fields with consistent colour scales across variants.
Section 9 extras: Add
• Vibration or impact check for launch loads on the wings and axles if relevant.
• Fatigue is not needed for a single race, so state the reason and move on.
• A structural improvement story: a before and after change with a measured result, since judges reward proven improvements from analysis.
Section 9 extras: Remove
• Any structural result with assumed material properties that is not labelled as an assumption.
10. Physical testing programme
• Mass: weigh every part and the assembled car with a calibrated scale, log scale error.
• Dimensions: measure every FORGE dimension with calipers, log tool and operator, compare with CAD.
• Coast down or tow test for drag and rolling resistance, with repeat runs and gate timing.
• Thrust test: measure cartridge thrust curves for several cartridges at 21 C.
• Tether friction test on the real track or a mock lane.
• Launch repeatability test.
• Wheel and axle friction spin down test.
• Load tests from the rules on the physical car.
• Surface finish and tolerance check after machining or printing.
• Run the sealed prediction protocol: seal, test, compare, record the miss or hit and diagnose.
11. Evidence and verification (ATLAS)
Test
• Hash chain integrity: change one byte of any record and confirm verification fails.
• Sealed prediction: confirm timestamp token, hash and public verify page agree.
• Lineage graph loads real records only, with no invented nodes.
• Large evidence store performance test.
Edit
• Register the rule PDFs, the baseline car and every CFD run in the store.
• Link every action in the app to an evidence record.
Add
• Real RFC 3161 token from a public authority, plus OpenTimestamps as a second anchor.
• QR code on the final slide that opens the verify page.
• Signed git tag on the commit that contains the sealed prediction.
• Evidence timeline for the project management criterion.
12. Report, Presenter and judge experience
Test
• Generate the PDF from a clean state and check every figure, unit and provenance badge.
• Run the Presenter end to end with a timer, twice, offline.
• Have someone who has never seen the app follow the judge walkthrough and time it. Target: full evidence chain inspectable in under three minutes.
Edit
• Align the scoring checklist to the 1,000 points: Racing 250, Design and Engineering 180, Enterprise 180, Scrutineering 160, Verbal 140, Project Management 90.
• Link each judging item to the screen or page that proves it.
Remove
• Any slide or page with a number that has no provenance label.
Add
• Speaker notes for every slide.
• One page innovation summary: baseline, change, predicted effect, measured effect.
• Likely judge question and answer sheet for every module.
• Backup copy of the deck, PDF and demo video on a USB drive and a second laptop.
13. UI and UX quality bar
• One job per screen with at most one side panel.
• Neutral greys, one accent for active states, hairline borders, no glow.
• Inter for text, JetBrains Mono for numbers, tabular figures.
• Components from shadcn or Base UI only.
• Skeleton loading, empty and error states on every panel.
• Keyboard shortcuts and command palette tested.
• Accessibility: contrast, focus rings, labels, reduced motion setting.
• Chart theme: dark plot, one accent per series, hairline grid, units, source badge, PNG and SVG export.
• Colour maps: diverging blue white red for Cp, never rainbow for diverging data.
• Motion limited to 150 ms ease out.
• Responsive check at 1440, 1024 and 375 pixels with no horizontal overflow.
14. Open source actions
• Adopt: SALib for sensitivity, Optuna and scipy.stats.qmc for baseline comparison, pymoo for the Pareto front.
• Keep: OpenFOAM, build123d, vtk.js, Chili3D, Typst, ECharts, uPlot, React Flow, postprocessing, drei.
• Evaluate: BoTorch as a cross check, ArviZ for posterior diagnostics, FoamPilot run wizard patterns, F3D turntable video, dockview for layout.
• Reference only: OpenMDAO, trame, SU2.
• Add CalculiX only with real material data.
• For every adapted component, record upstream revision, original path, licence notice and destination path in THIRD_PARTY.md.
• Review remaining custom replay and timing code against upstream components for further reuse.
15. Remove list (consolidated)
• AR car view, photo scrutineer, video test lab, as built photogrammetry twin, community calibration, competitor scraping, exhaust base bleed study.
• Old R3F flow view and its dead code.
• Duplicate status badges and duplicate charts.
• Rejected runs as any default.
• Long what if slider stacks on the main Race screen.
• Extra race effects beyond the current replay.
• Placeholder, draft and demo labels from final outputs.
• Dead dependencies reported by knip.
16. Add list (consolidated, ranked)
• Closed design loop with constraint filtered recommendation and CFD feedback.
• Noise aware GP and fair optimiser benchmark.
• Accepted CFD campaign with grid study, speed sweep and uncertainty.
• Drag decomposition and run versus run delta.
• Calibration UI and paired physical test protocol.
• Dimension overlay in CAD for rule failures.
• Tolerance stack up and pass probability.
• Expected racing points objective in ORACLE.
• Race day mode and instant calibration update.
• Sealed prediction with public verify page and QR code.
• Judge walkthrough and answer sheet.
• Sensitivity analysis with SALib.
• Beam FEM validation and optional CalculiX for load tests.
17. Innovation definition of done (eight items)
• The actual competition car is imported and rule checked.
• ORACLE generates a legal candidate automatically.
• Accepted CFD compares baseline and candidate.
• ORACLE is benchmarked against simple search at equal budget.
• Predicted race times carry justified uncertainty.
• At least one real test is compared with a sealed prediction.
• Physical measurements validate key compliance claims.
• A judge can inspect the full evidence chain in under three minutes.
18. Final release gate
• All FAIL items closed or explicitly cut.
• Software freeze date reached and tagged.
• Full clean clone and offline rehearsal passed.
• Physical car re measured against the final FORGE sheet.
• Backups made and verified on a second device.
• Presenter rehearsed with timings and Q and A.
• Final sealed prediction hash published before the event.
19. Items missed earlier: add these to the sections above
19.1 Cross module integration tests
• Design to rules: change one dimension in CAD, save, and confirm FORGE updates the affected rule, margin and points at risk without manual refresh.
• Design to CFD: the exact saved STEP hash used in a CFD run is recorded, and a run refuses to start if the design has changed since the mesh was built.
• CFD to race: an accepted Cd and frontal area flow into TITAN with their uncertainty, and a rejected run cannot reach TITAN.
• Race to calibration: a measured time updates CdA and Crr posteriors, and the next prediction visibly uses them.
• ORACLE to FORGE: a candidate that fails any performance rule is never sent to the mesher.
• Evidence to report: every figure in the PDF links back to a record and the link resolves.
• Stale data test: change an upstream input and confirm every dependent result is marked stale, not silently reused.
• Single source of truth test: car mass, wheel radius, track length and cartridge data are defined once and read everywhere.
19.2 Acceptance gates for each major claim
• Claim: this design is legal. Gate: FORGE sheet complete, every manual item physically measured and signed.
• Claim: this design is faster. Gate: accepted CFD with grid uncertainty, plus a paired physical result with a confidence interval.
• Claim: the optimiser works. Gate: equal budget benchmark over at least 10 seeds with pre registered protocol.
• Claim: the prediction is trustworthy. Gate: calibration coverage on held out runs and a sealed prediction made before the test.
• Claim: the evidence is tamper proof. Gate: independent verification by a person outside the team using only the public page.
19.3 Additional physical and measurement items
• Measurement system analysis: have two people measure the same part three times each and compute repeatability, so you know the real measurement error before claiming millimetre margins.
• Scale calibration check with a reference mass before every weighing session.
• Temperature and humidity log for every test day, since cartridge pressure at 21 C and air density affect results.
• Cartridge batch tracking: record batch, weight before and after, and temperature for every shot.
• Track surface and lane inspection photo log, with tether alignment and pulley condition.
• Wheel true running and axle alignment check before every test.
• Take a photo of every measurement setup so each number has visual proof in the portfolio.
20. Best additions to maximise innovation and points
20.1 Scientific credibility upgrades
• Verification and validation dossier: one page per model stating what it is, what it was checked against, the result and the remaining gap.
• Uncertainty budget table for race time: CFD error, thrust variance, mass, friction, reaction and timing, each with its share of total variance.
• Prediction scoreboard across every run showing predicted band versus measured, coverage rate and error trend.
• Pre registered hypotheses: write what you expect before each test and seal it, then report hits and misses honestly.
• Negative results log: record every idea that failed and why, which judges read as engineering maturity.
• Design of experiments (fractional factorial) for the physical tests so few runs reveal the main effects.
• Minimum detectable effect calculator shown beside every comparison so claims never exceed what the data can resolve.
• Reproducibility package: a single archive with inputs, seeds, scripts and expected outputs that anyone can rerun to reach the same numbers.
20.2 Engineering decision features
• Decision log: for every design change, the question, options, evidence, decision, owner and date, linked to evidence records.
• Change value table: milliseconds gained per gram, per square centimetre of CdA and per 0.001 of rolling resistance, so every proposed change has a price tag.
• What to test next ranking by expected information gain per hour of effort.
• Risk register with points at stake, probability, mitigation and owner for rules, manufacturing, testing and logistics.
• Spare parts and rework plan: what is made twice, tolerances for rework, and time to remake any part.
• Manufacturing route comparison (CNC, print, hand finish) with tolerance, mass, surface and time for each part.
• Weight reduction and ballast placement study for centre of gravity and stability.
• Wheel and axle friction optimisation study as a cheap, measurable gain.
• Launch and tether alignment study since launch variability can exceed aerodynamic gains.
20.3 Presentation and judge impact
• One memorable demonstration: baseline versus candidate side by side with legality margin, Cd or CdA, predicted time, measured time and experiments used.
• Sealed prediction reveal moment with QR verification, rehearsed to the second.
• Three tiered story: 30 second pitch, 3 minute walkthrough, 10 minute deep dive, each ready on demand.
• Judge question bank with answers for at least 60 likely questions on physics, rules, statistics, software and teamwork.
• Role cards: who speaks to which module, and a backup speaker for each.
• Honest limitations slide, because naming limits before judges do builds trust.
• Printed one page evidence map with QR codes to each key record.
• Short recorded demo video with captions as a fallback and as portfolio material.
20.4 Team and project management evidence (90 points)
• Gantt or timeline from the real evidence log, showing planned versus actual dates.
• Meeting minutes and action logs with owners and closure dates.
• Budget and cost tracking for materials, machining and tools, with actual receipts.
• Compute and effort log: CFD hours, runs per week, and person hours per module.
• Risk reviews held at fixed intervals with the register updated each time.
• Lessons learned entry after every test day.
20.5 Enterprise and sponsorship evidence (180 points)
• Link every software capability to a stakeholder benefit that sponsors can understand.
• Sponsor report template with measurable outcomes and the evidence behind them.
• Open source contribution or documentation published from the project, if the team wishes to show community impact.
• Cost of the tool versus commercial alternatives, with the saving stated and sourced.