# UI restructure: tabs and one main view (2026-11-01)

**Problem:** every workspace is a dashboard of 8–12 cards, so it looks crammed and templated.

**Rule from now on:** copied from OpenCADStudio, CADCraft, SimScale, SimFlow and ParaView (layout patterns only; the GPL apps are pattern-only).

1. **Left rail** = workspaces (Pit Wall, Wind Tunnel, Design, Race). Unchanged.
2. **Top tab bar** inside each workspace, Google/Linear underline style. One job per tab.
3. **Each tab has one main view** filling the space (3D or a big chart), plus **at most one side panel** (inputs or properties), collapsible.
4. **Thin status bar** at the bottom with the key numbers. Drop the card grid.
5. Neutral greys with one accent used only for active/selected states. No blue glow everywhere.

## Tabs per workspace

| Workspace | Tabs (each = 1 main view) | Side panel |
|---|---|---|
| **Race** | Replay (3D + timing tower) · Telemetry (lanes + cursor) · Spread (Monte Carlo + tornado) · Ghost (delta trace) · Start (reaction trainer) | Car inputs (collapsible) |
| **Wind Tunnel** | Flow (3D layers) · Forces (build-up + bars) · Convergence (residuals) · Mesh (grid study, skewed faces) | Layer and run properties |
| **Design** | Model (3D studio) · Dimensions (measure, section) · Compare · Rules (FORGE hotspots + table) | Model tree / inspector |
| **Pit Wall** | Overview (score, next run, legal, prediction) · ORACLE (aero map + benchmark, full size) · Evidence (timeline, full page) | none |

## Order
1. Shared `WorkspaceTabs` + `StatusBar` components
2. Race split into 5 tabs (worst offender)
3. Wind Tunnel into 4 tabs
4. Pit Wall into 3 tabs
5. Design into 4 tabs
6. Visual pass on tokens: quieter accent, fewer borders, more whitespace. Browser check each page.
