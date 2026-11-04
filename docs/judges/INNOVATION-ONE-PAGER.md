# Innovation one-pager

**One line:** Daedalus X connects CAD, rule checks, CFD and race prediction, then seals a race-time interval before the run so the prediction can be scored honestly afterwards.

## The engineering problem

A small race team usually designs in CAD, runs one CFD picture, builds the car and races it. Three things are missing:

- **No decision loop.** Design changes are chosen by intuition, not by the next most useful test.
- **No shared identity.** CAD, CFD, rule checks and race times sit in separate files, so nobody can say which run belongs to which car.
- **No pre-commitment.** A graph or number can be edited after the race, so a good-looking result is not evidence of a good prediction.

## The connected workflow

| Step | What the app does now | Basis |
|---|---|---|
| Design | Opens a patched Chili3D CAD workspace and saves a design with its geometry | Upstream CAD, connected by us |
| Rules | Checks the sourced India NF 2025-26 rulebook, keeps unsupported rules in manual review and exports PDFs with source hashes | Our checks on the sourced YAML |
| CFD | Shows solver fields, forces, convergence and mesh status per run, including acceptance state | OpenFOAM output through existing viewers |
| Optimise | Fits a Gaussian process, proposes the next design by expected improvement and compares equal-budget methods | SciPy, NumPy and native Optuna in a registered study |
| Race | Turns drag into a race-time distribution and stores a sealable prediction | Our lumped-parameter model |
| Evidence | Hashes stored artifacts and re-checks the bytes on a verify page | SQLite store plus qrcode.react links |

The useful integration is the hand-off between those steps: a saved design has geometry and rule results; a CFD run has a manifest; a prediction has a manifest hash; evidence records point back to the same identifiers.

## What our team built

- The design/rule/CFD/prediction/evidence state model and its API.
- FORGE rule checks against the sourced rulebook, including page numbers, penalties, CAD-only states and manual-review states.
- The sealed-prediction workflow and the verification page that compares a recorded digest with freshly read bytes.
- The ORACLE Gaussian-process loop and its equal-budget benchmark harness.
- Native UI integration for ECharts, TanStack Table, uPlot, React Flow/Dagre, vtk.js and Dockview panels.

We did **not** write OpenFOAM, the CAD kernel, the chart engines, the optimisers or the PDF typesetter. Those are credited below.

## Actual open-source work and credit

| Component | Licence | Use here |
|---|---|---|
| Chili3D + OpenCascade | AGPL-3.0 | Patched CAD workspace; upstream rebuilt, not authored by us |
| OpenFOAM | GPL | CFD solver; the app reads its output |
| vtk.js, PyVista | BSD-3-Clause | 3D flow and surface rendering |
| ECharts | Apache-2.0 | Aero map, benchmark, risk and beam charts; native PNG export |
| TanStack Table v9 | MIT | Benchmark, rule-risk and study-comparison tables |
| Optuna + cmaes | MIT | Native TPE and CMA-ES in the registered benchmark |
| SciPy, NumPy | BSD-3-Clause | GP fitting, Sobol/LHS sampling, Student-t intervals |
| Typst | Apache-2.0 | Report, scrutineering sheet and compact summary PDFs |
| React Flow + Dagre | MIT | Evidence lineage layout |
| uPlot | MIT | Telemetry rendering |
| Dockview React | MIT | Pit Wall docking layout |
| qrcode.react | ISC | SVG verification QR |

Full notices and pinned versions are in `THIRD_PARTY.md` and `docs/licenses/`.

## Evidence available today

- **Software evidence:** focused Python and TypeScript tests cover the rule-risk calculations, normalised margins, row-level outlier mapping, saved-study comparison, source identity and null-safe beam cases. TypeScript, Ruff and focused lint pass at the 2026-11-04 checkpoint.
- **Printable evidence:** the engineering report, full scrutineering sheet and compact summary compile to PDF. The report and sheet print the full rulebook SHA-256, geometry SHA-256, code commit with dirty/clean state and generation time. The YAML identity is explicitly separated from an archived official PDF.
- **Rule evidence:** the current reference design produces 80 rule rows: 3 CAD-only passes, 3 at risk, 0 CAD fails and 74 manual-review rules. Those are CAD screening counts, not scrutineering approval.
- **Optimiser evidence:** a registered, equal-budget synthetic benchmark compares GP/EI with native Optuna TPE/CMA-ES and SciPy Sobol/LHS/random. It is evidence about software behaviour on a toy objective, not about this car.
- **Verification evidence:** stored artifacts can be re-hashed and checked against a pinned digest; missing, corrupt and changed records do not show a match.

## Baseline, change, prediction, measurement

| | Statement | Status |
|---|---|---|
| **Baseline** | Design by intuition, one CFD image, rules checked by hand, race result explained afterwards | Current practice described, not measured here |
| **Proposed change** | Connect CAD → rules → CFD → prediction → evidence; seal the prediction before the run | Software built and inspectable |
| **Prediction** | The loop should reduce wasted CFD cases and surface rule risk earlier; a sealed interval should be scored honestly against a measured run | Hypothesis; **no measured speed-up is claimed** |
| **Measurement** | Compare predicted and measured race time, count accepted CFD runs per design, and record rule risks found before manufacture | **Pending** |

## Current limitations

- ORACLE observations are synthetic or mixed. There is no accepted current-car drag campaign supplying them yet.
- FORGE is CAD screening. Mass, tether guide and other physical rules remain manual review.
- CFD is simulation. No accepted current-car three-mesh GCI study is established here.
- The race model is a lumped-parameter prediction with an assumed thrust curve, not a measured race result.
- The beam view uses handbook material values and an Euler–Bernoulli cantilever simplification.
- **Automatic accepted-only CFD feedback into ORACLE is still unfinished.** A run being present does not mean it has been accepted into the training set.
- No independent measured race has scored a sealed prediction; no official rule PDF is archived by the exports.
- The 60-question Q&A bank, recorded fallback video, public hosting and physical-GPU QA remain open.

## Next measurable success criterion

One accepted real CFD case for the current car, stored with its acceptance record, followed by a sealed race-time interval and an independent measured run. Success means the measured time falls inside the sealed interval **and** the prediction artifact’s hash still verifies. Until both are recorded, this is a connected engineering workflow with synthetic and CAD-only evidence, not a validated race prediction.

**Sources:** `docs/innovation.md`, `evidence/CHECKPOINT-2026-11-04.md`, `evidence/ORACLE-native-benchmark.md`, `evidence/ATLAS-artifact-verification.md`, `evidence/ORDER-1-india-forge.md`, `THIRD_PARTY.md`.
