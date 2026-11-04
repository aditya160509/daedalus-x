# Judge Q&A bank — 66 sourced questions

Speaking notes for the 2026-11-04 review. Every answer names the file, evidence note or rule page it comes from. Where something is unmeasured, synthetic, simulated or unbuilt, the answer says so plainly. **Question count: 66.**

The bank is preparation, not acceptance. A teammate-timed three-minute rehearsal and a real recorded fallback are still separate J09 gates; nothing here should be presented as if those had happened.

---

## A. The core claim

**1. What is Daedalus X in one sentence?**
It is a connected engineering app that predicts a race-time interval from CAD, rules and CFD, seals that prediction with a hash before the run, then scores it against the measured time.
*Source:* `docs/innovation.md` §1–2; `src/daedalus/predictions.py`.

**2. Why would that matter to a judge?**
Because most teams show a result after the race and cannot prove it was not adjusted. We commit the number first, so the reveal is a test, not a story.
*Source:* `docs/innovation.md` §2A; `evidence/T13-judge-pack.md`.

**3. Is this just a dashboard over existing tools?**
No. The predictor, the Gaussian-process optimiser, the rule engine, the calibration fit and the sealed-prediction workflow are our code in `src/daedalus/`; the CAD kernel, solver, charts and document renderer are reused libraries listed in `THIRD_PARTY.md`.
*Source:* `THIRD_PARTY.md`; `docs/innovation.md` §2D.

**4. What is genuinely new here?**
A sealed pre-race prediction, an evidence store where every artefact is content-addressed, and a closed CAD → rule → CFD → race loop in one browser app.
*Source:* `docs/innovation.md` §2; `evidence/T16-timestamps.md`.

**5. What is not new?**
The CFD solver, the CAD kernel, the statistical fitting and the chart libraries are established open-source tools. Our contribution is the integration, the honesty constraints and the domain model.
*Source:* `THIRD_PARTY.md`; `docs/innovation.md` §5.

**6. What problem are you actually trying to win points on?**
Design & Engineering, Scrutineering and the Verbal Presentation, with a Racing benefit if the drag predictions hold.
*Source:* `docs/innovation.md` §3.

## B. Sealed prediction and statistics

**7. How does the seal work?**
The full prediction request and the predicted interval are hashed with SHA-256, stored as an artefact, and the hash is shown before the race. Revealing later re-hashes the same immutable bytes, so any edit would produce a different digest.
*Source:* `src/daedalus/predictions.py`; `evidence/T16-timestamps.md`.

**8. Is SHA-256 an official timestamp?**
No. It proves the bytes did not change relative to the stored digest. RFC3161 tokens are a separate trust path, and an unconfirmed token is never shown as confirmed.
*Source:* `src/daedalus/anchor.py`; `evidence/T16-timestamps.md`.

**9. What exactly is inside the predicted interval?**
A race-time median with a percentile band from a Monte Carlo run over mass, drag area, rolling resistance and thrust, each with an explicit 1-sigma relative uncertainty.
*Source:* `src/daedalus/montecarlo.py`; `evidence/P2-01.md`.

**10. How many Monte Carlo samples, and why?**
The sample count is part of the request contract and is stored with the result, so a band can be reproduced from its exact seed and settings rather than described as "many runs".
*Source:* `src/daedalus/montecarlo.py`; `src/daedalus/contracts.py`.

**11. Does a 90% band mean a 90% chance of winning?**
No. It is a model-implied interval for race time given the stated input uncertainties. It is not a probability of winning and it is not a guarantee.
*Source:* `evidence/P2-01.md`; `docs/innovation.md` §5.

**12. What happens if the measured time misses the band?**
The result is shown as a miss. A miss is data about the model, not a failure to hide; the interval and the measured value stay recorded side by side.
*Source:* `src/daedalus/predictions.py`; `evidence/T13-judge-pack.md`.

**13. What statistical method do you use for paired tests?**
A two-sided paired t-test on explicitly matched runs, with a mean-difference confidence interval, plus a prospective minimum detectable effect from the noncentral-t distribution.
*Source:* `src/daedalus/paired.py`; `evidence/S04-paired-timings.md`.

**14. Is that MDE an observed-power claim?**
No. It is a prospective calculation for a declared future pair count, alpha and power, using the pilot difference SD. We do not compute "observed power".
*Source:* `evidence/S04-paired-timings.md`.

**15. Do you remove outliers?**
No automatic removal. Outlier flags are shown per row so a human can decide; excluded data would have to be declared.
*Source:* `apps/cockpit/src/lib/timingRows.ts`; `evidence/EASY-03.md`.

**16. What if the sample is too small?**
The interval widens honestly and the app states the declared pairing basis and pair count. A small pilot is not turned into a significant result.
*Source:* `evidence/S04-paired-timings.md`.

## C. ORACLE and the benchmark

**17. What is ORACLE?**
A Gaussian-process surrogate with expected improvement that proposes the next design to test, over four variables: front-wing angle, body taper, nose height and rear-wing chord.
*Source:* `src/daedalus/oracle.py`; `docs/innovation.md` §2B.

**18. Why a Gaussian process?**
With roughly thirty affordable CFD runs, a GP is the honest surrogate: it gives a mean and a calibrated uncertainty and it needs no neural-network training set.
*Source:* `src/daedalus/oracle.py`; `evidence/O05-gp-parameters.md`.

**19. Are the benchmark results real?**
No. The headline ORACLE-versus-random benchmark is explicitly synthetic and equal-budget, and the UI carries a synthetic badge until real runs replace it.
*Source:* `src/daedalus/oracle_benchmark.py`; `evidence/ORACLE-native-benchmark.md`.

**20. What algorithms are in that benchmark?**
Native Optuna TPE and CMA-ES ask/tell samplers against a random and an LHS baseline at the same budget, adapted to our objective rather than reimplemented.
*Source:* `src/daedalus/oracle_benchmark.py`; `THIRD_PARTY.md` §"ORACLE benchmark".

**21. Did you cherry-pick the seed?**
The benchmark runs at a fixed seed and budget recorded in the result; seeds are stored, not chosen per presentation.
*Source:* `src/daedalus/oracle_benchmark.py`; `evidence/ORACLE-native-benchmark.md`.

**22. How do you know the GP is not overfitting?**
Hyperparameters are fitted by marginal likelihood (ML-II), and the diagnostics panel exposes the fitted length scales and noise rather than hiding them.
*Source:* `src/daedalus/oracle.py`; `src/daedalus/oracle_diagnostics.py`.

**23. What is expected improvement actually doing?**
It trades predicted mean drag against predicted uncertainty, so the next run is chosen where the model expects a gain or where it is unsure — the standard EI rule.
*Source:* `src/daedalus/oracle.py`.

**24. If CFD is expensive, how many runs can you afford?**
That is exactly the constraint the optimiser answers; the campaign and budget are declared, and the app does not invent runs to fill a chart.
*Source:* `src/daedalus/benchmark_campaign.py`; `docs/innovation.md` §2B.

## D. CFD and GCI

**25. What solver and turbulence model?**
OpenFOAM with k-omega SST and a moving ground, driven by stored case templates and jobs; the app reports the case and acceptance state with each result.
*Source:* `src/daedalus/cfd.py`; `src/daedalus/jobs.py`; `docs/innovation.md` §2D.

**26. Is the flow image a photograph?**
No. It is solver output visualised from stored field data, and each run carries accepted, rejected or not-recorded status.
*Source:* `evidence/P3-04-flow-fields.md`; `apps/cockpit/src/app/simulate/FlowViewer3D.tsx`.

**27. Where is mesh convergence?**
The grid-study panel shows Cd and residual histories and computes Richardson/GCI values when actual study results exist.
*Source:* `src/daedalus/gridstudy.py`; `apps/cockpit/src/app/simulate/GridStudyPanel.tsx`.

**28. Do you have accepted CFD runs?**
Not yet in the committed evidence. The software supports submission, acceptance and rejection, but no accepted campaign is claimed.
*Source:* `evidence/CHECKPOINT-2026-11-04.md`; PROGRESS "Real data".

**29. What does "accepted" mean here?**
A local recorded-status guard: the run succeeded, the result has a finite positive Cd and the case is bound to the selected design. It is not an external scientific authority.
*Source:* `evidence/CHECKPOINT-2026-11-04.md`; `src/daedalus/cfd.py`.

**30. How do you compare two designs fairly?**
A strict identical-geometry, indexed-mesh delta-Cp comparison that rejects incompatible meshes instead of subtracting mismatched fields.
*Source:* `src/daedalus/viz/compare.py`; `evidence/T06-delta-cp.md`.

**31. Are the wind-tunnel layers real field data?**
Cp surfaces, wake planes, Q isosurfaces and the velocity texture come from exported solver fields; the particle motion is a GPU rendering of that field, not extra physics.
*Source:* `src/daedalus/viz/vtkexport.py`; `evidence/WIND-TUNNEL-particles.md`.

**32. Do you claim 60 fps on a real Mac?**
No. Browser software-WebGL checks exist; physical-GPU frame rate remains a separately recorded gate.
*Source:* `evidence/WIND-TUNNEL-particles.md`; MASTER-PLAN §28 B18.

**33. What about y+ and bad cells?**
Not built. No y+ map, separation line or bad-cell map is claimed.
*Source:* MASTER-PLAN §28 B14.

**34. Is the LIC or wake-drag cross-check done?**
No. Those layers remain unbuilt, and the app does not substitute a picture for them.
*Source:* MASTER-PLAN §28 B14–B15.

## E. FORGE and scrutineering

**35. What does FORGE check?**
Eighty sourced STEM Racing India NF 2025-26 rule entries, each with its page and penalty, evaluated against the saved design where the CAD supports a measurement.
*Source:* `rulebooks/stem-racing-india-nf-2025-26.yaml`; `src/daedalus/forge.py`.

**36. What was the headline rule finding?**
On the imported `orbit_v2` CAD, the front-wheel gap measured 33.00 mm against a 38.00 mm minimum in T7.2.1, page 29 — a −5.00 mm CAD margin.
*Source:* `evidence/STEP-1-india-honesty.md`; `evidence/ORDER-1-india-forge.md`.

**37. Is that an official penalty?**
No. At 2.5 points per mm per axle it flags 12.5 points at risk, but it is a CAD finding that still needs checking on the manufactured car.
*Source:* `evidence/STEP-1-india-honesty.md`; `docs/innovation.md` §2C.

**38. What does a green rule mean?**
Only that the CAD-supported dimension passed, with its units and margin. It does not mean a scrutineer measured the physical car.
*Source:* `docs/judges/THREE-MINUTE-WALKTHROUGH.md` 0:20–0:45; `evidence/ORDER-1-india-forge.md`.

**39. Which rules stay manual?**
Anything needing mass, a tether guide or another physical measurement stays "manual review" and is never shown as green.
*Source:* `src/daedalus/forge.py`; `docs/innovation.md` §2C.

**40. Can you prove the rule text is real?**
Each rule records its source page and revision in the YAML, and the printable sheet carries the YAML revision and full SHA-256. The official PDF itself is not archived by the export.
*Source:* `src/daedalus/report/sheet.typ`; `src/daedalus/source_identity.py`; `evidence/R2.md`.

**41. What about the halo or ambiguous geometry?**
Absent or ambiguous features remain manual rather than guessed; sampled wing extremes and named halo-notch arcs are explicit where the geometry supports them.
*Source:* PROGRESS §23 Order 1/T20 FORGE v2.

**42. Do you show margins in millimetres and percent?**
Yes, both: a signed value with units where a limit exists, and a percent-of-span margin for the relevant rules.
*Source:* `src/daedalus/forge_features.py`; `evidence/EASY-07.md`.

## F. Calibration, race model and the loop

**43. How is the race time computed?**
A TITAN dynamics model integrates thrust, drag and rolling resistance over the track, with a Monte Carlo layer for uncertainty and a Bayesian fit for drag area, rolling resistance and thrust scale.
*Source:* `src/daedalus/dynamics.py`; `src/daedalus/bayes_calibration.py`.

**44. How do you stop the fit from cheating with test data?**
Held-out runs are stored separately, only an explicitly labelled held-out source contributes identity, and saved studies are compared on the actual stored inputs and measured targets.
*Source:* `apps/cockpit/src/lib/calibrationCompare.ts`; `evidence/R1.md`.

**45. What error does a calibration report?**
Held-out MAE and RMSE in milliseconds computed only from stored held-out errors; an empty set is shown as "not evaluated", never zero.
*Source:* `apps/cockpit/src/lib/calibrationCompare.ts`; `evidence/EASY-10.md`.

**46. Can drag and rolling resistance be separated from timing alone?**
Not reliably. The app warns that timing may not identify both, which is why the posterior comes with uncertainty rather than a single confident number.
*Source:* `apps/cockpit/src/components/race/CalibrationPanel.tsx`; `src/daedalus/bayes_calibration.py`.

**47. Have you measured a real car?**
No. No measured race or physical calibration is claimed; the model and the UI state that gap.
*Source:* PROGRESS "Real data"; `evidence/CHECKPOINT-2026-11-04.md`.

**48. Is the closed loop automatic?**
No. The design loop generates a real geometry and CAD checks, but feeding accepted CFD back automatically and separating synthetic from physical training data remain open.
*Source:* PROGRESS §23 Order 5; `src/daedalus/design_loop.py`.

**49. What is the energy audit?**
A native Sankey of thrust, drag, rolling and tether terms with a signed closure residual that is shown, not normalised away.
*Source:* `src/daedalus/energy.py`; `evidence/T19-energy.md`.

**50. Is the tether term physically validated?**
No. A supported tether model can be evaluated with declared parameters, but without tether measurements the term is uncalibrated, not validated.
*Source:* `prompt-next.md` D10; `src/daedalus/energy.py`.

## G. Evidence, provenance and security

**51. How do you know a number was not edited?**
Every record and artefact is content-addressed in an append-only store, and the verification page re-hashes stored bytes against their recorded digest.
*Source:* `src/daedalus/store.py`; `apps/cockpit/src/components/evidence/ArtifactProof.tsx`.

**52. Can a record be deleted or overwritten?**
The store is append-only by design; a correction adds a new record and retains lineage rather than mutating history.
*Source:* `src/daedalus/store.py`; `docs/innovation.md` §2E.

**53. Does the PDF prove its own code version?**
It prints the commit, dirty/clean state and the capture time taken fresh for that export. It does not prove the file left the machine unchanged.
*Source:* `src/daedalus/source_identity.py`; `src/daedalus/report/report.typ`; `evidence/R2.md`.

**54. Can I scan a QR code to check an artefact?**
The verification page generates a hash-pinned QR natively, and the same page can re-verify the digest; a public deployment and phone scan are not yet acceptance-tested.
*Source:* `apps/cockpit/src/components/evidence/ArtifactProof.tsx`; `THIRD_PARTY.md` §"Artifact verification QR"; MASTER-PLAN §28 J07.

**55. Is the timestamp chain independently trusted?**
RFC3161 tokens are stored with their trust bundle, but the real authority chain and an OpenTimestamps anchor remain external gates. An unconfirmed receipt is shown as unconfirmed.
*Source:* `src/daedalus/anchor.py`; `evidence/T16-timestamps.md`; MASTER-PLAN §28 J12.

**56. Where does the app run?**
Locally in a browser against a local API in the current evidence; public hosting and an offline demo bundle remain gates, not claims.
*Source:* MASTER-PLAN §28 J10/J07; `evidence/CHECKPOINT-2026-11-04.md`.

## H. Licences, reuse and ownership

**57. What licence is the project under?**
AGPL-3.0-or-later, with every bundled third-party component keeping its own licence and notice.
*Source:* `THIRD_PARTY.md`; `LICENSE`.

**58. Did you copy a whole app from GitHub?**
Chili3D is a patched, rebuilt upstream CAD application used as the CAD surface, with its licence retained. The racing-game and f1-dash imports are specific adapted components, mapped file by file in `THIRD_PARTY.md`.
*Source:* `THIRD_PARTY.md`; MASTER-PLAN §26.

**59. How do you know the licences are compatible?**
The reuse table records the exact source, commit, licence and destination, and the retained licence texts live in `docs/licenses/`. Nothing is listed there that the repository does not actually use.
*Source:* `THIRD_PARTY.md`; `docs/licenses/`.

**60. Which algorithms did you write yourselves?**
The TITAN dynamics, the Bayesian calibration wrapper, the FORGE rule engine, the evidence store, the sealed-prediction workflow and the integration code. Native libraries supply the GP optimiser, samplers, statistics and rendering.
*Source:* `src/daedalus/`; `THIRD_PARTY.md`.

**61. Who owns the work?**
The team owns the repository and the decisions; the implementation history is in the commit log. Reused code is credited above rather than presented as ours.
*Source:* `THIRD_PARTY.md`; git history on `aditya160509/daedalus-x`.

## I. Hard limits and failure questions

**62. What is the single biggest gap?**
Real data. There is no accepted CFD campaign, no measured race and no physical load test; those are the largest and most honest gaps.
*Source:* PROGRESS "Overall / Real data"; `evidence/CHECKPOINT-2026-11-04.md`.

**63. What happens if a judge opens an empty panel?**
The app shows an explicit empty or unavailable state and never fills it with a substitute value; the walkthrough gives a fallback line for each step.
*Source:* `docs/judges/THREE-MINUTE-WALKTHROUGH.md`.

**64. Which parts are still unbuilt?**
Among others: automatic design-to-CFD feedback, surface LIC/separation and y+, stadium/TV mode, OpenTimestamps anchoring, a public deployment and a recorded fallback.
*Source:* MASTER-PLAN §28; PROGRESS.

**65. Has a teammate run the three-minute script?**
Not yet in the committed record. The script exists and is timed on paper, but a teammate-timed rehearsal with reviewer notes is still a J09 gate.
*Source:* `docs/judges/THREE-MINUTE-WALKTHROUGH.md`; `evidence/EASY-14.md`; `prompt-next.md` J09.

**66. Is there a recorded fallback video?**
No. A real, playable recording of the honest screens does not exist yet; the instructions describe how to use one but do not claim it is done.
*Source:* `prompt-next.md` J09/J10; `evidence/EASY-14.md`.

---

## Rehearsal record

| Date | Presenter | Reviewer | Duration | Outcome |
|---|---|---|---|---|
| — | — | — | not run | Teammate-timed rehearsal is an open J09 gate |

## Fallback recording

| Artefact | Path | Status |
|---|---|---|
| Recorded walkthrough | — | not recorded; open J09/J10 gate |

If a teammate or recording environment is unavailable, this bank and the existing script are the deliverable; the rehearsal and recording stay explicitly incomplete.
