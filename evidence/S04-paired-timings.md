# S04 paired timing CI and prospective detectable effect

Race → Calibration → Paired tests accepts explicitly matched CSV pairs with exact SI headers, source/session label and declared pairing basis. Native SciPy ttest_rel computes the two-sided mean-difference interval/p-value. Native noncentral-t CDF/SF and Brent root-finding compute the prospective minimum detectable effect for declared future pair count, alpha and power, assuming pilot difference SD. No observed-power interpretation, auto pair matching, outlier removal or improvement verdict.

Preserves exact request CSV/settings in a source artifact and analysis in a linked result artifact. Artifacts are estimated/user-entered, never automatically measured. Native ECharts plots pair differences and confidence region for the mean (not a prediction interval); TanStack Table shows all rows, with full JSON and PNG exports. The paired view is lazy loaded. Source and model assumptions explicit; formal pre-registration and field measurement remain separate.

SciPy/Boost sometimes returns NaN in an extreme noncentral-t tail. A tail whose exact normal upper bound is below 1e-14 is omitted at that precision; otherwise non-finite native tails use SciPy quadrature of the defining normal/chi-square mixture, not a normal-power approximation.

Grouped validation: 16 focused tests pass: analytic signed/units CI, null power, prospective MDE, eight boundary settings, malformed/duplicate/nonfinite/zero-spread data rejection, and API exact-source/result evidence binding. TypeScript, focused oxlint, Ruff and pyrefly pass (zero module type errors). Browser, full-suite and physical paired-session acceptance remain pending. No servers/CFD/heavy builds started.

References inspected with TinyFish: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html and https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.nct.html . SciPy BSD-3-Clause verified via gh; native numerical libraries reused.
