# Daedalus X cockpit

Next.js 16 / React 19 UI for the Daedalus X backend. See `docs/build/` for the engineering rules and UI bar.

```bash
pnpm install
pnpm dev        # http://localhost:3000, proxies /api to the backend (DAEDALUS_API_ORIGIN, default http://127.0.0.1:8000)
pnpm check      # format, tsrs typecheck, oxlint (type-aware), vitest
pnpm typecheck:ref && pnpm build
```
