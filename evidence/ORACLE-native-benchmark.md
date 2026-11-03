# ORACLE native benchmark and diagnostics — 2026-11-03

Implemented a bounded, explicitly queued synthetic study: ORACLE GP/EI, native Optuna TPE and CMA-ES, SciPy scrambled Sobol and Latin hypercube, and NumPy random. All startup observations count against each method's equal budget. Ten to twenty declared seeds, untrimmed Student-t confidence intervals of the across-seed mean, and a numerical multistart reference (not certified global optimum). This does not establish performance on CFD or real cars.

Registration stores an immutable synthetic protocol artifact before submitting work. The protocol pins objective/benchmark source hashes and numerical dependency versions. Execution rejects implementation drift. Full trial records and reasons are stored in a result artifact linked to protocol and job; the UI exports the complete evidence and displays latest 200 rows using native TanStack v9 sorting. Native ECharts displays best CdA and reference-gap bands. No bespoke substitute for Optuna or TanStack was written. Licence texts and THIRD_PARTY attribution are included.

Benchmark and CFD jobs are mutually exclusive through the existing durable queue. Numerical thread counts are capped at one for benchmark subprocesses. Opening ORACLE no longer performs the old benchmark synchronously. No actual benchmark campaign, CFD, mesh build or worker was launched during implementation.

Added mean/posterior-SD map selection and leave-one-out GP diagnostics using stored targets, independently refitted folds and predictive intervals including the observation nugget. Coverage uses SciPy Wilson bounds with an explicit shared-fold caveat. Targets retain provenance; synthetic seed validation is not physical validation. Lazy ORACLE subviews mount one analysis at a time.

Validation: TypeScript compilation and focused oxlint passed. Ruff passed. Twenty-one focused Python tests passed (queue, ORACLE and evidence tests); binding, version-drift rejection, CFD mutual exclusion and held-out interval contracts are covered. The evidence-binding tests substitute the numerical study to avoid running a campaign; they do not validate optimiser efficacy. Browser, final UI responsiveness, complete numerical campaign and scientific acceptance remain pending. Further API regression result recorded below after completion.

CFD audit: existing CaseConfig already generates runTimeControl Cd averaging, tolerance 0.001 / 200 iterations (quick 150), with independent acceptance gates. PROGRESS corrected. No measured speed-up claim. Warm start, compatible mesh reuse and separate meshing ranks remain open; FluidX3D was not bundled.

Sources: https://optuna.readthedocs.io/ ; https://tanstack.com/table/latest/docs/framework/react/guide/sorting ; https://docs.scipy.org/doc/scipy/reference/stats.qmc.html ; https://doc.openfoam.com/2306/tools/post-processing/function-objects/utilities/runTimeControl/ . The OpenFOAM reference is not confirmation of installed v2606 execution.

Additional grouped API regressions: 17 passed (`test_api_analysis.py`, `test_api_jobs.py`).

Follow-up type check: pyrefly reports zero errors for changed Python modules. A bounded sampler contract test executes native Optuna/SciPy with GP proposals stubbed (480 toy evaluations, under one second with all five new tests); shared startup budgets and curve/CI contracts pass. This is not an optimiser performance study.
