# T05 — Adjoint drag sensitivity map

**Spec:** Appendix B.3 #7 · **Lane:** backend-cfd · **Depends:** T01 (needs an accepted or near-accepted primal) · **Files:** new `src/daedalus/adjoint.py`, `cli.py`, `viz.py` (one new layer), `tests/test_adjoint.py`

## Why
This colours the car surface by how much drag changes if that patch of skin moves outward. It's the headline feature of commercial optimisers, and it tells the designer *where* to change the car. OpenFOAM v2606 ships `adjointOptimisationFoam` for free.

## Build
1. Study the bundled tutorial first: `openfoam -c 'ls $FOAM_TUTORIALS/incompressible/adjointOptimisationFoam/sensitivityMaps'`. The motorBike sensitivity-map case is the template. Read the user manual (link below).
2. `adjoint.py`:
   - Copy a finished primal case into `<run>_adjoint/`; never mutate the primal.
   - Write `system/optimisationDict`: an incompressible, steady, single-point objective `forceCoeffs`-type drag on the car patches with direction (1 0 0), and a sensitivity type `surfacePoints` (or `ESI` "sensitivityMaps" as in the tutorial). Use frozen turbulence (`adjointTurbulenceModel adjointLaminar;`) for robustness, and record it as an assumption.
   - Run `adjointOptimisationFoam` with ≤ 8 ranks, for 1000 adjoint iterations or until the residuals drop 3 orders.
   - Read the face sensitivity field (`faceSensFlowDrag` / `sensSurfaceDrag` naming per version: discover it from the time directory, don't hard-code).
3. Export the layer `sensitivity` in `viz.json`: per-vertex dCd/dn (outward), normalised by its 99th-percentile magnitude, mirrored, with a diverging range symmetric about 0.
4. Add the manifest note "frozen-turbulence adjoint; sign: positive = pushing the surface outward increases drag".

## Acceptance
- [ ] A unit test generates `optimisationDict` and it parses with foamlib.
- [ ] Field discovery is tested against a fixture directory listing.
- [ ] Run once on the T01 quick case in the background. The evidence note includes an image the reviewer can compare with the OpenFOAM motorBike sensitivity figure: high sensitivity at the nose, wheel fronts and wing tips is the expected pattern.

## References
- adjointOptimisationFoam user manual (v2312): https://www.openfoam.com/documentation/files/adjointOptimisationFoamManual_v2312.pdf
- v2312 numerics (smoother sensitivity maps): https://www.openfoam.com/news/main-news/openfoam-v2312/numerics
- Hands-on slides: https://events.grnet.gr/event/153/contributions/715/attachments/486/798/3.%20AdjointOptimFoam%20-%20HandsOn%20-%20Evangelos%20Papoutsis-Kiachagias.pdf
- Example repo: https://github.com/mjennings2/open-foam-adjoint-analysis
