# Three-minute judge walkthrough

A timed, click-by-click route through the current app. It takes **180 seconds** if you keep to the script. Anything not measured is called unmeasured; anything synthetic is called synthetic.

## Before the clock starts

1. Open the cockpit and leave it on **Pit Wall** (`/`).
2. Look at the **Data** badge in the status strip. If it says `synthetic`, every ORACLE number you show is a synthetic seed target, not a measured drag value.
3. Press **P** to check that the presenter opens, then **Esc** to close it.

If a panel is empty, use the fallback line in that step. Do not fill a missing value with a made-up number.

---

## 0:00–0:20 — Problem and one claim (20 s)

**Click:** Pit Wall → press **P** → slide 1, “Daedalus X”.

**Say:**
> “Most teams design a car, run one CFD picture, then race and hope. We predict a race-time interval before the run, seal that prediction with a SHA-256 fingerprint, and score it against the measured time afterwards. Everything else in the app exists to make that prediction better or to show its limits.”

**Do not say:** that a prediction has already been validated. No independent measured run has scored the model yet.

---

## 0:20–0:45 — Design and the rule finding (25 s)

**Click:** **Esc** → Pit Wall → **Overview** → the **Rules** panel. If the dock is compact, open the **Rules** tab in the dock.

**Say:**
> “FORGE checks the sourced STEM Racing India NF 2025-26 rulebook: 80 rule entries, each with its page and penalty. On the current reference design it reports 3 CAD-only passes, 3 at-risk rules, 0 CAD fails and 74 rules that need a physical measurement. Watch the state column — a CAD pass says the bounding-box check passed, not that a scrutineer measured the car.”

**Point at:** any **AT RISK** row and its margin and units. Open **Design Studio → Rules** if you want the same checks beside the CAD.

**Fallback:** if the design or rulebook is not loaded, show the empty/error state and say: “No rule result is being claimed from an unavailable source.”

**Source:** `evidence/ORDER-1-india-forge.md`; implementation in `src/daedalus/forge.py` and `src/daedalus/forge_sheet.py`.

---

## 0:45–1:10 — Wind-tunnel source and status (25 s)

**Click:** **Wind Tunnel** → **Flow**. Select a completed run from the run list if one exists. Then open **Forces** and **Convergence**.

**Say:**
> “This is solver output, not a photograph of a real flow. The run card carries its acceptance state: accepted, rejected or not recorded. The convergence tab shows the Cd window and the iteration history. If no solved run with flow data exists, the app deliberately shows no substitute image.”

**Fallback — no CFD run:** show the **Flow** empty state or the presenter’s “The flow” slide, which reads “No flow source available”. Say: “No solved CFD run is stored, so no flow or drag result is claimed. The next action is to run and accept a case, not to narrate a missing one.”

**Do not say:** that a CFD image proves the car’s real drag. It is a simulation with an acceptance status.

**Source:** `evidence/P3-04-flow-fields.md`; presenter caption in `apps/cockpit/src/components/present/Presenter.tsx`.

---

## 1:10–1:35 — ORACLE recommendation (25 s)

**Click:** Pit Wall → **ORACLE** → **Response map**. Point at the **★** next proposal and the stored-observation dots. Then click **Benchmark**.

**Say:**
> “ORACLE fits a Gaussian process to the stored observations and proposes the next design with expected improvement. The star is a model proposal, not a measured optimum. The benchmark tab compares equal-budget methods; right now the completed study is synthetic, so it tells us about optimiser behaviour on a toy objective, not about this car.”

**Fallback — no completed benchmark:** the tab or presenter slide says **Benchmark unavailable**. Say: “No registered study has completed, so I am not claiming an optimiser winner. Registering the equal-budget study is the next software action.”

**Do not say:** that ORACLE has reduced real drag by a measured amount.

**Source:** `evidence/ORACLE-native-benchmark.md`; presenter wording in `Presenter.tsx`; benchmark view in `apps/cockpit/src/app/PitWall.tsx`.

---

## 1:35–2:05 — Sealed prediction and evidence verification (30 s)

**Click:** press **P** → arrow to **Sealed prediction**. If a sealed prediction exists, type the measured time and press **Reveal**; a miss is shown as openly as a hit. Then press **Esc** and **E** to open the **Evidence** drawer. Open one record and follow its verify link.

**Say:**
> “The prediction was hashed before the run. Reveal compares the measured time with the sealed interval. The evidence drawer stores the record and its SHA-256; the verify page re-reads the stored bytes and compares them with the pinned digest. A match proves the bytes were not changed — it does not prove the physics or the quality of the prediction.”

**Fallback — no sealed prediction:** the card reads **No sealed prediction yet**. Say: “There is no sealed prediction in this store, so there is nothing to reveal. I will not type a number to manufacture a result.”

**Fallback — empty evidence store:** show the empty drawer and say: “This local store has no records yet; the verification path is implemented but there is nothing to verify here.”

**Source:** `evidence/ATLAS-artifact-verification.md`; `apps/cockpit/src/components/pitwall/SealedReveal.tsx`.

---

## 2:05–2:30 — Limitations (25 s)

**Click:** **P** → arrow to **What is still unverified**.

**Say:**
> “These cards are the honest boundary. ORACLE observations are synthetic or mixed. The accepted current-car CFD and grid study is not established. No independent measured race scores the model out of sample. The beam model uses handbook material values and an Euler–Bernoulli cantilever simplification. Final GPU and responsive QA are still pending. A hash proves integrity, not physics.”

**Fallback:** if the live dossier status cannot load, read the dated checkpoint facts and say the live status is unavailable.

**Source:** `evidence/CHECKPOINT-2026-11-04.md`; slide in `Presenter.tsx`.

---

## 2:30–3:00 — Next measurable experiment and close (30 s)

**Click:** **Esc** → Pit Wall → **ORACLE** → **Response map**, then point back to the **★**.

**Say:**
> “The next experiment is concrete: accept a real CFD case for the current car, register an equal-budget study, replace synthetic observations with stored run targets, then seal a race-time interval before the next measured run and reveal it afterwards. Success is a measured time inside the sealed interval with the source and acceptance state recorded. Until that happens, this is a connected engineering workflow with synthetic and CAD-only evidence, not a validated race prediction.”

**Close:** stop on the ORACLE map or the limitations slide. Do not end on a synthetic benchmark chart without the label.

---

## Timing check

| Segment | Seconds |
|---|---:|
| Problem and claim | 20 |
| Design and rule finding | 25 |
| Wind-tunnel source and status | 25 |
| ORACLE recommendation | 25 |
| Sealed prediction and evidence verification | 30 |
| Limitations | 25 |
| Next experiment and close | 30 |
| **Total** | **180** |

## Route summary

- **Presenter:** `P` opens; `→`/`←` or `Space` moves; `N` toggles notes; `Esc` closes.
- **Evidence:** `E` opens the drawer; each record links to `/verify/<artifactId>?sha256=…`.
- **Workspaces:** Pit Wall `/`, Wind Tunnel `/simulate`, Design Studio `/design`, Race `/race`, Project `/project`.
- **Pit Wall tabs:** Overview, ORACLE, Sensitivity, Test planner.
- **ORACLE views:** Response map, Benchmark, Validation.
- **Design Studio tabs:** CAD, Inspect, Rules, Limits, Strength.
- **Wind Tunnel tabs:** Flow, Forces, Convergence, Mesh.
- **Race tabs:** Replay, Analysis, Points, Calibration.

This document completes only the walkthrough portion of J09. The 60-question Q&A bank and a recorded fallback video remain open.
