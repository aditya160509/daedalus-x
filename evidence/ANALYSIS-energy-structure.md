# Energy Sankey and beam plots

Native Apache ECharts (Apache-2.0, licence verified via gh) now renders TITAN's existing source-to-sink joule flows. Replaces the hand-built share bar. Positive numerical closure residual remains an integration remainder, negative residual a numerical surplus; no physical term is rescaled, no tether loss invented. Four frontend tests cover both residual signs, exact closure and invalid flow rejection. Shared theme, native hover/export, empty/error/loading states retained.

Beam plots show solver nodal displacement in mm and absolute outer-fibre bending stress in MPa, with handbook material-strength reference. Linked cursors and PNG export use ECharts. Backend supplies moment/stress arrays and material strength. Zero-load safety factor serializes as null, displayed as infinity rather than emitting invalid JSON. Material/joint/shear/print/3D assumptions remain explicit. No new solver, no FEA validation claim.

Grouped checks: 25 Python tests, four frontend tests, TypeScript and focused oxlint passed. Stress and moment arrays checked against the existing analytic cantilever result, with JSON-safe zero-load coverage. Pyrefly also exposed and corrected existing report-map inference and generator variable type collisions; zero module errors after correction. Browser/performance/physical load testing remain pending. No servers, CFD or heavy builds started.

Sources: https://echarts.apache.org/en/option.html#series-sankey ; installed typed ECharts Sankey API inspected after the public documentation returned a landing page. No upstream chart-wrapper code copied.
