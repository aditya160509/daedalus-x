# Step 5 — Race replay rebuild (Order 3)

Implemented 2026-11-02. The existing real GLB pipeline was retained. Corrected engineering Z-up to Three Y-up conversion and positioned the car by its leading point. Wheel pivots rotate with distance/radius. Body paint, metallic cartridge/supports and translucent comparison materials preserve actual geometry.

Added two-lane track/tether guides, five start lights, eight timing marks and checker finish; studio lighting/reflection with adaptive quality, SMAA and restrained bloom; director, side, chase, onboard, top and finish cameras. The finish view expands to include a slower comparison. Photo-finish playback covers the last 0.2 s at one-eighth speed, with a frozen crossing and PNG export action.

Replay includes configuration comparison rather than a separate Ghost tab. Geometry selection is explicitly display-only; motion uses the selected model configuration. Timing sectors follow the cursor with a legend. Corrected nearly-equal finish positions so ranking uses finish times rather than floating-point distance noise. Reaction is not supplied; launch puff is illustrative. No synthetic data presented as measured.

Licences checked before source use: racing-game MIT, f1-dash AGPL-3.0 and postprocessing Zlib. Adaptations, pinned source revisions and retained licence texts are in THIRD_PARTY.md and docs/build/references/ORDER-3.md.

Validation: TypeScript passes; targeted Oxlint no errors (static sector index warnings remain); ten existing raceMath tests pass. Live 1440×900 rendering and photo-finish action checked; 375 px page scroll width was exactly 375 px. Fresh navigation showed no console errors and one upstream THREE.Clock deprecation warning. Comparison chart mounts correctly after asynchronous data arrival (fresh navigation confirmed). Screenshots local under output/playwright/replay-*.png.

Acceptance still pending: 60 fps on the physical Mac and full final QA. No performance claim made from a screenshot. API and frontend stopped after checking; no CFD campaign run.
