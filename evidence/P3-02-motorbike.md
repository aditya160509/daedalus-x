# P3-02 (first slice) — OpenFOAM works on the Mac: motorBike reference case
Owner: Claude     Commits: see git log     Date: 2026-10-30

## Done
- Installed OpenFOAM v2606 (OpenCFD/ESI) via OpenFOAM.app (Homebrew cask gerlero/openfoam, v2.2.3, arm64). Download sped up with aria2 after a slow GitHub link.
- Ran the unmodified tutorial `incompressible/simpleFoam/motorBike` end to end: surfaceFeatureExtract → blockMesh → decomposePar → snappyHexMesh (6 processes) → potentialFoam → simpleFoam (500 iterations, k-ω SST) → reconstruct.

## Results
| Quantity | Value |
|---|---|
| Mesh | 353,525 cells |
| Total wall time (mesh + solve) | 376 s |
| simpleFoam solve | 113 s clock |
| Cd (total) | 0.4185 (pressure 0.4038, viscous 0.0147) |
| Cl | 0.0694 |
| Cd, last 400 iterations | oscillates 0.4182–0.4206 (±0.3%) |

## Checks run (command → result)
- `openfoam -c ./Allrun` → exit 0, all logs present (data/runs/motorBike/log.*, not committed)
- checkMesh → 1 failed check: max skewness 9.46, 12 highly skewed faces. This is the stock tutorial mesh; our template must pass checkMesh cleanly.

## Acceptance criteria
- [x] OpenFOAM runs on the target Mac; meshing, parallel solve and force extraction work
- [x] Runtime recorded (~6 min for ~0.35 M cells on 6 cores)
- [ ] Daedalus case template (half-car symmetry, per-part forces, convergence stop) — next
- [ ] `daedalus cfd run <design_id>` via foamlib + job runner — next
- [ ] Clean checkMesh — required for our template

## Data provenance
- Geometry and setup: OpenFOAM's bundled tutorial (motorBike.obj). Simulated, reference only; not Veloira data.

## Review
Reviewer: Claude   Verdict: ACCEPTED (first slice)
