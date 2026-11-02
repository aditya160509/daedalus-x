# Why Daedalus X is an innovation

**One line:** most F1 in Schools teams design a car, test it once and *hope*. We **predict our race time before we race, lock that prediction away with a fingerprint, and then check it in front of the judges.** Everything else in the app exists to make that prediction good and to prove it is honest.

---

## 1. The problem every team has

A normal team works like this:

1. Draw the car in CAD.
2. Maybe run one CFD simulation and take a nice picture of it.
3. Make the car, race it, and see what happens.

Three things go wrong:
- **Guessing.** Changes are picked by gut feel ("make the wing thinner?"), not by data.
- **No link.** CAD, CFD, rules and race times live in separate tools and folders. Nobody can say *which* CFD run belongs to *which* car.
- **No proof.** A judge can't tell whether a graph was made before or after the race, or whether a number was edited.

## 2. What we do differently: five ideas

### A. Sealed prediction: we predict, then prove it

Before racing, the app predicts our race time with an error band (for example **0.789 s ± 0.010 s**). It turns that prediction into a **SHA-256 hash**, a digital fingerprint, and records it. The hash can't be changed later without everyone noticing.

At the event we type in the real time and press **Reveal**. The app shows ✓ if the real time landed inside our band and ✗ if it didn't.

*Why it's new:* teams usually show results after the race. We commit **before**, so the result can't be faked. This is how real science works (pre-registration), applied to F1 in Schools.

### B. ORACLE: the computer picks the next design to test

CFD runs are slow, so you can only afford a few. ORACLE is a small machine-learning model (a **Gaussian process**) that learns how 4 design choices affect drag:
- front wing angle
- body taper
- nose height
- rear wing chord

After each run it uses **expected improvement**, the same method used to tune real race cars and AI models, to pick the single most useful design to test next. It shows this on an **aero map** (a heat map of predicted drag) with a ★ on the next design.

**Proof it works:** we benchmark ORACLE against random testing with the **same number of runs**. ORACLE finds lower drag faster, and the chart is on the Pit Wall.

*Honest note:* until our own CFD runs are loaded, ORACLE uses clearly labelled **synthetic** data. The app shows a "synthetic" badge until real runs replace it.

### C. FORGE: the rulebook built into the CAD

We turned the 2026/27 STEM Racing rulebook into machine-checkable rules: 10 rules, each with its page number. Every time a design is saved, FORGE measures it and marks each rule **pass / at risk / fail / needs a physical check**, with the margin in mm.

It already caught a real problem on our baseline car: the **rear wing is 34.4 mm high, and the rule is ≥ 35 mm** (rule D8.5, page 34). That's a 10-point penalty we'd have lost.

*Honest by design:* rules that need a scale or ruler (mass, tether guide) are never shown as green. They stay "manual review".

### D. One connected pipeline: CAD → rules → CFD → race

Everything is in one app and linked:

| Step | What happens | Open source we built on |
|---|---|---|
| **Design** | Full CAD in the browser. Open our car, edit it, press **Save as design**. | Chili3D (AGPL), OCCT kernel |
| **Rules** | FORGE checks the saved design automatically | our own |
| **Wind tunnel** | Real OpenFOAM CFD (k-ω SST, moving ground), ParaView-style live 3D viewer, photo-quality renders | OpenFOAM, vtk.js, PyVista |
| **Optimise** | ORACLE learns from each run and picks the next | our own (NumPy/SciPy) |
| **Race** | Race simulation turns drag into a race time, with a Monte Carlo spread, timing tower and reaction trainer | our own |
| **Report** | A one-click PDF engineering report and a presenter mode for judges | Typst |

*Why it's new:* commercial tools like SolidWorks, Ansys and STAR-CCM+ each do one step and cost thousands. We connected the whole chain for free, and it runs in a browser.

### E. Evidence trail: every number can be traced

Every design, CFD run, file and prediction is stored with a **hash** and a timestamp in an evidence log, and press **E** in the app to see it. Any number in the report can be traced back to the exact file and run that produced it. The app can re-check every hash to prove nothing was edited.

## 3. How this scores points (STEM Racing, Professional class)

| Judging area | Points | How Daedalus X helps |
|---|---|---|
| Design & Engineering | 180 | A real optimisation method (ORACLE), real CFD, rules checked automatically |
| Racing | 250 | Lower drag from smarter testing, and a reaction-time trainer |
| Scrutineering | 160 | FORGE catches illegal parts before manufacture (it already caught the rear wing) |
| Verbal presentation | 140 | A live sealed-prediction reveal and presenter mode |
| Project management | 90 | An evidence trail and timeline of every decision |
| Innovation award | — | Sealed prediction plus a closed design loop: we haven't seen another team do this |

## 4. What to say to a judge (30 seconds)

> "Most teams test a car and hope. We built Daedalus X, which links CAD, the rulebook, CFD and the race simulation in one app. An AI optimiser picks which design to test next, so we found lower drag with fewer simulations. It also checks every rule automatically; it caught our rear wing 0.6 mm too low. And before today's race we sealed our predicted time with a cryptographic hash. Let's open it now and see if we were right."

## 5. Honest limits (judges respect this)

- ORACLE currently runs on **synthetic data**. It becomes fully real once our long CFD runs (L1–L5) finish.
- CFD is a **simulation**. We say "predicted" and show error bands, never "exact".
- Mass and tether-guide rules still need a **physical** check.
- Still to build: ORACLE generating the CAD geometry automatically, a CFD run wizard, and an evidence graph.

## 6. Where to see each thing in the app

- **Pit Wall:** score, aero map, ORACLE vs random, sealed prediction, rules, hero flow image
- **Design Studio:** CAD, Inspect, Rules
- **Wind Tunnel:** Flow, 3D Flow, Render, Forces, Convergence, Mesh
- **Race:** Replay, Telemetry, Spread, Ghost, Start (reaction trainer)
- **E** key: evidence log · **P** key: presenter mode · **Report PDF** link on the Pit Wall

Code: https://github.com/aditya160509/daedalus-x (open source, AGPL-3.0)
