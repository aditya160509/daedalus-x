# Software and packages (exact)

Everything here is free and open source. Pin to these versions or newer compatible ones. Add a package only if the task file names it or you record the reason in your evidence note.

## Installed and in use
| Layer | Tool | Notes |
|---|---|---|
| Python env | **uv** | `uv add <pkg>`, `uv run <cmd>`. Never pip install globally. |
| Lint / types / tests | ruff, mypy (strict), pytest | configured in `pyproject.toml` |
| API | FastAPI, Pydantic v2, uvicorn | `uv run daedalus-api` → 127.0.0.1:8000 |
| Numerics | NumPy ≥2.5, SciPy ≥1.18 | |
| Units | Pint | parsing user input |
| CAD | build123d 0.13, trimesh | STEP import, tessellation via `export_stl` |
| CFD | **OpenFOAM v2606 (ESI)** via OpenFOAM.app | call as `openfoam -c "<cmd>"`; MPI ≤ 8 ranks |
| CFD I/O | foamlib (dict parsing), PyVista ≥0.49 / VTK 9.7 (`POpenFOAMReader`) | field post-processing in `viz.py` |
| Frontend | Next.js 15.5, React 19.1, TypeScript 5, Tailwind 4 | `apps/cockpit` |
| UI kit | shadcn/ui (new-york), radix-ui 1.4, lucide-react, cva, tailwind-merge | add components with `npx shadcn@latest add <name>` |
| 3D | three 0.180, @react-three/fiber 9.3, @react-three/drei 10.7 | |
| Charts | ECharts 6 | via `useECharts` |
| Data | TanStack Query 5, Zod 4 | |
| Type check | **tsrs** (Rust port of TypeScript 7, oxc-project) via `npm run typecheck`, about 0.07 s. **TypeScript 7.0.2** (Go, Microsoft) via `npm run typecheck:ref` is the reference | Benchmarked 2026-11-01 on this repo (5-run average): tsc 5.9 1.26 s, TS 7 0.17 s, tsrs `--fast` 0.07 s, with identical diagnostics on an injected-error probe. tsrs is pre-1.0 (0.20, tracking TS 7.1), so **the reviewer runs `typecheck:ref` before accepting**. `typescript@5.9` stays only for Next 15's `next.config.ts` loader (Next ≥16 drives the TS 7 CLI directly, so the Next 16 upgrade can drop it). Never import `typescript` in app code. |
| Lint | **oxlint 1.90 `--type-aware`** (`.oxlintrc.json`; type-aware rules via oxlint-tsgolint). Plugins: typescript, react, react-hooks, nextjs, jsx-a11y, import, unicorn, oxc | `npm run lint`, about 0.36 s with type info (0.08 s without). Biome lint measured 0.34 s with fewer rules and no type awareness, so it isn't used. ESLint is removed. |
| Format | Prettier 3 | `npm run format` (oxfmt is still beta; revisit when it reaches 1.0) |
| Tests (web) | Vitest 3 | Playwright exists but is reviewer-only |

## To add when the task requires it
| Task | Package | Why |
|---|---|---|
| T05 adjoint | none (OpenFOAM `adjointOptimisationFoam` ships with v2606) | drag sensitivity map |
| T06/T07 visuals | `@react-three/postprocessing` + `postprocessing` | bloom for glowing streamlines, SMAA, tone mapping |
| T06 | `three-stdlib` (already a drei dependency) | LineSegments2/LineMaterial for thick lines |
| T07 | drei `Environment`, `Lightformer`, `AccumulativeShadows`, `ContactShadows`, `MeshReflectorMaterial` | studio render, no new install |
| T08 | `motion` (Framer Motion v11+) | UI transitions only, never for 3D |
| T10 ORACLE | `ax-platform`, `botorch`, `torch` (CPU) | GP surrogate + Bayesian optimisation |
| T10 | `scipy.stats.qmc` (installed) | Latin hypercube baseline |
| T11 FORGE | `pdfplumber` | extract rulebook text for clause mapping |
| T12/T13 report | **Typst** CLI (`brew install typst`) + `jinja2` | one-click PDF report |
| T13 AR | `@google/model-viewer` | WebXR / Quick Look AR from GLB |
| T09 import | `pandas` (optional), `pint` | CSV/XLSX timing and scale data |

## Explicitly not allowed
Paid CFD (Ansys, STAR-CCM+, SimScale paid tiers), hosted LLM calls from the app, Mapbox or Google Maps keys, analytics SDKs, any CDN at runtime (bundle everything).
