# EASY-04 — Remaining native PNG exports

## Changed

- `apps/cockpit/src/components/charts/useECharts.ts` — registers ECharts’ native `ToolboxComponent`.
- `apps/cockpit/src/components/charts/HistoryChart.tsx` — PNG export `solver-iteration-history`.
- `apps/cockpit/src/components/charts/SpreadChart.tsx` — PNG export `race-time-monte-carlo`.
- `apps/cockpit/src/components/charts/DragBuildupChart.tsx` — PNG export `drag-buildup`.
- `apps/cockpit/src/components/pitwall/PitCharts.tsx` — PNG export `oracle-aero-map`; legend/toolbox placement adjusted to avoid overlap.

## Reused

Apache ECharts 6.1.0 native toolbox and `saveAsImage`. No canvas-to-image helper or custom renderer was added.

## Checks

- `pnpm exec tsc --noEmit` — pass.
- Focused `oxlint` — no errors.
- `oxfmt --check` — pass.

## Limitations

The PNG files were not opened in a browser during this session; export positioning and downloaded image content still need a browser acceptance pass.
