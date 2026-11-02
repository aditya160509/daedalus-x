# Step 3 — FORGE v2 CAD features

Implemented 2026-11-02. Existing height, wheelbase, wheel diameters, gap, ground clearance and overhang calculations were already present; extended rather than duplicated them.

New imports derive constant-radius cylindrical rolling bands (excluding conical chamfers), wing section thickness estimates at 21 span × 41 chord samples, and unique circular-arc centres on explicitly named halo-notch solids. Ambiguous or unnamed notch geometry remains manual. Rear-wing placement relative to plane B now computes, with a conservative upper height bound for overhanging parts.

Existing revisions can use “Measure CAD features”. The derived sidecar is bound to both original STEP and geometry hashes; original geometry is unchanged. Sampled/bounding estimates never prove a pass. Manual-only rules prevent an overall green CAD-pass banner.

Real orbit_v2 remeasurement: six parts yielded features. Front/rear rolling bands 16.50 mm (rear at risk against 17 mm); estimated wing extremes 16.15 mm front and 1.69 mm rear (manual surface audit required); rear-wing plane-B margin −3.74 mm. Halo remained manual. These are CAD findings, not physical measurements. The STEP tessellator reported one skipped face, reinforcing the manual status of sampled wing estimates.

Validation: analytic chamfered-cylinder fixture confirms 18 mm total width becomes 16 mm constant-radius band; box section fixture confirms 4 mm section thickness. Focused FORGE checks and TypeScript validation recorded during implementation. Full app and visual QA deferred to the final consolidated pass at the owner's request.

Remaining: measured manufacturing spreads and feature-complete continuous surface certification are not supplied; no pass probabilities invented.
