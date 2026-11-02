# Step 4 — Source-backed engineering drawing pack

Implemented 2026-11-02. Design Studio has a Drawings tab with official team number/name, decal-reference notes and finish descriptions. The PDF endpoint covers all 13 mandatory C2.10.6 contents items, uses source STEP geometry in the recorded engineering frame, exports orthographic dimensions, exploded component key and centre sections, and includes related FORGE findings. STEP and geometry hashes appear in the PDF. Source mismatch is rejected and exports are serialized to limit memory use.

The actual orbit_v2 model generated a 17-page A4 draft, around 1.9 MB. Exact BRep hidden-line removal was too slow; switched to OpenCascade polygonal hidden-line removal at a declared 0.1 mm tolerance. Numeric dimensions use CAD bounds, rather than tessellated extents. Rendered pages inspected with Poppler. TypeScript and changed-file Ruff/Oxlint checks passed.

No claim of a submission-ready drawing pack or guaranteed 60 points: local bore/chamber/wall dimensions, official wing-surface boundary identification and missing named nose/tether features are explicitly listed for review. Team finish/decal data is not invented. Separate A4 3D render PDF and the broader T22 DXF/SVG deviation importer remain outstanding.

Reference: docs/build/references/T22.md. Example artifact remains local in output/pdf/daedalus-orbit-v2-engineering-draft.pdf; data and vendor files excluded from commits.
