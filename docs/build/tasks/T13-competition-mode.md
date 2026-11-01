# T13 — Competition Mode, one-click PDF report, AR view

**Spec:** §7.8, Appendix B.5 #6–8 · **Lane:** frontend (+ small backend) · **Depends:** T06, T08, T12 · **Files:** `src/app/competition/*` (new route), new `src/daedalus/report/` (Typst templates), `api/report.py`, `src/components/ar/*`

## Build
1. **Story Deck (Competition Mode)**: route `/competition`, full screen and keyboard driven (←/→, `Esc` exits, `P` for presenter notes).
   - Slides are **live components**, not screenshots:
     1. Problem and car (Design Studio render, turntable)
     2. Wind tunnel (flow scene with a preset camera path and layers)
     3. Where the drag is (build-up chart and adjoint map)
     4. Race prediction (telemetry plus spread fan, sealed-prediction badge)
     5. ORACLE decision (next-best card and design map)
     6. FORGE compliance (rules summary and hotspots)
     7. Evidence (timeline and verified hashes)
     8. Results (prediction scorecard)
   - Each slide shows only accepted data, or carries the rejection/illustrative banner.
   - A presenter timer and slide progress dots. Smooth 300 ms crossfades (`motion`), and none under reduced motion.
   - **Offline-safe**: preload every slide's data on entry and show a "ready" checklist before starting.
2. **One-click report** (`report/`):
   - A **Typst** template (`report.typ` with Jinja2 placeholders) producing an engineering report: cover, summary, geometry, CFD method plus grid study (GCI), results with figures, race model and calibration, ORACLE campaign, FORGE compliance table, evidence appendix (hashes), assumptions and limitations.
   - Figures are rendered server-side as PNG: matplotlib (add the dependency) for charts, and the current 3D view captured from the browser and uploaded with the request.
   - `POST /v1/report` returns a PDF and also stores it as an evidence artifact.
   - Typst is installed with `brew install typst`. Detect it on PATH and give a clear error if missing.
3. **AR view**: a `<model-viewer>` web component page `/ar/[design]` that loads the design GLB with `ar ar-modes="webxr scene-viewer quick-look"`.
   - Optional "with flow" variant: bake streamlines into the GLB as line primitives via a backend `GET /v1/designs/{id}/ar.glb?run=`, built with trimesh, merging the car and the decimated streamlines coloured by speed.
   - Show a QR code (generated locally with the `qrcode` npm package) for opening on a phone on the same LAN.

## Acceptance
- [ ] Report: a Typst compile test on a minimal fixture (skipped if typst is absent). Jinja escaping is tested for user text.
- [ ] AR GLB is ≤ 15 MB, and a trimesh round-trip test passes.
- [ ] Deck: unit test for the slide-readiness checklist logic.

## References
- Typst automated generation: https://typst.app/blog/2025/automated-generation/
- Python + Typst pattern: https://rendercv.com/blog/generate-pdfs-python-typst
- model-viewer: https://modelviewer.dev/ and https://github.com/google/model-viewer
- ARCore WebXR with model-viewer: https://developers.google.com/ar/develop/webxr/model-viewer
