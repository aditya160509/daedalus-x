# T07 — AETHER Design Studio

**Spec:** Appendix B.2, §7.3 (Design workspace) · **Lane:** frontend-3d · **Files:** `src/app/design/*`, `src/components/viewer/CarViewer.tsx` (split into `components/viewer/design/*`), `src/lib/gltf.ts`

## Build
1. **Studio Render** mode, the default:
   - Car materials are overridden per group: body as glossy paint (`meshPhysicalMaterial` clearcoat 1, clearcoatRoughness 0.08, metalness 0.1, team colour) with satin wings, rubber wheels (roughness 0.9) and brushed metal for the cartridge.
   - Lightformer studio environment (three softboxes plus a rim), `AccumulativeShadows` with `RandomizedLight`, and a `MeshReflectorMaterial` floor at low strength.
   - A turntable toggle at 6°/s.
2. **Engineering** mode: the current neutral look with part colours by force group, edges via `<Edges threshold={20}>`, and the grid.
3. **Exploded View**: a slider 0–1 moves each part along (part centroid − car centroid) × k with spring easing (`maath/easing.damp3`, which ships with drei). Labels via drei `<Html>` appear when exploded > 0.3.
4. **Measure Callouts**: length, width and height dimension lines with arrowheads and mm labels drawn in 3D. Add a click-two-points measure tool that snaps to the nearest vertex and shows distance and Δx/Δy/Δz. Mark these "approximate (display mesh)".
5. **Part inspector**: the right panel shows the selected part's name, group, triangle count, bounding box (mm) and volume (if watertight, else "not watertight", read from `geometry.json` warnings).
6. **Design switcher**: a dropdown of `/v1/designs`, plus side-by-side compare of two designs with synced cameras.
7. **Snapshot**: a PNG export at 2× resolution (`gl.domElement.toDataURL` after rendering one frame with `preserveDrawingBuffer`).

## Acceptance
- [ ] Mode switch, explode, measure and snapshot work by code review. Unit-test the explode offset math and the measure snapping.
- [ ] No regressions to GLB drag-and-drop import.
- [ ] Materials and lights live in `components/viewer/design/studio.ts` as named constants.

## References
- drei AccumulativeShadows / RandomizedLight: https://drei.docs.pmnd.rs/staging/accumulative-shadows
- drei MeshReflectorMaterial: https://drei.docs.pmnd.rs/shaders/mesh-reflector-material
- R3F examples (car showroom / studio lighting patterns): https://r3f.docs.pmnd.rs/getting-started/examples
