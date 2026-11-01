# T08 — TITAN race experience

**Spec:** Appendix B.4, §5.3, §7.7 · **Lane:** frontend-2d (+ a little 3D) · **Files:** `src/app/race/*`, `src/components/charts/TelemetryChart.tsx`, new `src/components/race/*`

## Build
1. **Telemetry Wall** (ATLAS-style), upgrading `TelemetryChart`:
   - Stacked synced channels: velocity, acceleration, thrust, drag, rolling resistance and distance.
   - One shared cursor with a value readout per channel in a right-hand "cursor table" (channel, value, unit), plus a draggable **delta cursor pair** (A/B) that shows Δt and Δvalue.
   - Channel picker (show, hide, reorder by drag) and per-channel y-zoom.
   - Keyboard: ←/→ moves the cursor by sample, Shift moves 10 samples.
2. **What-if sliders**:
   - Mass, CdA, Crr and thrust scale as shadcn `Slider`s beside the numeric fields. Show a sparkline of race time vs each slider's range (computed with a 15-point sweep on drag-end using the Monte Carlo API at n=200).
   - Live race-time and spread update (debounced 120 ms).
3. **Spread Fan**: on the velocity channel, draw the p5–p95 band of v(t) across Monte Carlo samples. **Backend addition**: extend `/v1/race/montecarlo` with an optional `trajectory_band: true` that returns v(t) percentiles on a common 200-point time grid. Compute it inside `race_times` with no extra solves by recording v at grid times during RK4 and analytically during the coast.
4. **Race Replay** (3D):
   - A 20 m track (lane, start gate, finish gate, distance markers every 5 m) with the car GLB from the current design moving with x(t).
   - Playback speed ¼× to 4×. The camera follows from the side. The telemetry cursor and the replay are **linked** both ways.
5. **Ghost race**:
   - Pick a second configuration (a saved what-if preset or another design's CdA), and both cars race in lanes.
   - Show the gap at the finish in ms, plus a small Δt(x) chart.
6. **Presets**: save, rename and delete what-if configurations in `localStorage` (try/catch wrapped), as a stopgap until ATLAS stores them.

## Acceptance
- [ ] Backend: the trajectory band test (zero uncertainty gives a band of zero width equal to the deterministic v(t)), and runtime ≤ 1.2 s for n=1000.
- [ ] Frontend: unit-test the cursor-table interpolation and the delta-cursor math.

## References
- Motion Applied ATLAS (layout, cursor table, channel stacking): https://www.motionapplied.com/products/atlas/
- ATLAS Display API docs (concepts: displays, cursors): https://mat-docs.github.io/Atlas.DisplayAPI.Documentation/
- ECharts axisPointer link / dataZoom: https://echarts.apache.org/en/option.html#axisPointer
