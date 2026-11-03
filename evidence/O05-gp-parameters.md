# O05 fitted GP parameters

Sensitivity exposes actual GP RBF correlation scales normalised by the declared input range, physical-unit conversions, bound hits and optimiser status. Fitted CdA observation-noise SD and duplicate-input count are visible. This is the existing marginal-likelihood nugget, not a repeated-experiment noise estimate; shorter length is not automatically causal importance. Existing SALib independent-bound analysis is retained. Native ECharts and TanStack Table used, with PNG export for both length scales and existing sensitivity chart; no additional dependency.

Seven ORACLE tests pass, including correlation-scale semantics and finite diagnostic payloads. Ruff, pyrefly, TypeScript and focused oxlint pass (a pre-existing helper-scoping warning was also removed). Browser, repeated-run noise calibration and accepted-source interpretation remain open. No numerical campaign, CFD or server started.
