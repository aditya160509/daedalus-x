# Quick review of EASY-01–15 — 2026-11-04

Reviewed commits 1b50ac3, 05f9489 and f88db37, the source identity/comparison helpers, representative integration diffs, templates and evidence. The sprint adds the planned UI/report/documentation work using existing libraries. This is a focused source review, not browser or full-suite acceptance. Reported 53 Python/10 Vitest passes and PDF visual checks were read from handoff/evidence, not independently rerun.

## P2: held-out identity omits actual targets and loses row associations

`apps/cockpit/src/lib/calibrationCompare.ts:37`–51 constructs identity from count, unique track/mass sets and optional `sources[1]` hash. It omits actual target times, per-row condition association and timing uncertainty. Source array position is not an explicit held-out role, especially after reopening and uploading only one source. Consequently distinct scored sets can receive a shared identity/comparability label.

Reproduced against the actual helper without modifying it: two one-row studies with measured times 1.5 s vs 1.9 s, equal mass/track/count and no source hashes produce equal signatures and both display “Same row signature; source-file hash unavailable”. Matching source-file bytes also cannot replace checking the exact scored inputs.

Fix: canonicalise the complete scored held-out inputs/targets with row association and an explicit timing/conditions definition. Resolve source roles explicitly when known; mark legacy ambiguous roles unknown. Add regressions for changed targets, swapped per-row conditions and optional/missing sources. Do not include model predictions in test-set identity, since those legitimately differ across compared models.

## P2: exported Git identity remains stale for the process lifetime

`src/daedalus/source_identity.py:52` uses `lru_cache(maxsize=1)` with no invalidation. Later exports can report an earlier commit and clean state even after the checkout changes. The API does not automatically restart when code changes.

Reproduced with bounded mocked Git outputs: after recording commit a/clean, switching to commit b/dirty still returns a/clean. No actual repository changes were made by this reproduction.

Fix: capture identity once per export or use a short bounded TTL with capture time and cache semantics exposed. Keep offline bounded subprocess calls, explicit unavailable state and full hashes. Test two exports with different source snapshots in one process.

## Still open

Browser/responsive/PNG-download behavior remains unverified as disclosed. The compact summary's one-page fixture inspection does not prove every worst-case finding/name combination fits; retain overflow/full-sheet behavior and include it in the UI/PDF acceptance batch. New rows and documentation do not establish accepted CFD, physical measurements or complete J09/J10.

Next instructions: root `prompt-next.md`. First fix the two review findings, then finish the judge Q&A and run a bounded acceptance pass before advancing to the larger remaining workflows. No feature box or completion percentage was upgraded by this review.
