# CFD convergence controls

The existing runTimeControl Cd condition is now configurable through CfdParams and queued jobs: `no_early_stop`, optional `early_stop_tolerance`, `early_stop_window`, and `max_iterations`. CLI adds tolerance/window flags; effective settings are recorded by the existing case manifest. Defaults remain the existing quick/final presets. Disable and explicit tolerance conflict; enabled windows cannot exceed iteration caps. Durable direct submissions share API validation.

The existing OpenFOAM function object is reused. No solver implementation, restricted solver code or alternate CFD pipeline was imported. Mesh checking, force consistency, steady/averaged acceptance and grid-independence requirements remain independent of stopping.

Grouped validation: 37 existing/new API, case-generation and queue tests passed, with no solver execution; pyrefly reports zero errors and Ruff passes for changed modules. FoamFile verifies the actual generated tolerance/window and persisted manifest. A further command-forwarding test replaces subprocess execution and verifies flags; it does not launch OpenFOAM.

Still open: installed v2606 execution proof, actual timing/memory measurements, compatible warm starts and mesh reuse. Core counts were not raised. No claim of 1.5–2× speed-up is supported yet.
