# T14 app-wide polish (partial)

## What changed in this pass

- Added a `?` keyboard shortcut sheet listing only shortcuts that are actually wired: workspace
  switching, command palette, evidence, presenter, slide controls and race replay/trainer keys.
- Added a discoverable Shortcuts button in the sidebar footer and a command-palette action.
- Added command-palette actions for Evidence (E) and Presenter (P); both reuse the existing events
  instead of duplicating drawer/presenter state. cmdk stays lazy-loaded.
- Added a route-level error boundary with a retry, a route back to the Pit Wall and a copyable
  error id (`digest` when Next provides one, otherwise the message).
- Mounted the T34 dossier panel in the Project workspace; its table scrolls horizontally instead
  of breaking the layout on a narrow window.
- No new dependencies.

## Checks run

- `pnpm exec tsc --noEmit` → pass.
- `oxlint` on all changed UI files → 0 warnings, 0 errors.
- `pnpm build` → pass.
- No browser, Lighthouse, axe or contrast run in this pass.

## Still required before T14 can be accepted

- Responsive audit at 1280×800 and 1920×1080, plus the agreed narrow-screen behaviour.
- Focus-order, contrast and chart `aria-label` review across every workspace.
- A single `fmt` module replacing ad-hoc `toFixed` calls and mixed unit strings.
- Route-level skeletons that match final layout, and bundle sizes per route recorded here.
- Copy pass for jargon tooltips (Cp, CdA, GCI, Q-criterion).
