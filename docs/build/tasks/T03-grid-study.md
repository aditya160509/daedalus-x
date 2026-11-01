# T03 — Grid study and speed check

**Spec:** §4.2a (grid verification), §4.3a (speed sensitivity) · **Lane:** backend-cfd · **Depends:** T01 · **Files:** new `src/daedalus/gridstudy.py`, `cli.py`, `api/engineering.py`, `tests/test_gridstudy.py`, `SimulateWorkspace.tsx` (new panel only)

## Build
1. `gridstudy.py`:
   - Generate three meshes with a constant refinement ratio r ≈ 1.5 on `base_cell_m` (coarse, medium and fine, where fine = `final`). Everything else is equal, and all use T01's averaged acceptance.
   - Compute the **Richardson extrapolation** and **GCI** (Roache / ASME V&V 20 form, Fs = 1.25): observed order p, extrapolated Cd, and GCI_fine in %. Detect oscillatory or divergent convergence (ratio R = ε21/ε32 outside 0..1) and report it as such instead of producing nonsense p.
   - **Speed check**: runs at 15, 20 and 25 m/s on the medium mesh. Fit Cd(Re) linear in log Re and report the slope and whether Cd is Re-insensitive within its CI.
2. Submit runs as **jobs** (T02) so they queue one at a time: `daedalus grid submit --design … --prefix …`. `daedalus grid report --prefix …` reads finished runs and writes `data/studies/<prefix>/grid.json`.
3. API `GET /v1/studies` and `GET /v1/studies/{id}`.
4. UI: a "Grid study" panel in Simulate with a Cd vs cell-count chart (log x) carrying CI error bars, the extrapolated Cd as a dashed line, a GCI badge (green ≤ 3%, amber ≤ 5%, red otherwise), and the speed-check mini chart.

## Acceptance
- [ ] Tests: the GCI against the worked example in Celik et al. (2008) Table 1 reproduces p, φ_ext and GCI to 3 significant figures. Detection of oscillatory and divergent cases.
- [ ] Run the study on `quick`-derived ratios only if the machine is idle. Otherwise submit the jobs and hand off with them queued (state that in the evidence note).

## References
- Celik et al. 2008, *Procedure for estimation and reporting of uncertainty due to discretization in CFD applications* (J. Fluids Eng.): https://doi.org/10.1115/1.2960953
- NASA GCI explanation: https://www.grc.nasa.gov/www/wind/valid/tutorial/spatconv.html
