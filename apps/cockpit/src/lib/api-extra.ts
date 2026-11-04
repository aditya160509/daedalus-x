/**
 * Client calls for the race and compute views that are not in api.ts. Kept in their own module
 * so the schemas for these endpoints can change without touching the shared client.
 */
import { z } from "zod";
import {
  MonteCarlo,
  type RaceSimulation,
  RaceSimulation as RaceSimulationSchema,
  type RaceSimulationRequest,
  type UncertaintyInput,
} from "./api";

class ExtraApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ExtraApiError("API unreachable — start it with `uv run daedalus-api`", 0);
  }
  const json: unknown = await res.json().catch(() => undefined);
  if (!res.ok) throw new ExtraApiError(`Request failed (${res.status})`, res.status);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ExtraApiError("Response did not match contract", res.status);
  return parsed.data;
}

/** One race simulation. The same endpoint the Race workspace uses. */
export const simulateRaceExtra = (req: RaceSimulationRequest): Promise<RaceSimulation> =>
  call("/v1/race/simulate", RaceSimulationSchema, req);

/** Monte Carlo percentiles at a given sample count and seed (no trajectory band). */
export const monteCarloAt = (
  race: RaceSimulationRequest,
  uncertainty: UncertaintyInput,
  n: number,
  seed = 0,
) => call("/v1/race/montecarlo", MonteCarlo, { race, uncertainty, n, seed });

const ComputeRun = z.object({
  run_id: z.string(),
  status: z.enum(["succeeded", "failed", "running", "unknown"]),
  acceptance: z.string().nullable(),
  cells: z.number().nullable(),
  iterations: z.number().nullable(),
  solver_cpu_s: z.number().nullable(),
  solver_wall_s: z.number().nullable(),
  source: z.string(),
  logs: z.array(z.string()),
});
type ComputeRun = z.infer<typeof ComputeRun>;

/** Per-run cells, solver wall time and status, read from the run logs by the API. */
export const listCfdCompute = () => call("/v1/cfd/compute", z.array(ComputeRun));
