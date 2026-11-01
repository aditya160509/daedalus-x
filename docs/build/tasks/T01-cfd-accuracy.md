# T01 — CFD accuracy: rotating wheels, mesh quality, unsteady-aware acceptance

**Spec:** §4.2, §4.2a, §4.3, §4.5 · **Lane:** backend-cfd · **Files:** `src/daedalus/geometry.py`, `src/daedalus/cfd.py`, `tests/test_cfd_case.py`, `tests/test_geometry.py`

## Why
The first full run (`data/runs/orbit_baseline_20ms`, see `evidence/P3-02-orbit-baseline.md`) was rejected:
- Cd oscillates by **5.6%** over the last 200 iterations (the gate is 1%).
- There are **9 highly skewed faces** (max skewness 5.8).

Wheels produce 77% of the drag. They're modelled as stationary `noSlip` walls while the ground moves, which is physically wrong and drives unsteady shedding.

## Build
1. **Split wheels by axle** in `geometry.py`:
   - Classify each wheel solid by x of its centroid into `wheels_front` and `wheels_rear` (keep `wheels` as a parent group name for force reporting).
   - Record per axle `{axis: [0,1,0], origin: [x_c, 0, r], radius_m: r}` in `geometry.json["axles"]`, where r is the wheel radius from the solid's bounding box (z extent / 2).
   - Bump the geometry report schema and keep reading old `geometry.json` files that have no `axles`: those fall back to `noSlip` and add a warning to the manifest.
2. **Rotating wheel BC** in `cfd.py`:
   - For each axle patch, set `0/U` to `type rotatingWallVelocity; origin (x 0 r); axis (0 1 0); omega <U/r>;`. Sign: the wheel rolls forward relative to the ground moving at +U in the car frame. Derive the sign and assert it in a unit test with a cross product (`ω × (p − origin)` at the contact point must equal the ground velocity).
   - Add a manifest assumption: "wheels rotate with ω = U/r (no slip at contact); contact patch modelled by 0.5 mm ground offset".
   - Bump `TEMPLATE_VERSION` to `daedalus-halfcar-v2`.
3. **Mesh quality**:
   - Write an explicit `meshQualityDict` (stop relying on `#include "meshQualityDict"` from etc): `maxNonOrtho 65; maxBoundarySkewness 20; maxInternalSkewness 4; maxConcave 80; minVol 1e-13; minTetQuality 1e-15; minTwist 0.02; minDeterminant 0.001; minFaceWeight 0.05; minVolRatio 0.01; nSmoothScale 4; errorReduction 0.75;`. Reference: OpenFOAM motorBike tutorial.
   - snapControls: `nSmoothPatch 5; tolerance 2.0; nSolveIter 50; nRelaxIter 8; nFeatureSnapIter 15; implicitFeatureSnap false; explicitFeatureSnap true;`.
   - `evaluate` stays strict: any checkMesh failure means rejected.
4. **Unsteady-aware acceptance** (keep the strict gate available):
   - Add `AcceptanceMode = Literal["steady", "averaged"]`, defaulting to `"averaged"` for cars with wheels.
   - `averaged` computes the mean Cd over the last `W` = 500 iterations and its 95% CI from batch means (10 batches) with a lag-1 autocorrelation correction. Accept if `CI half-width / mean ≤ 1%`.
   - Report `cd_mean`, `cd_ci95`, `cd_window_spread` and `acceptance_mode` in `RunResult` and `daedalus_result.json`, and add them to `CfdResult` in `apps/cockpit/src/lib/api.ts` as optional fields. **Do not change UI layout.**
   - When `early_stop_tolerance` stops the run, it must not stop before `2 × W` iterations in averaged mode.
5. **Run once** in the background:
   ```bash
   uv run daedalus cfd run data/designs/orbit_baseline data/runs/orbit_v2_quick --fidelity quick --procs 8
   ```
   You may need to re-import the design so `geometry.json` has axles:
   ```bash
   uv run daedalus geometry import data/reference/team_orbit_2025/Sputnik_Assembly.step data/designs/orbit_v2 --forward -Y --up +Z
   ```
   Record the result honestly, whether accepted or not.

## Acceptance
- [ ] Unit tests cover axle split, ω sign, the meshQualityDict values parsing with foamlib, batch-means CI on a synthetic AR(1) series with a known mean, and old-geometry fallback.
- [ ] The quick run finishes with **0 checkMesh failures**. If it can't, document the remaining faces and the settings you tried.
- [ ] `evidence/T01.md` has a table comparing v1 and v2: cells, time, Cd mean ± CI, spread, acceptance.

## References
- rotatingWallVelocity: https://doc.openfoam.com/2312/tools/processing/boundary-conditions/rtm/derived/wall/rotatingWallVelocity/
- Wheel rotation modelling (Chalmers): https://www.tfd.chalmers.se/~hani/kurser/OS_CFD_2020/ErikJosefsson/Report_Erik_Josefsson.pdf
- Car validation case with moving ground and rotating wheels: https://www.wolfdynamics.com/tutorials.html?id=152
