# T19 energy-loss audit: close-out

## Verified chain (code, not the old task note)

- `src/daedalus/energy.py` computes thrust work, kinetic energy at the finish, drag and rolling losses, conversion efficiency, the dominant loss, the coast-phase loss and an integration closure check.
- `POST /v1/analysis/energy` in `src/daedalus/api/analysis.py` validates the race inputs and returns the audit.
- `getEnergyAudit()` in `apps/cockpit/src/lib/api.ts` and `EnergyPanel` in `components/race/EnergyPanel.tsx` are connected to the Race workspace's **Energy** tab (`RaceWorkspace.tsx`).
- The panel shows a segmented energy split, thrust work, kept-as-speed efficiency, biggest loss and coast loss, plus the closure percentage.

## Checks

- `pytest tests/test_energy.py tests/test_api_analysis.py` → passed as part of the 26-test focused run.
- `tsc --noEmit`, focused lint and `pnpm build` cover the UI connection.

## Limits

- The audit is computed from the race model's predicted thrust, drag area and rolling coefficient, so it is a prediction, not a measured energy balance.
- The closure percentage tests the numerical integration, not the physical model.
- No browser/visual check was run.
