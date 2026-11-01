# T12 — ATLAS: Evidence workspace

**Spec:** §7.3, §9.2, §9.3, Appendix B.5 #4–5 · **Lane:** frontend-2d (+ small API) · **Depends:** T02 · **Files:** new `src/daedalus/api/evidence.py`, `src/app/evidence/*`, `src/components/evidence/*`

## Build
1. **API** over `EvidenceStore` (store root `data/evidence/`; create it on first use):
   - `GET /v1/evidence/records?kind=&q=&cursor=`: paginated, newest first.
   - `GET /v1/evidence/records/{id}`: record plus resolved references (one level) and back-references.
   - `GET /v1/evidence/verify`: runs `verify_all()` and checks sealed predictions with `predictions.verify`. Returns per-record status.
   - `GET /v1/evidence/artifacts/{id}`: streams bytes with a content type from the `kind`.
   - Also index CFD runs and jobs (read-only adapters) so the timeline shows them, even though they live on disk rather than in the store.
2. **Run Timeline**: a vertical timeline grouped by day. Each item shows a kind icon, title, provenance badge, acceptance state and a **Verified ✓ / Broken ✗** hash badge. Filter by kind, provenance and design, and search with `/` to focus.
3. **Record inspector**: a right panel with the JSON tree (collapsible, monospace), references as clickable chips, an artifact preview (image, JSON, CSV table, or a "download" button), and the raw hash with a copy button.
4. **Lineage graph**: design → experiment → solver run → artifacts → prediction → score, drawn with ECharts `graph` (force layout off, dagre-like left-to-right positions computed in TS). Clicking a node opens it in the inspector.
5. **Prediction Scorecard**: a table of sealed predictions against measured results (from T09 when available). Columns are predicted ± interval, measured, error, and whether it was inside the interval, with an overall calibration line ("k of n inside the 90% interval") and a scatter of predicted vs measured with a y = x line.
6. Empty states name the producing step (e.g. "No sealed predictions yet: seal one in Race → Calibration (T09)").

## Acceptance
- [ ] API tests: pagination stability, reference resolution, and verify detecting a corrupted artifact (reuse the store test pattern).
- [ ] UI unit test for the lineage layout function (deterministic positions).

## References
- ECharts graph series: https://echarts.apache.org/en/option.html#series-graph
- ATLAS concept (spec §7): `docs/SPEC.md`
