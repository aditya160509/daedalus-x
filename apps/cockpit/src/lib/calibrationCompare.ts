import type { CalibrationStudyDetail } from "@/lib/api";

export interface StudyComparisonRow {
  study_id: string;
  created_at: string;
  n_runs: number;
  n_held_out: number;
  effective_sample_size: number | null;
  mae_ms: number | null;
  rmse_ms: number | null;
  source_labels: string[];
  /** Canonical scored held-out inputs/targets, including row order and shared conditions. */
  held_signature: string;
  held_source_hash: string | null;
  /** Stored held-out inputs and results must have the same number of rows. */
  aligned: boolean;
  identity_known: boolean;
  comparability: string;
}

type HeldResult = CalibrationStudyDetail["results"]["held_out"][number];
type HeldInput = CalibrationStudyDetail["inputs"]["held_out"][number];

function heldMetrics(
  rows: CalibrationStudyDetail["results"]["held_out"],
): { mae: number; rmse: number } | null {
  if (!rows.length) return null;
  const errors = rows.map((row) => row.error_s);
  const mae = errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / errors.length);
  return { mae: mae * 1000, rmse: rmse * 1000 };
}

/**
 * The scored test set is the exact pair of stored held-out inputs and measured targets. Model
 * predictions are deliberately excluded: two models may legitimately predict different values on
 * the same test set. The signature includes row order, per-row conditions and the shared thrust /
 * density conditions, so swapping rows or changing one target cannot look identical.
 */
function scoredRows(
  inputs: HeldInput[],
  results: HeldResult[],
): Array<Record<string, number | string | null>> | null {
  if (inputs.length !== results.length) return null;
  if (!results.length) return null;
  return results.map((result, index) => {
    const input = inputs[index];
    return {
      row: index,
      measured_s: result.measured_s,
      input_time_s: input.time_s,
      track_m: input.track_m,
      sigma_s: input.sigma_s,
      mass_kg: input.mass_kg,
      reaction_s: input.reaction_s ?? null,
    };
  });
}

function heldSignature(detail: CalibrationStudyDetail): string {
  const rows = scoredRows(detail.inputs.held_out, detail.results.held_out);
  if (!rows) return `invalid:${detail.study.study_id}`;
  return JSON.stringify({
    schema: 2,
    timing: "measured car time in seconds; reaction stored separately and not subtracted",
    rows,
    thrust_t_s: detail.inputs.thrust_t_s,
    thrust_force_n: detail.inputs.thrust_force_n,
    rho_kg_m3: detail.inputs.rho_kg_m3,
  });
}

/** Only an explicit held-out role is used. File order is never treated as a role. */
function explicitHeldSourceHash(detail: CalibrationStudyDetail): string | null {
  const held = detail.sources.filter((source) => source.role === "held_out");
  return held.length === 1 ? held[0].content_sha256 : null;
}

/**
 * Compare only what the saved study actually scored. A study with no held-out rows is "not
 * evaluated"; studies whose scored rows differ are never joined into one trend. A source hash is
 * supplementary verification, not a substitute for matching the actual rows.
 */
export function comparisonRows(details: CalibrationStudyDetail[]): StudyComparisonRow[] {
  const rows = details.map((detail) => {
    const study = detail.study;
    const metrics = heldMetrics(detail.results.held_out);
    const aligned = detail.inputs.held_out.length === detail.results.held_out.length;
    return {
      study_id: study.study_id,
      created_at: study.created_at,
      n_runs: study.n_runs,
      n_held_out: study.n_held_out,
      effective_sample_size: detail.results.effective_sample_size ?? null,
      mae_ms: metrics?.mae ?? null,
      rmse_ms: metrics?.rmse ?? null,
      source_labels: study.source_labels,
      held_signature: heldSignature(detail),
      held_source_hash: explicitHeldSourceHash(detail),
      aligned,
      identity_known: false,
      comparability: "",
    };
  });
  const scored = rows.filter((row) => row.n_held_out > 0);
  const groups = new Set(scored.map((row) => row.held_signature));
  const sourceHashes = new Set(scored.map((row) => row.held_source_hash ?? ""));
  const allSourcesExplicit = scored.every((row) => row.held_source_hash != null);
  for (const row of rows) {
    row.identity_known = row.held_source_hash != null;
    if (row.n_held_out === 0) {
      row.comparability = "Not evaluated — no held-out rows";
    } else if (!row.aligned) {
      row.comparability = "Not comparable — stored held-out rows are misaligned";
    } else if (groups.size > 1) {
      row.comparability = "Not comparable — different scored held-out rows";
    } else if (!allSourcesExplicit) {
      row.comparability = "Same scored held-out rows; held-out source role/hash unavailable";
    } else if (sourceHashes.size > 1) {
      row.comparability = "Comparable scored rows; held-out source hash differs";
    } else {
      row.comparability = "Comparable held-out set (source hash verified)";
    }
  }
  return rows;
}
