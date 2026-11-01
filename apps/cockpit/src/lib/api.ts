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
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type") && !(init?.body instanceof FormData)) {
      headers.set("content-type", "application/json");
    }
    res = await fetch(`/api${path}`, { ...init, headers });
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
  const detail =
    typeof body === "object" && body !== null && "detail" in body ? body.detail : undefined;
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

const Health = z.object({ status: z.literal("ok") });
export const getHealth = () => request("/v1/health", Health);

const Channel = z.object({
  name: z.string(),
  unit: z.string(),
  values: z.array(z.number()),
});
type Channel = z.infer<typeof Channel>;

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
  trajectory_band: z
    .object({
      time_s: z.array(z.number()),
      p5: z.array(z.number()),
      p50: z.array(z.number()),
      p95: z.array(z.number()),
    })
    .nullable(),
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
  trajectoryBand = false,
) =>
  request("/v1/race/montecarlo", MonteCarlo, {
    method: "POST",
    body: JSON.stringify({ race, uncertainty, n, seed, trajectory_band: trajectoryBand }),
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

const DesignPart = z.object({
  label: z.string(),
  group: z.string(),
  volume_m3: z.number(),
  bbox_min_m: z.tuple([z.number(), z.number(), z.number()]),
  bbox_max_m: z.tuple([z.number(), z.number(), z.number()]),
});
type DesignPart = z.infer<typeof DesignPart>;
export const DesignGeometry = z.object({
  design_id: z.string(),
  source_file: z.string(),
  source_sha256: z.string(),
  transform: z.record(z.string(), z.unknown()),
  length_m: z.number(),
  width_m: z.number(),
  height_m: z.number(),
  frontal_area_m2: z.number(),
  parts: z.array(DesignPart),
  groups: z.record(z.string(), z.array(z.string())),
  warnings: z.array(z.string()),
});
export type DesignGeometry = z.infer<typeof DesignGeometry>;
export const getDesignGeometry = (id: string) =>
  request(`/v1/designs/${encodeURIComponent(id)}/geometry.json`, DesignGeometry);

const RunState = z.enum(["running", "succeeded", "failed"]);
const CfdRunSummary = z.object({
  run_id: z.string(),
  state: RunState,
  speed_m_s: z.number(),
  cd: z.number().nullable(),
  acceptance: z.string().nullable(),
  has_viz: z.boolean().default(false),
});
type CfdRunSummary = z.infer<typeof CfdRunSummary>;
export const listCfdRuns = () => request("/v1/cfd/runs", z.array(CfdRunSummary));

export const RENDER_VIEWS = ["iso", "side", "top", "front"] as const;
export type RenderView = (typeof RENDER_VIEWS)[number];
/** Server-rendered hero still (PNG, cached on disk after the first request). */
export const renderUrl = (runId: string, view: RenderView = "iso") =>
  `/api/v1/cfd/runs/${encodeURIComponent(runId)}/render?view=${view}`;

const Series = z.object({
  iteration: z.array(z.number()),
  values: z.record(z.string(), z.array(z.number())),
});
type Series = z.infer<typeof Series>;

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
  cd_mean: z.number().nullable().optional(),
  cd_ci95: z.tuple([z.number(), z.number()]).nullable().optional(),
  acceptance_mode: z.enum(["steady", "averaged"]).optional(),
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

const BufRef = z.object({
  offset: z.number().int().nonnegative(),
  length: z.number().int().nonnegative(),
  type: z.enum(["f32", "u32", "u8"]),
});
const MeshLayer = z.object({
  positions: BufRef,
  indices: BufRef,
  scalar: BufRef,
  group: BufRef.optional(),
  scalars: z.record(z.string(), BufRef).optional(),
  ranges: z.record(z.string(), z.tuple([z.number(), z.number()])).optional(),
  separation: BufRef.optional(),
  wall_traction: BufRef.optional(),
  vectors: BufRef.optional(),
  groups: z.array(z.string()).optional(),
  scalar_name: z.string(),
  range: z.tuple([z.number(), z.number()]),
});
const LineLayer = z.object({
  positions: BufRef,
  offsets: BufRef,
  scalar: BufRef,
  scalar_name: z.string(),
  range: z.tuple([z.number(), z.number()]),
});
export const VizMeta = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  diagnostics: z
    .object({
      wall_shear: z.enum(["available", "unavailable"]),
      missing_patches: z.array(z.string()).optional(),
      instruction: z.string().optional(),
      drag_check: z.boolean().nullable().optional(),
      drag_relative_error: z.number().nullable().optional(),
    })
    .optional(),
  adjoint: z
    .object({
      status: z.enum(["available", "unavailable"]),
      reason: z.string().optional(),
      field: z.string().optional(),
      assumptions: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  U_m_s: z.number(),
  car: z.object({ length_m: z.number(), width_m: z.number(), height_m: z.number() }),
  acceptance: z.string(),
  reasons: z.array(z.string()),
  iterations: z.number().nullable(),
  bytes: z.number(),
  layers: z.object({
    surface: MeshLayer,
    streamlines: LineLayer,
    wake: MeshLayer,
    centreline: MeshLayer,
    vortices: MeshLayer.extend({
      levels: z.array(z.number()),
      level_definition: z.string(),
    }).optional(),
    wake_shell: MeshLayer.extend({ definition: z.string() }).optional(),
    oilflow: LineLayer.optional(),
    sensitivity: MeshLayer.extend({
      scale_p99: z.number().nonnegative(),
      field: z.string(),
      provenance: z.literal("simulated"),
      assumptions: z.array(z.string()),
      sign: z.string(),
    }).optional(),
    separation: z
      .object({
        positions: BufRef,
        scalar: BufRef,
        scalar_name: z.string(),
        range: z.tuple([z.number(), z.number()]),
        definition: z.string(),
      })
      .optional(),
    xslices: MeshLayer.extend({ offsets: BufRef, x_m: z.array(z.number()) }).optional(),
  }),
  provenance: z.literal("simulated"),
  notes: z.array(z.string()),
});
export type VizMeta = z.infer<typeof VizMeta>;
type BufRef = z.infer<typeof BufRef>;

export const DragBuildup = z.discriminatedUnion("wall_shear", [
  z.object({
    wall_shear: z.literal("unavailable"),
    missing_patches: z.array(z.string()),
    instruction: z.string(),
  }),
  z.object({
    wall_shear: z.literal("available"),
    x_m: z.array(z.number()),
    groups: z.record(z.string(), z.array(z.number())),
    total_cd: z.number(),
    reference_cd: z.number().nullable(),
    relative_error: z.number().nullable(),
    within_2_percent: z.boolean().nullable(),
    provenance: z.literal("simulated"),
    acceptance: z.string(),
    method: z.string(),
  }),
]);
export type DragBuildup = z.infer<typeof DragBuildup>;
export const getDragBuildup = (id: string) =>
  request(`/v1/cfd/runs/${encodeURIComponent(id)}/buildup.json`, DragBuildup);

export interface FlowMesh {
  positions: Float32Array;
  indices: Uint32Array;
  scalar: Float32Array;
  group?: Uint8Array;
  vectors?: Float32Array;
  scalars?: Record<string, Float32Array>;
  ranges?: Record<string, [number, number]>;
  range: [number, number];
  name: string;
}
export interface FlowLines {
  positions: Float32Array;
  offsets: Uint32Array;
  scalar: Float32Array;
  range: [number, number];
  name: string;
}
export interface FlowPoints {
  positions: Float32Array;
  scalar: Float32Array;
  name: string;
}
export interface FlowSlices extends FlowMesh {
  offsets: Uint32Array;
  x_m: number[];
}
export interface FlowField {
  meta: VizMeta;
  surface: FlowMesh;
  streamlines: FlowLines;
  wake: FlowMesh;
  centreline: FlowMesh;
  vortices?: FlowMesh;
  wake_shell?: FlowMesh;
  sensitivity?: FlowMesh;
  oilflow?: FlowLines;
  separation?: FlowPoints;
  xslices?: FlowSlices;
}

/** Views share one immutable binary buffer; GPU geometry is created only by mounted layers. */
function decodeFlowField(meta: VizMeta, buf: ArrayBuffer): FlowField {
  if (buf.byteLength !== meta.bytes) {
    throw new ApiError(`flow-field data is ${buf.byteLength} bytes, expected ${meta.bytes}`, 500);
  }
  const expect = (r: BufRef, type: BufRef["type"], size: number) => {
    if (r.type !== type || r.offset % size || r.offset + r.length * size > buf.byteLength)
      throw new ApiError("Invalid flow-field buffer type, alignment or extent", 500);
  };
  const f32 = (r: BufRef) => (expect(r, "f32", 4), new Float32Array(buf, r.offset, r.length));
  const u32 = (r: BufRef) => (expect(r, "u32", 4), new Uint32Array(buf, r.offset, r.length));
  const u8 = (r: BufRef) => (expect(r, "u8", 1), new Uint8Array(buf, r.offset, r.length));
  const mesh = (l: z.infer<typeof MeshLayer>): FlowMesh => {
    const positions = f32(l.positions);
    const scalar = f32(l.scalar);
    const indices = u32(l.indices);
    if (positions.length % 3 || scalar.length * 3 !== positions.length || indices.length % 3)
      throw new ApiError("Misaligned flow mesh arrays", 500);
    for (const index of indices)
      if (index >= scalar.length) throw new ApiError("Flow mesh index outside vertices", 500);
    const scalars = Object.fromEntries(
      Object.entries(l.scalars ?? {}).map(([key, ref]) => [key, f32(ref)]),
    );
    if (Object.values(scalars).some((values) => values.length !== scalar.length))
      throw new ApiError("Misaligned flow scalar arrays", 500);
    const vectors = l.vectors ? f32(l.vectors) : undefined;
    if (vectors && vectors.length !== positions.length)
      throw new ApiError("Misaligned velocity vectors", 500);
    return {
      positions,
      indices,
      scalar,
      scalars,
      vectors,
      group: l.group ? u8(l.group) : undefined,
      ranges: l.ranges,
      range: l.range,
      name: l.scalar_name,
    };
  };
  const offsets = (ref: BufRef, end: number) => {
    const out = u32(ref);
    if (!out.length || out[0] !== 0 || out[out.length - 1] !== end)
      throw new ApiError("Invalid flow offset sentinels", 500);
    for (let i = 1; i < out.length; i++)
      if (out[i] < out[i - 1]) throw new ApiError("Flow offsets must be monotone", 500);
    return out;
  };
  const lines = (l: z.infer<typeof LineLayer>): FlowLines => {
    const positions = f32(l.positions),
      scalar = f32(l.scalar);
    if (positions.length !== scalar.length * 3) throw new ApiError("Misaligned flow lines", 500);
    return {
      positions,
      scalar,
      offsets: offsets(l.offsets, scalar.length),
      range: l.range,
      name: l.scalar_name,
    };
  };
  const L = meta.layers;
  const slices = L.xslices ? mesh(L.xslices) : undefined;
  const sliceOffsets =
    L.xslices && slices ? offsets(L.xslices.offsets, slices.indices.length) : undefined;
  if (L.xslices && sliceOffsets && sliceOffsets.length !== L.xslices.x_m.length + 1)
    throw new ApiError("Plane offsets and positions disagree", 500);
  return {
    meta,
    surface: mesh(L.surface),
    wake: mesh(L.wake),
    centreline: mesh(L.centreline),
    streamlines: lines(L.streamlines),
    oilflow: L.oilflow ? lines(L.oilflow) : undefined,
    vortices: L.vortices ? mesh(L.vortices) : undefined,
    wake_shell: L.wake_shell ? mesh(L.wake_shell) : undefined,
    sensitivity: L.sensitivity ? mesh(L.sensitivity) : undefined,
    separation: L.separation
      ? {
          positions: f32(L.separation.positions),
          scalar: f32(L.separation.scalar),
          name: L.separation.scalar_name,
        }
      : undefined,
    xslices:
      slices && sliceOffsets && L.xslices
        ? { ...slices, offsets: sliceOffsets, x_m: L.xslices.x_m }
        : undefined,
  };
}

export async function getFlowField(runId: string): Promise<FlowField> {
  const base = `/v1/cfd/runs/${encodeURIComponent(runId)}`;
  const [meta, res] = await Promise.all([
    request(`${base}/viz.json`, VizMeta),
    fetch(`/api${base}/viz.bin`),
  ]);
  if (!res.ok) throw new ApiError(`flow-field data: ${res.statusText}`, res.status);
  return decodeFlowField(meta, await res.arrayBuffer());
}

const JobState = z.enum(["queued", "running", "succeeded", "failed", "cancelled"]);
export const Job = z.object({
  id: z.string(),
  kind: z.enum(["cfd_run", "cfd_viz", "geometry_import", "montecarlo_batch"]),
  params: z.record(z.string(), z.unknown()),
  state: JobState,
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  pid: z.number().nullable(),
  log_path: z.string(),
  result_path: z.string().nullable(),
  error: z.string().nullable(),
});
export type Job = z.infer<typeof Job>;
export const listJobs = () => request("/v1/jobs", z.array(Job));
export const cancelJob = (id: string) =>
  request(`/v1/jobs/${encodeURIComponent(id)}/cancel`, Job, { method: "POST" });
const JobLog = z.object({
  text: z.string(),
  offset: z.number().int().nonnegative(),
  has_more: z.boolean(),
  stage_log: z.string(),
  iteration: z.number().nullable(),
  end_time: z.number().nullable(),
});
type JobLog = z.infer<typeof JobLog>;
export const getJobLog = (id: string, offset: number) =>
  request(`/v1/jobs/${encodeURIComponent(id)}/log?offset=${offset}`, JobLog);
export interface CfdJobInput {
  design: string;
  run: string;
  speed: number;
  fidelity: "quick" | "final";
  procs: number;
}
export const submitCfdJob = (params: CfdJobInput) =>
  request("/v1/jobs", Job, { method: "POST", body: JSON.stringify({ kind: "cfd_run", params }) });

const StudyCase = z.object({
  label: z.string(),
  run_id: z.string(),
  job_id: z.string(),
  base_cell_m: z.number(),
  speed_m_s: z.number(),
  cells: z.number().nullable(),
  cd: z.number().nullable(),
  ci95: z.tuple([z.number(), z.number()]).nullable(),
  quality_eligible: z.boolean(),
  acceptance: z.string().nullable(),
});
export const GridStudy = z.object({
  study_id: z.string(),
  provenance: z.literal("simulated"),
  state: z.string(),
  note: z.string(),
  cases: z.array(StudyCase),
  gci: z
    .object({
      status: z.string(),
      reason: z.string(),
      ratio: z.number().nullable(),
      order: z.number().nullable(),
      extrapolated_cd: z.number().nullable(),
      gci_fine_pct: z.number().nullable(),
      asymptotic_ratio: z.number().nullable(),
    })
    .nullable(),
  speed_check: z
    .object({
      slope: z.number(),
      slope_ci95: z.tuple([z.number(), z.number()]),
      re_insensitive_within_ci: z.boolean(),
      interpretation: z.string(),
    })
    .nullable(),
});
export type GridStudy = z.infer<typeof GridStudy>;
export const listStudies = () => request("/v1/studies", z.array(GridStudy));

// ORACLE (T10)
const OracleVariable = z.object({
  name: z.string(),
  unit: z.string(),
  low: z.number(),
  high: z.number(),
});
export const OracleState = z.object({
  variables: z.array(OracleVariable),
  observations: z.array(
    z.object({ unit: z.array(z.number()), cda_m2: z.number(), provenance: Provenance }),
  ),
  best: z.object({ index: z.number(), cda_m2: z.number(), race_time_s: z.number() }),
  next: z.object({
    params: z.record(z.string(), z.number()),
    unit: z.array(z.number()),
    expected_improvement_m2: z.number(),
    cda_m2: z.number(),
    cda_sd_m2: z.number(),
    race_time_s: z.number(),
  }),
  aero_map: z.object({
    x: z.string(),
    y: z.string(),
    axis: z.array(z.number()),
    cda_m2: z.array(z.array(z.number())),
  }),
  benchmark: z.object({ gp: z.array(z.number()), lhs: z.array(z.number()) }),
  provenance: z.enum(["synthetic", "mixed"]),
});
export type OracleState = z.infer<typeof OracleState>;
export const getOracleState = () => request("/v1/oracle/state", OracleState);

// Sealed predictions (T09)
const Qty = z.object({ value: z.number(), unit: z.string() });
export const SealedPrediction = z.looseObject({
  prediction_id: z.string(),
  predicted: Qty,
  interval_low: Qty,
  interval_high: Qty,
  sealed_at: z.string().nullable(),
  manifest_hash: z.string().nullable(),
});
export type SealedPrediction = z.infer<typeof SealedPrediction>;
export const listPredictions = () => request("/v1/predictions", z.array(SealedPrediction));
export const ScoreResult = z.looseObject({ inside_interval: z.boolean() });
export const scorePrediction = (id: string, measured_s: number) =>
  request(`/v1/predictions/${id}/score`, ScoreResult, {
    method: "POST",
    body: JSON.stringify({ measured_value: measured_s, unit: "s" }),
  });

// FORGE (T11)
export const RuleCheck = z.object({
  rule_id: z.string(),
  name: z.string(),
  page: z.number(),
  unit: z.string(),
  value: z.number().nullable(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  margin: z.number().nullable(),
  state: z.enum(["pass_cad_only", "at_risk", "fail_cad", "manual_review"]),
  penalty: z.string(),
  parts: z.array(z.string()),
  note: z.string(),
});
export type RuleCheck = z.infer<typeof RuleCheck>;
export const ForgeChecks = z.object({
  revision: z.string(),
  is_reference_only: z.boolean(),
  checks: z.array(RuleCheck),
});
export const getForgeChecks = (design: string) =>
  request(`/v1/forge/checks?design=${encodeURIComponent(design)}`, ForgeChecks);

// ATLAS evidence (T12)
export const EvidenceRow = z.object({
  id: z.string(),
  kind: z.string(),
  created_at: z.string(),
  body: z.record(z.string(), z.unknown()),
  verified: z.boolean(),
});
export type EvidenceRow = z.infer<typeof EvidenceRow>;
export const listEvidence = (q?: string) =>
  request(`/v1/evidence/records${q ? `?q=${encodeURIComponent(q)}` : ""}`, z.array(EvidenceRow));

export const CadImport = z.object({
  design_id: z.string(),
  artifact_id: z.string(),
  warnings: z.array(z.string()),
  checks: z.array(RuleCheck),
});
export type CadImport = z.infer<typeof CadImport>;

/** Save the in-browser CAD's parts (one named STEP each) as a new, rule-checked car design. */
export const importCadStep = (parts: { name: string; blob: Blob }[], name: string) => {
  const body = new FormData();
  for (const p of parts) body.append("files", p.blob, `${p.name}.step`);
  body.append("name", name);
  return request("/v1/designs/import", CadImport, { method: "POST", body });
};
