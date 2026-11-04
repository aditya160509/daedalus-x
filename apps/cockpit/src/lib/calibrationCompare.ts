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
  /** Identity is only claimed from the stored held-out rows plus an uploaded-file hash. */
  held_signature: string;
  identity_known: boolean;
  comparability: string;
}

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
 * Compare only what the saved study actually scored. A study with no held-out rows is "not
 * evaluated"; studies whose held-out signature differs are never joined into one trend.
 */
export function comparisonRows(details: CalibrationStudyDetail[]): StudyComparisonRow[] {
  const rows = details.map((detail) => {
    const study = detail.study;
    const held = detail.results.held_out;
    const metrics = heldMetrics(held);
    const tracks = [...new Set(detail.inputs.held_out.map((row) => row.track_m))].toSorted(
      (a, b) => a - b,
    );
    const masses = [...new Set(detail.inputs.held_out.map((row) => row.mass_kg))].toSorted(
      (a, b) => a - b,
    );
    const heldHash = study.n_held_out > 0 ? (detail.sources[1]?.content_sha256 ?? null) : null;
    const signature =
      study.n_held_out === 0
        ? "none"
        : JSON.stringify({
            n: study.n_held_out,
            tracks,
            masses,
            hash: heldHash ?? "no-source-hash",
          });
    return {
      study_id: study.study_id,
      created_at: study.created_at,
      n_runs: study.n_runs,
      n_held_out: study.n_held_out,
      effective_sample_size: detail.results.effective_sample_size ?? null,
      mae_ms: metrics?.mae ?? null,
      rmse_ms: metrics?.rmse ?? null,
      source_labels: study.source_labels,
      held_signature: signature,
      identity_known: heldHash != null,
      comparability: "",
    };
  });
  const scored = rows.filter((row) => row.n_held_out > 0);
  const groups = new Set(scored.map((row) => row.held_signature));
  for (const row of rows) {
    if (row.n_held_out === 0) {
      row.comparability = "Not evaluated — no held-out rows";
    } else if (groups.size > 1) {
      row.comparability = "Not comparable — different held-out set";
    } else if (!row.identity_known) {
      row.comparability = "Same row signature; source-file hash unavailable";
    } else {
      row.comparability = "Comparable held-out set";
    }
  }
  return rows;
}
