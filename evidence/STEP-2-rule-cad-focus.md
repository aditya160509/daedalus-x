# Step 2 — Rule to CAD focus

Implemented 2026-11-02 on main.

Failed/at-risk rules open their saved design and request named-part selection and camera fitting in the embedded Chili3D document. Same-origin messages are correlated by request ID; startup/import completion is awaited. Missing names and timeouts are reported. Rules without named parts frame the whole car. The iframe remains mounted across workspace tabs so unsaved CAD edits survive.

The shell uses a narrow navigation rail on phones rather than forcing a 1280 px page. Removed the stale UK reference label and added rule loading/error/retry states.

Validation: TypeScript check passed. Oxlint returned no errors (existing warnings remain). Chili3D rebuilt successfully from pinned e35a8ee; reverse patch application check passed. An actual bridge request against orbit_v2 returned both front wheels in matched and an empty missing list. Camera composition and all mobile interactions still need final visual QA. API runs listing returned HTTP 200 on recheck after a transient dev-server proxy error.

Licence: upstream xiangechen/chili3d reports AGPL-3.0. Updated patch and built main.js; retained upstream LICENSE. No vendor or data files committed.
