# P3-02 — Team Orbit baseline, first full CFD run

**Date:** 2026-10-30 · **Template:** daedalus-halfcar-v1 · **Outcome:** run succeeded, result **rejected** by the acceptance gates.

## Setup
- Geometry: `data/designs/orbit_baseline` (Team Orbit 2025 STEP, CC BY, stand-in only). 214.6 × 74.3 × 46.6 mm, frontal area 25.24 cm².
- 20 m/s, simpleFoam k-ω SST, half model with a symmetry plane, moving ground, 6 MPI ranks on the Mac.
- Mesh: 782,487 cells. snappyHexMesh took 66 s; simpleFoam took 1437.6 s for 1500 iterations.

## Result
| Quantity | Value |
|---|---|
| Cd (full car, Aref 25.24 cm²) | 0.608 (last iteration) |
| Cl | 0.437 |
| Drag at 20 m/s | ≈0.369 N |
| Cd spread, last 200 iterations | **5.60 %** (gate: ≤ 1 %) |
| Component sum vs total | 2.1e-10 relative (pass) |
| checkMesh | **9 highly skewed faces, max skewness 5.82** (fail) |

Drag by component (N, full car):

| Group | Drag | Pressure | Viscous |
|---|---|---|---|
| Wheels | 0.285 | 0.283 | 0.002 |
| Front wing | 0.050 | 0.041 | 0.009 |
| Rear wing | 0.015 | 0.009 | 0.006 |
| Body | 0.012 | −0.009 | 0.021 |
| Cartridge | 0.008 | 0.008 | 0.000 |

## Interpretation
- Wheels carry about 77 % of the drag. They are bluff and stationary in this template, and their wakes shed vortices. A steady RANS solver cannot settle on unsteady shedding, which is the most likely cause of the 5.6 % Cd oscillation.
- Body pressure drag is negative, which means the body sits in a favourable pressure field. That is plausible behind the front wing, but it will not be trusted until the run converges.
- The run is **not** accepted. No Cd from it may be quoted as a result.

## Next actions
1. Model the wheels with a rotatingWallVelocity boundary condition, or reduce the shedding another way.
2. Report the mean Cd over a long window with a confidence interval (unsteady-aware gate), or switch to pimpleFoam for the final runs.
3. Fix the mesh: snapControls / meshQualityControls to clear the 9 skewed faces.
4. Use the new `--fidelity quick` preset plus early stop to iterate cheaply on items 1–3 before another final run.
