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
const SealedPrediction = z.looseObject({
  prediction_id: z.string(),
  predicted: Qty,
  interval_low: Qty,
  interval_high: Qty,
  sealed_at: z.string().nullable(),
  manifest_hash: z.string().nullable(),
});
type SealedPrediction = z.infer<typeof SealedPrediction>;
export const listPredictions = () => request("/v1/predictions", z.array(SealedPrediction));
const AnchorStatus = z.object({
  token_count: z.number().int().nonnegative(),
  ca_configured: z.boolean(),
});
const AnchorResponse = z.object({
  prediction_id: z.string(),
  tsa: z.string(),
  gen_time: z.string(),
  verify: z.string(),
});
const AnchorVerification = z.object({ verified: z.boolean(), detail: z.string() });
export const getAnchorStatus = (id: string) =>
  request(`/v1/analysis/predictions/${encodeURIComponent(id)}/anchor`, AnchorStatus);
export const submitAnchor = (id: string) =>
  request(`/v1/analysis/predictions/${encodeURIComponent(id)}/anchor`, AnchorResponse, {
    method: "POST",
  });
export const verifyAnchor = (id: string) =>
  request(`/v1/analysis/predictions/${encodeURIComponent(id)}/anchor/verify`, AnchorVerification, {
    method: "POST",
  });
const ScoreResult = z.looseObject({ inside_interval: z.boolean() });
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
const PointsAtRisk = z.object({
  failing_points: z.number(),
  at_risk_points: z.number(),
  failing_rules: z.array(z.string()),
  at_risk_rules: z.array(z.string()),
  manual_review_rules: z.number(),
  unquantified_rules: z.array(z.string()),
});
const ForgeChecks = z.object({
  revision: z.string(),
  rulebook: z.string().optional(),
  is_reference_only: z.boolean(),
  checks: z.array(RuleCheck),
  points_at_risk: PointsAtRisk.optional(),
});
/** Printable scrutineering sheet for a design (opens the PDF in a new tab). */
export const forgeSheetUrl = (design: string) =>
  `/api/v1/forge/sheet.pdf?design=${encodeURIComponent(design)}`;
export const getForgeChecks = (design: string) =>
  request(`/v1/forge/checks?design=${encodeURIComponent(design)}`, ForgeChecks);

const ForgeFrontier = z.object({
  rows: z.array(
    z.object({
      rule_id: z.string(),
      name: z.string(),
      headroom: z.number(),
      unit: z.string(),
      points_if_one_unit_over: z.number().nullable(),
      limit_side: z.enum(["min", "max"]),
    }),
  ),
});
export type ForgeFrontier = z.infer<typeof ForgeFrontier>;
export const getForgeFrontier = (design: string) =>
  request(`/v1/forge/frontier?design=${encodeURIComponent(design)}`, ForgeFrontier);

export const measureForge = (design: string) =>
  request(
    `/v1/forge/measure?design=${encodeURIComponent(design)}`,
    z.object({ design: z.string(), parts_measured: z.number() }),
    { method: "POST" },
  );

// ATLAS evidence (T12)
export const EvidenceRow = z.object({
  id: z.string(),
  kind: z.string(),
  created_at: z.string(),
  body: z.record(z.string(), z.unknown()),
  verified: z.boolean(),
});
export type EvidenceRow = z.infer<typeof EvidenceRow>;
const EvidenceLineage = z.object({
  nodes: z.array(EvidenceRow),
  edges: z.array(
    z.object({ id: z.string(), source: z.string(), target: z.string(), field: z.string() }),
  ),
  truncated: z.boolean(),
  outside_window: z.number(),
  missing_references: z.array(z.string()),
});
export type EvidenceLineage = z.infer<typeof EvidenceLineage>;
export const getEvidenceLineage = () => request("/v1/evidence/lineage", EvidenceLineage);

export const listEvidence = (q?: string) =>
  request(`/v1/evidence/records${q ? `?q=${encodeURIComponent(q)}` : ""}`, z.array(EvidenceRow));

const CadImport = z.object({
  design_id: z.string(),
  artifact_id: z.string(),
  warnings: z.array(z.string()),
  checks: z.array(RuleCheck),
});
type CadImport = z.infer<typeof CadImport>;

/** Save the in-browser CAD's parts (one named STEP each) as a new, rule-checked car design. */
export const importCadStep = (parts: { name: string; blob: Blob }[], name: string) => {
  const body = new FormData();
  for (const p of parts) body.append("files", p.blob, `${p.name}.step`);
  body.append("name", name);
  return request("/v1/designs/import", CadImport, { method: "POST", body });
};

const RaceBreakdown = z.object({
  budget_ms: z.object({
    car_time_ms: z.number(),
    drag_ms: z.number(),
    rolling_ms: z.number(),
    mass_above_minimum_ms: z.number(),
    reaction_ms: z.number(),
    total_time_ms: z.number(),
  }),
  tornado: z.array(z.object({ input: z.string(), low_ms: z.number(), high_ms: z.number() })),
  exchange_rates: z.object({
    ms_per_gram: z.number(),
    ms_per_cm2_cda: z.number(),
    ms_per_0p001_crr: z.number(),
    ms_per_percent_thrust: z.number(),
  }),
});
export type RaceBreakdown = z.infer<typeof RaceBreakdown>;
export const getRaceBreakdown = (race: RaceSimulationRequest, reactionS: number) =>
  request("/v1/analysis/race-breakdown", RaceBreakdown, {
    method: "POST",
    body: JSON.stringify({
      mass_kg: race.mass_kg,
      track_length_m: race.track_length_m,
      thrust: { t_s: race.thrust.t_s, force_n: race.thrust.force_n },
      cda_m2: race.cda_m2,
      crr: race.crr,
      rho_kg_m3: race.rho_kg_m3,
      reaction_s: reactionS,
    }),
  });

// Analysis (T19 energy audit, T21 beam FEM, T33 project twin)
const PlannerSd = z.object({ cda: z.number(), crr: z.number(), thrust: z.number() });
const PlannerStep = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("timing_run"),
    track_m: z.number(),
    mass_kg: z.number(),
    information_gain_nats: z.number(),
    relative_sd: PlannerSd,
  }),
  z.object({
    kind: z.literal("coast_down"),
    speed_mps: z.number(),
    distance_m: z.number(),
    mass_kg: z.number(),
    information_gain_nats: z.number(),
    relative_sd: PlannerSd,
  }),
]);
const TestPlan = z.object({
  starting_relative_sd: PlannerSd,
  poorly_identified: z.array(z.string()),
  steps: z.array(PlannerStep),
  assumptions: z.array(z.string()),
});
export type TestPlan = z.infer<typeof TestPlan>;
export interface TestPlanRequest {
  thrust: { t_s: number[]; force_n: number[] };
  cda_m2: number;
  crr: number;
  thrust_scale: number;
  rho_kg_m3: number;
  candidates: { track_m: number; mass_kg: number }[];
  coast_downs: { speed_mps: number; distance_m: number; mass_kg: number }[];
  sigma_s: number;
  prior_relative_sd: number;
  budget: number;
}
export const getTestPlan = (input: TestPlanRequest) =>
  request("/v1/analysis/test-plan", TestPlan, { method: "POST", body: JSON.stringify(input) });

export const EnergyAudit = z.object({
  thrust_work_j: z.number(),
  kinetic_energy_j: z.number(),
  losses_j: z.record(z.string(), z.number()),
  total_loss_j: z.number(),
  conversion_efficiency: z.number(),
  dominant_loss: z.string(),
  thrust_end_s: z.number(),
  kinetic_energy_at_thrust_end_j: z.number(),
  coast_phase_loss_j: z.number(),
  closure_error_j: z.number(),
  closure_fraction: z.number(),
});
export type EnergyAudit = z.infer<typeof EnergyAudit>;
export const getEnergyAudit = (race: RaceSimulationRequest) =>
  request("/v1/analysis/energy", EnergyAudit, {
    method: "POST",
    body: JSON.stringify({
      mass_kg: race.mass_kg,
      track_length_m: race.track_length_m,
      thrust: { t_s: race.thrust.t_s, force_n: race.thrust.force_n },
      cda_m2: race.cda_m2,
      crr: race.crr,
      rho_kg_m3: race.rho_kg_m3,
    }),
  });

const TimingImport = z.object({
  filename: z.string(),
  units: z.record(z.string(), z.string()),
  warnings: z.array(z.string()),
  rows: z.array(
    z.object({
      run_no: z.number(),
      lane: z.string(),
      time_s: z.number(),
      reaction_s: z.number().nullable(),
      mass_kg: z.number().nullable(),
      notes: z.string(),
    }),
  ),
});
export type TimingImport = z.infer<typeof TimingImport>;
export const previewTimingImport = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return request("/v1/data/import?kind=race_timing", TimingImport, { method: "POST", body });
};
const BayesSummary = z.object({
  median: z.number(),
  p05: z.number(),
  p95: z.number(),
  information_gain: z.number().nullable(),
});
const BayesianCalibration = z.object({
  summaries: z.record(z.string(), BayesSummary),
  effective_sample_size: z.number(),
  seed: z.number(),
  warnings: z.array(z.string()),
  held_out: z.array(
    z.object({
      measured_s: z.number(),
      median_s: z.number(),
      p05_s: z.number(),
      p95_s: z.number(),
      error_s: z.number(),
    }),
  ),
});
interface CalibrationRun {
  time_s: number;
  track_m: number;
  sigma_s: number;
  mass_kg: number;
}
export interface BayesianCalibrationRequest {
  points: CalibrationRun[];
  held_out: CalibrationRun[];
  thrust_t_s: number[];
  thrust_force_n: number[];
  cda_m2: number;
  crr: number;
  thrust_scale: number;
  log_sd: number;
  extra_noise_scale_s: number;
  offset_sd_s: number;
  rho_kg_m3: number;
  seed: number;
}
export const calibrateBayesian = (input: BayesianCalibrationRequest) =>
  request("/v1/calibrations/bayesian", BayesianCalibration, {
    method: "POST",
    body: JSON.stringify(input),
  });

const BeamMaterial = z.object({
  name: z.string(),
  youngs_modulus_gpa: z.number(),
  strength_mpa: z.number(),
  source: z.enum(["measured", "estimated"]),
  note: z.string(),
});
const BeamMaterials = z.object({
  materials: z.record(z.string(), BeamMaterial),
  rule_load_tests_kg: z.record(z.string(), z.number()),
});
export const getBeamMaterials = () => request("/v1/analysis/beam/materials", BeamMaterials);
const BeamResult = z.object({
  max_deflection_mm: z.number(),
  max_moment_nmm: z.number(),
  max_stress_mpa: z.number(),
  safety_factor: z.number(),
  material: z.string(),
  material_source: z.enum(["measured", "estimated"]),
  x_mm: z.array(z.number()),
  deflection_mm: z.array(z.number()),
});
export interface BeamRequest {
  length_m: number;
  section:
    | { kind: "rectangle"; width_m: number; depth_m: number }
    | { kind: "circle"; outer_m: number }
    | { kind: "tube"; outer_m: number; inner_m: number };
  material: string;
  supports: Record<string, "fixed" | "pinned">;
  point_loads_n: Record<string, number>;
}
export const solveBeam = (req: BeamRequest) =>
  request("/v1/analysis/beam", BeamResult, { method: "POST", body: JSON.stringify(req) });

const EstimateDays = z.object({
  optimistic: z.number(),
  likely: z.number(),
  pessimistic: z.number(),
});
export const PlanTask = z.object({
  id: z.string(),
  name: z.string(),
  days: EstimateDays,
  depends_on: z.array(z.string()),
  cost: EstimateDays.nullable(),
  owner: z.string(),
});
export type PlanTask = z.infer<typeof PlanTask>;
export const ProjectPlan = z.object({
  tasks: z.array(PlanTask),
  deadline_days: z.number().nullable(),
  budget: z.number().nullable(),
});
export type ProjectPlan = z.infer<typeof ProjectPlan>;
export const getProjectPlan = () => request("/v1/analysis/project/plan", ProjectPlan);
export const saveProjectPlan = (plan: ProjectPlan) =>
  request("/v1/analysis/project/plan", ProjectPlan, { method: "PUT", body: JSON.stringify(plan) });
const ProjectForecast = z.object({
  likely_days: z.number(),
  critical_path: z.array(z.string()),
  p50_days: z.number(),
  p80_days: z.number(),
  p95_days: z.number(),
  finish_probability: z.number().nullable(),
  criticality: z.record(z.string(), z.number()),
  cost_p50: z.number().nullable(),
  cost_p80: z.number().nullable(),
  budget_probability: z.number().nullable(),
  slack_days: z.record(z.string(), z.number()),
});
export const forecastProject = (plan: ProjectPlan) =>
  request("/v1/analysis/project/forecast", ProjectForecast, {
    method: "POST",
    body: JSON.stringify(plan),
  });

const OracleSensitivity = z.object({
  method: z.enum(["sobol", "morris"]),
  samples: z.number(),
  seed: z.number(),
  input_distribution: z.string(),
  target: z.string(),
  confidence_level: z.number(),
  observations: z.number(),
  provenance: z.enum(["synthetic", "mixed"]),
  rows: z.array(
    z.object({
      name: z.string(),
      first_order: z.number().optional(),
      total_order: z.number().optional(),
      first_order_ci95: z.number().optional(),
      total_order_ci95: z.number().optional(),
      mu_star: z.number().optional(),
      sigma: z.number().optional(),
      mu_star_ci95: z.number().optional(),
    }),
  ),
});
export type OracleSensitivity = z.infer<typeof OracleSensitivity>;
export const getOracleSensitivity = (method: "sobol" | "morris") =>
  request(`/v1/oracle/sensitivity?method=${method}`, OracleSensitivity);

const OracleStudy = z.object({
  design_id: z.string(),
  artifact_id: z.string(),
  checks: z.array(RuleCheck),
  failed_rules: z.number().int(),
  manual_rules: z.number().int(),
  warnings: z.array(z.string()),
  provenance: z.literal("estimated"),
});
export const buildOracleStudy = (input: { baseline: string; unit: number[] }) =>
  request("/v1/oracle/build-next", OracleStudy, { method: "POST", body: JSON.stringify(input) });
