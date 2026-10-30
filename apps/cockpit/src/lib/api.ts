import { z } from "zod";

/** Typed client for the Daedalus X API (proxied at /api by next.config.ts). */

export const Provenance = z.enum(["measured", "simulated", "predicted", "estimated", "synthetic"]);
export type Provenance = z.infer<typeof Provenance>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("API unreachable — start it with `uv run daedalus-api`", 0);
  }
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new ApiError(formatDetail(body) ?? `Request failed (${res.status})`, res.status, body);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(`Response did not match contract: ${parsed.error.message}`, res.status);
  }
  return parsed.data;
}

function formatDetail(body: unknown): string | undefined {
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(
        (d: { loc?: unknown[]; msg?: string }) => `${(d.loc ?? []).slice(1).join(".")}: ${d.msg}`,
      )
      .join("; ");
  }
  return undefined;
}

export const Health = z.object({ status: z.literal("ok") });
export const getHealth = () => request("/v1/health", Health);

export const Channel = z.object({
  name: z.string(),
  unit: z.string(),
  values: z.array(z.number()),
});
export type Channel = z.infer<typeof Channel>;

export const RaceSimulation = z.object({
  model: z.string(),
  provenance: z.literal("predicted"),
  input_provenance: z.array(Provenance),
  finished: z.boolean(),
  time_s: z.number().nullable(),
  stop_reason: z.string(),
  peak_speed_m_s: z.number(),
  time_axis: Channel,
  channels: z.array(Channel),
});
export type RaceSimulation = z.infer<typeof RaceSimulation>;

export interface RaceSimulationRequest {
  model: "M1" | "M2";
  mass_kg: number;
  track_length_m: number;
  thrust: { t_s: number[]; force_n: number[]; provenance: Provenance; source: string };
  cda_m2: number;
  crr: number;
  rho_kg_m3: number;
  input_provenance: Provenance;
}

export const simulateRace = (req: RaceSimulationRequest) =>
  request("/v1/race/simulate", RaceSimulation, { method: "POST", body: JSON.stringify(req) });

export const MonteCarlo = z.object({
  provenance: z.literal("predicted"),
  n: z.number(),
  seed: z.number(),
  finish_fraction: z.number(),
  mean_s: z.number().nullable(),
  std_s: z.number().nullable(),
  percentiles_s: z.record(z.string(), z.number()),
  sensitivity: z.record(z.string(), z.number()),
  histogram: z.object({ edges_s: z.array(z.number()), counts: z.array(z.number()) }),
});
export type MonteCarlo = z.infer<typeof MonteCarlo>;
export interface UncertaintyInput {
  mass: number;
  cda: number;
  crr: number;
  thrust: number;
}
export const raceMonteCarlo = (
  race: RaceSimulationRequest,
  uncertainty: UncertaintyInput,
  n = 1000,
  seed = 0,
) =>
  request("/v1/race/montecarlo", MonteCarlo, {
    method: "POST",
    body: JSON.stringify({ race, uncertainty, n, seed }),
  });

export const DesignSummary = z.object({
  design_id: z.string(),
  source_file: z.string(),
  source_sha256: z.string(),
  length_m: z.number(),
  width_m: z.number(),
  height_m: z.number(),
  frontal_area_m2: z.number(),
  groups: z.record(z.string(), z.array(z.string())),
  warnings: z.array(z.string()),
  provenance: Provenance,
});
export type DesignSummary = z.infer<typeof DesignSummary>;
export const listDesigns = () => request("/v1/designs", z.array(DesignSummary));
export const designGlbUrl = (id: string) => `/api/v1/designs/${encodeURIComponent(id)}/display.glb`;

export const RunState = z.enum(["running", "succeeded", "failed"]);
export const CfdRunSummary = z.object({
  run_id: z.string(),
  state: RunState,
  speed_m_s: z.number(),
  cd: z.number().nullable(),
  acceptance: z.string().nullable(),
});
export type CfdRunSummary = z.infer<typeof CfdRunSummary>;
export const listCfdRuns = () => request("/v1/cfd/runs", z.array(CfdRunSummary));

const Series = z.object({
  iteration: z.array(z.number()),
  values: z.record(z.string(), z.array(z.number())),
});
export type Series = z.infer<typeof Series>;

const GroupForce = z.object({
  drag_x: z.number(),
  side_y: z.number(),
  lift_z: z.number(),
  pressure_drag_x: z.number(),
  viscous_drag_x: z.number(),
});

export const CfdResult = z.object({
  succeeded: z.boolean(),
  steps: z.array(
    z.object({
      name: z.string(),
      command: z.string(),
      seconds: z.number(),
      returncode: z.number(),
    }),
  ),
  cells: z.number().nullable(),
  mesh_ok: z.boolean().nullable(),
  mesh_failures: z.array(z.string()),
  iterations: z.number().nullable(),
  converged_by_residuals: z.boolean().nullable(),
  cd: z.number().nullable(),
  cl: z.number().nullable(),
  cd_window_spread: z.number().nullable(),
  forces_n: z.record(z.string(), GroupForce),
  force_sum_check: z.record(z.string(), z.number()),
  acceptance: z.string(),
  reasons: z.array(z.string()),
  host: z.record(z.string(), z.string()),
});
export type CfdResult = z.infer<typeof CfdResult>;

export const CfdRunDetail = z.object({
  run_id: z.string(),
  state: RunState,
  manifest: z.object({
    template: z.string(),
    config: z.record(z.string(), z.unknown()),
    car: z.object({
      length_m: z.number(),
      width_m: z.number(),
      height_m: z.number(),
      frontal_area_m2: z.number(),
      groups: z.array(z.string()),
    }),
    base_cells: z.array(z.number()),
    reference: z.object({
      U_m_s: z.number(),
      lRef_m: z.number(),
      Aref_full_m2: z.number(),
      Aref_half_m2: z.number(),
    }),
    assumptions: z.array(z.string()),
  }),
  result: CfdResult.nullable(),
  coefficients: Series.nullable(),
  residuals: Series.nullable(),
  provenance: z.literal("simulated"),
});
export type CfdRunDetail = z.infer<typeof CfdRunDetail>;
export const getCfdRun = (id: string) =>
  request(`/v1/cfd/runs/${encodeURIComponent(id)}`, CfdRunDetail);
