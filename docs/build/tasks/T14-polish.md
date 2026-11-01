# T14 — App-wide polish pass

**Spec:** §7.2, §7.4, §7.6 · **Lane:** frontend · **Depends:** all UI tasks · **Files:** across `apps/cockpit/src`

## Build checklist
1. **Command palette** (`⌘K`), using shadcn `Command`: jump to workspace, run, design or evidence record, plus actions (New run, Import, Seal prediction, Export report).
2. **Keyboard shortcuts sheet** (`?`), with every shortcut from `04-UI-QUALITY-BAR.md` implemented and listed.
3. **Linked selection everywhere**: a component hovered in ForceBars, the build-up chart or the rules table highlights in 3D, and the reverse. Use one Zustand-free React context `SelectionContext` (no new state lib).
4. **Loading choreography**: route-level `loading.tsx` skeletons that match the final layout, no layout shift (CLS ≈ 0), and staggered panel fade-in of 30 ms per panel at most.
5. **Error boundaries** per workspace (`error.tsx`) with a retry and a copyable error id.
6. **Number formatting**: one `fmt` module (`src/lib/format.ts`) giving SI prefixes, significant figures by quantity type, units, ± intervals and ms vs s choice. Replace the ad-hoc `toFixed` calls.
7. **Sidebar**: live status dots from real data (API health, job running, last run acceptance) and the capability tags kept honest.
8. **Responsive**: a usable layout at 1280×800 (laptop) and 1920×1080. Viewers go full screen. At < 1024 px, show a "best on desktop" notice instead of breaking.
9. **Accessibility pass**: focus order, aria labels, contrast ≥ 4.5:1 on text (check the tokens), and charts with `aria-label` summaries.
10. **Performance pass**: bundle analysis (`@next/bundle-analyzer`, dev only), dynamic import of every 3D viewer and heavy chart, and `next build` without warnings.
11. **Copy pass**: sentence case, no jargon without a tooltip (Cp, CdA, GCI, Q-criterion each get a one-line definition tooltip).

## Acceptance
- [ ] `next build` passes. List the bundle sizes per route in the evidence note.
- [ ] No raw hex colours outside the colormap and 3D constants (grep proof in the evidence note).
