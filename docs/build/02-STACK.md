# Software and packages (exact)

Everything here is free and open source. Pin to these versions or newer compatible ones. Add a package only if the task file names it or you record the reason in your evidence note.

## Installed and in use
| Layer | Tool | Notes |
|---|---|---|
| Python env | **uv 0.13** | `uv add <pkg>`, `uv run <cmd>`. Never pip install globally. Run `uv self update` if older. |
| Lint / types / tests | **ruff 0.17**, **Pyrefly 1.4** (strict preset; replaced mypy), pytest 9 | Pyrefly: 0.65 s cold vs mypy 8.0 s, more spec-conformant, and it found real bugs mypy missed. ty is still 0.0.x, so not used. pytest-xdist was measured slower on this suite (heavy imports), so not used. |
| API | FastAPI, Pydantic v2, uvicorn | `uv run daedalus-api` → 127.0.0.1:8000 |
| Numerics | NumPy ≥2.5, SciPy ≥1.18 | |
| Units | Pint | parsing user input |
| CAD | build123d 0.13, trimesh | STEP import, tessellation via `export_stl` |
| CFD | **OpenFOAM v2606 (ESI)** via OpenFOAM.app | call as `openfoam -c "<cmd>"`; MPI ≤ 8 ranks |
| CFD I/O | foamlib (dict parsing), PyVista ≥0.49 / VTK 9.7 (`POpenFOAMReader`) | field post-processing in `viz/` |
| Package manager | **pnpm 12** (Rust rewrite) | `pnpm install` about 28 s cold. Bun was not chosen because it swaps the Node runtime under Next. `packageManager` is pinned in `package.json`. |
| Frontend | **Next.js 16.4** (Turbopack), **React 19.3**, Tailwind 4.3 | `apps/cockpit`; `pnpm build` about 6 s. Next 16 runs the TS 7 `tsc` CLI itself, so no TypeScript 5 remains. |
| UI kit | shadcn/ui (new-york), radix-ui 1.8, lucide-react 1.x, cva, tailwind-merge 3.7 | add components with `pnpm dlx shadcn@latest add <name>` |
| 3D | three 0.187, @react-three/fiber 9.8, @react-three/drei 10.7.9 | |
| Charts | ECharts 6.1 | via `useECharts` |
| Data | TanStack Query 5.105, Zod 4.6 | |
| Type check | **tsrs** (Rust port of TS 7) via `pnpm typecheck`, about 0.07 s. **TypeScript 7.0.2** via `pnpm typecheck:ref` is the reference (also used by `next build`) | Benchmarked 2026-11-01: tsc 5.9 1.26 s, TS 7 0.17 s, tsrs 0.07 s, with identical diagnostics. tsrs is pre-1.0, so the reviewer runs `typecheck:ref` before accepting. |
| Lint | **oxlint 1.90 `--type-aware`** (`.oxlintrc.json`; type-aware rules via oxlint-tsgolint). Plugins: typescript, react, react-hooks, nextjs, jsx-a11y, import, unicorn, oxc | `npm run lint`, about 0.36 s with type info (0.08 s without). Biome lint measured 0.34 s with fewer rules and no type awareness, so it isn't used. ESLint is removed. |
| Format | **oxfmt 0.75** (`.oxfmtrc.json`, printWidth 100) | Output was byte-identical to Prettier 3.9 on this codebase. Prettier is removed. |
| Quality gates (web) | **React Compiler** (`reactCompiler: true`, babel-plugin-react-compiler 1.0; `pnpm compiler:check` reports 115/115 components compile), **knip** (unused files/exports/deps, in `pnpm check`), **jscpd** (duplication, threshold 1%, in `pnpm check`), **size-limit** (`pnpm size`, 1 MB gzip budget over `.next/static/chunks`, run after build), **react-doctor** (`npx react-doctor@latest .`, advisory; some rules are false positives for worker/R3F code) | oxlint 1.90 has no compiler rules, so the compiler's own bail-outs (healthcheck) are the check. |
| Quality gates (py) | ruff `S` (bandit) and `C901` (max 20), **deptry** (`uv run deptry .`), **vulture** (`uv run vulture src --min-confidence 80`; below 80 it flags every FastAPI route) | `S603` ignored: subprocess is always called with argument lists. |
| Security | **pip-audit** (`uv export --no-hashes --no-emit-project`, then `uvx pip-audit -r … --no-deps --disable-pip`), `pnpm audit --prod`, **gitleaks** (history + staged), osv-scanner (manual) | Last run: 0 production CVEs, no secrets in 44 commits. |
| Hooks | **lefthook** (`lefthook.yml`, `lefthook install` once): ruff, pyrefly, cockpit format/typecheck/lint and gitleaks on staged files | |
| Tests (web) | **Vitest 5** | Playwright 1.64 exists but is reviewer-only |

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
