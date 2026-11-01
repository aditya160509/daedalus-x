# Repo map: what exists and where to build

Repo: `github.com/aditya160509/daedalus-x` (private), local at `~/Documents/f1/daedalus-x`, branch `main`.

```
daedalus-x/
├── src/daedalus/              Python package (backend + pipelines)
│   ├── contracts.py           frozen Pydantic records for every spec §9 entity
│   ├── store.py               EvidenceStore: append-only SQLite + content-addressed artifacts
│   ├── dynamics.py            TITAN M0/M1/M2 race model (solve_ivp), CarParams, ThrustCurve
│   ├── montecarlo.py          vectorised race-time spread (RK4 burn + analytic coast)
│   ├── predictions.py         sealed predictions: canonical hash, verify, score
│   ├── geometry.py            STEP → engineering frame, force groups, cfd/*.stl, display.glb
│   ├── cfd.py                 OpenFOAM half-car case writer, runner, evaluator (acceptance gates)
│   ├── jobs.py                durable SQLite job queue + subprocess worker (T02)
│   ├── gridstudy.py           grid/speed study planning and GCI (T03)
│   ├── adjoint.py             gated frozen-turbulence adjoint tooling (T05)
│   ├── viz/                   field export package: Cp, streamlines, Q, oil flow, separation, drag build-up
│   ├── cli.py                 `daedalus geometry import`, `daedalus cfd run|viz`
│   └── api/
│       ├── __init__.py        create_app(): mounts routers, /v1/health
│       ├── race.py            POST /v1/race/simulate, POST /v1/race/montecarlo
│       └── engineering.py     /v1/designs, /v1/designs/{id}/display.glb, /v1/cfd/runs[...], viz.json/bin
├── tests/                     pytest per module (121 passing, run `uv run pytest`)
├── apps/cockpit/              Next.js UI
│   └── src/
│       ├── app/               routes: design, simulate, race, optimize, inspect, evidence
│       │   ├── design/DesignWorkspace.tsx
│       │   ├── simulate/SimulateWorkspace.tsx, FlowPanel.tsx
│       │   └── race/RaceWorkspace.tsx, SpreadPanel.tsx
│       ├── components/
│       │   ├── shell/AppShell.tsx       232px sidebar, breadcrumb header
│       │   ├── ui/                      shadcn + primitives.tsx (Panel, Metric, ProvenanceBadge, …)
│       │   ├── charts/                  useECharts, HistoryChart, ForceBars, SpreadChart, TelemetryChart
│       │   └── viewer/                  CarViewer (GLB), FlowViewer (fields)
│       └── lib/                         api.ts (Zod + fetchers), colormap.ts, gltf.ts, thrust.ts, utils.ts
├── data/ (git-ignored)        designs/<id>/, runs/<id>/, reference/
├── evidence/                  one markdown note per finished task (+ screens/)
├── docs/SPEC.md               the spec (Appendix B = visual feature list)
├── docs/build/                THIS PACK
└── STATUS.md                  step table
```

## Data on disk you can use now
- `data/designs/orbit_baseline/`: Team Orbit 2025 reference car (CC BY, stand-in until the team CAD arrives). Contains `geometry.json`, `cfd/{body,front_wing,rear_wing,wheels,cartridge}.stl` and `display.glb`.
- `data/runs/orbit_baseline_20ms/`: a finished 782k-cell run (**rejected**: Cd oscillates 5.6%, 9 skewed faces). Fields at time `1500`, `postProcessing/` histories, `viz/` export. Use it to develop post-processing without re-solving.

## Engineering frame (never change)
x is downstream with the nose at x = 0, y is lateral with the car symmetric about y = 0, and z is up with the ground at z = 0. Units are metres. The CFD is a half model on y ≥ 0 with a `symmetry` patch at y = 0; mirror for display. Three.js rotates by −90° about x (see `FlowViewer`).

## Key commands
```bash
uv run daedalus geometry import <STEP> data/designs/<id> --forward -Y --up +Z
uv run daedalus cfd run data/designs/<id> data/runs/<run> --fidelity quick --procs 8
uv run daedalus cfd viz data/runs/<run>
uv run daedalus-api                     # API on :8000
pnpm --dir apps/cockpit dev            # UI on :3000 (proxy /api → :8000)
```
