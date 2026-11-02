# OSS-02 — uPlot and React Flow integrations

Actual MIT-licensed packages: uPlot 1.6.32, @xyflow/react 12.12.0 and @dagrejs/dagre 3.1.3. Licences checked before installation and distribution notices retained. Official documentation researched with TinyFish.

Telemetry uses native uPlot series, percentile bands, cursor synchronization and zoom. Existing data/cursor/keyboard/channel controls remain connected. PNG export and reset added. Native title height is allocated separately to prevent clipped curves. Marker/band inputs are memoized across cursor updates to prevent repeated chart destruction/creation.

Evidence drawer has a lazy-loaded lineage mode with Dagre layout and actual React Flow interaction. Backend emits only stored records and references, distinguishing omitted parents and missing IDs. Current database returns three nodes and two links. No sample graph nodes inserted. A focused test passed for stored references and truncation without placeholder nodes. TypeScript, changed-file lint and Ruff checks passed. Live desktop check showed four plots and the real evidence chain; no console errors. React Flow emits a development attribution reminder with branding hidden; MIT notices are retained in documentation.

A process snapshot after the owner's memory concern found the external Chrome renderer at 1,223 MiB resident, Next at 116 MiB resident, and 16 GiB physical RAM. This does not confirm or explain the reported earlier 21 GB peak. Both servers and the owned browser were stopped and exit confirmed. Future checks prefer scripts and short in-app browser sessions. No production-memory or 60 fps acceptance claim.
