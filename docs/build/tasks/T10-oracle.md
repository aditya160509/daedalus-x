# T10 — ORACLE: next-best-experiment optimisation

**Spec:** §3 (all), §12.2c · **Lane:** backend-ml + frontend-2d · **Depends:** T02 (jobs), T03 (trustworthy CFD) · **Files:** new `src/daedalus/oracle/` (`space.py`, `campaign.py`, `objective.py`, `benchmark.py`), `src/daedalus/parametric.py`, `api/oracle.py`, `src/app/optimize/*`

## Build
1. **Parametric car family** (`parametric.py`, build123d):
   - A STEM Racing–legal car family with 4–6 continuous variables, e.g. `front_wing_span_mm`, `front_wing_aoa_deg`, `body_taper`, `nose_height_mm`, `rear_wing_chord_mm`, `fillet_radius_mm`.
   - Generate the STEP → reuse `geometry.import_car` → design dir. Deterministic for identical parameters (hash them into the design id).
   - Bounds come from rules (T11 when available, else documented constants).
2. **Search space and campaign** (`oracle/space.py`, `campaign.py`):
   - Ax `Client` API (current Ax; pin the version) with a seeded Sobol/LHS initial design (`scipy.stats.qmc.LatinHypercube`, 8 points).
   - GP surrogate on **CdA** (from accepted CFD), with noise from the T01 CI.
   - Persist the Ax experiment JSON in `data/oracle/<campaign>/` plus an EvidenceStore `Experiment` record per trial, keeping failures.
3. **Composite objective** (`objective.py`), as spec §3.3 "Composite-objective execution decision":
   - Build a seeded candidate set of 2000 LHS points that pass hard checks.
   - Draw posterior CdA samples (consistent per candidate) and push them through a frozen TITAN config using `montecarlo.race_times` (vectorised over candidates × samples).
   - Compute log-EI on negative race time against a sampled incumbent baseline.
   - Return top-k with expected gain (ms), probability of improvement, uncertainty and the reason ("under-sampled region: front_wing_aoa"; nearest tested design distance).
4. **Approval flow**: a recommendation has the state `proposed` and the student clicks **Approve** to submit a `cfd_run` job (T02) with autonomy label `approved_automated_simulation`. Results auto-ingest when the job finishes (acceptance must be accepted; rejected runs are kept as failed trials).
5. **Benchmark** (`benchmark.py`): ORACLE vs seeded LHS under the same budget on an **analytic surrogate problem** (cheap, so it runs in CI) and later on real CFD. Report best-found against evaluations with seeds 0–9 and median/IQR bands.
6. **UI** (Optimize workspace):
   - **Design Map**: 2D projection (choose two parameters, or a PCA view) of tested designs as dots coloured by CdA, with the GP mean as a background heatmap, uncertainty as contour lines, and the recommended next point as a pulsing ring.
   - **Next-Best Card**: parameters, expected gain ± uncertainty, the reason text, estimated CPU minutes, rule checks, and Approve / Reject (with reason).
   - **Campaign timeline**: trials in order with state chips.
   - Benchmark chart.
   - Every figure is labelled `illustrative` until there are at least 8 accepted real trials (spec §3.4).

## Acceptance
- [ ] Reproducibility test: identical inputs and seed give identical proposals.
- [ ] The composite objective never produces a time for a non-finishing trajectory.
- [ ] The benchmark on an analytic function (e.g. a shifted Branin mapped to CdA) shows ORACLE ≤ LHS median regret at budget 20.
- [ ] Runtime: proposal generation ≤ 10 s on this Mac.

## References
- Ax docs: https://ax.dev/docs/
- BoTorch models: https://botorch.org/docs/models
- Custom BoTorch model in Ax: https://archive.botorch.org/tutorials/custom_botorch_model_in_ax
- SciPy QMC LatinHypercube: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.qmc.LatinHypercube.html
- build123d: https://build123d.readthedocs.io/
