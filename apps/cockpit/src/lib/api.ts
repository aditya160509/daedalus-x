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
