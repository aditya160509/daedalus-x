# OSS-03 — SALib global sensitivity

SALib 1.6.0 MIT licence checked before adoption. Actual Sobol/Morris samplers and analysers use bounded single-process budgets. Analyses GP mean on independent uniform parameter bounds, not measured physical attribution. Current seeded observations remain labelled synthetic. Pit Wall tab presents indices/effects and 95% confidence half-widths.

Both methods ran via script. Two analytic checks passed (additive variance fractions 0.2/0.8, linear Morris effect ratio and constant target rejection). Focused check used 149,782,528 bytes maximum resident memory (~143 MiB), took 1.6 s and reported zero swaps. TypeScript, Ruff and changed-file lint passed. Visual review remains; servers/browser were not started. No CFD ran.
