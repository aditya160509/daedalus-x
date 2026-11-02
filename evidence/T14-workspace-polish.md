# T14 workspace polish (second pass)

## What changed

- **Race Points** now uses a control-room layout: scenario inputs are grouped under Basis, Car, Reaction, Field and Reliability in a 340 px rail, with results and the knock-out chart in the remaining space at `xl`. Below `xl` the same groups stack and fields use two columns where width allows. The tab no longer double-pads inside the already padded Race body, and the panel can use `max-w-6xl`.
- **Simulate** stacks the Acceptance and Pipeline panels below their charts under `xl` instead of forcing a 360 px column beside a shrinking plot. The top case header truncates on phones instead of pushing New run and Jobs off-screen. The no-runs empty state now takes the remaining height.
- **Race metrics** use two columns on phones, three on tablets and five on desktop instead of always five.
- **Panel** headers wrap their actions instead of clipping them when a narrow panel has several buttons. Metric cards get a quiet hover edge.
- **Spread tornado** uses the shared chart tooltip and axis treatment and the `ok`/`risk` design tokens instead of duplicated colours.
- Pit Wall report and judge-pack links get a consistent hit area and keyboard focus ring.

## Checks

- `pnpm exec tsc --noEmit` → pass.
- Focused `oxlint` on the changed files → 0 warnings, 0 errors.
- `oxfmt` on the changed files → pass.
- `pnpm build` → pass.

## Limits

- No browser, screenshot or Lighthouse pass; responsive behaviour was checked in source, not rendered at each breakpoint.
- T14 remains partial: the route-level audit, bundle budget and a real contrast measurement are still open.
