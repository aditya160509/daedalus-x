# T29 legal limits

Design Studio → Limits joins `/v1/forge/frontier` nearest-limit headroom to `/v1/forge/checks` rule IDs, names, pages, CAD values, states, notes and parts. Unit buttons filter the ECharts bar chart and corresponding readable rows so unlike units are not compared. Rows can focus named parts in CAD. The panel states that negative headroom is outside a limit and excludes rules without computable margins.

The existing backend is a single-design nearest-margin ranking, not a sampled or complete feasible-space map. The UI explicitly says so, labels the results as estimated from CAD, and retains manual verification and physical inspection as outstanding. The underlying rules/geometry can include approximations; a physical compliance claim is not made. ECharts, TanStack Query, Zod and existing UI components were already installed; no code was copied and no dependency was added.

Checks: `uv run pytest -q tests/test_forge_india.py -k frontier` passed; frontend `tsc --noEmit` and focused oxlint passed. Browser interaction and physical validation were not performed.
