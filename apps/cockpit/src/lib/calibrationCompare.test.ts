import { describe, expect, it } from "vitest";
import { comparisonRows } from "./calibrationCompare";
import type { CalibrationStudyDetail } from "@/lib/api";

function detail(
  id: string,
  held: Array<{ measured_s: number; median_s: number; error_s: number }>,
  options: { hash?: string; track?: number } = {},
): CalibrationStudyDetail {
  return {
    study: {
      study_id: id,
      created_at: "2026-11-04T00:00:00Z",
      method: "bayesian",
      model_id: "model",
      n_runs: 3,
      n_held_out: held.length,
      source_labels: ["training.csv", "held.csv"],
      medians: null,
    },
    inputs: {
      points: [],
      held_out: held.map((row) => ({
        time_s: row.measured_s,
        track_m: options.track ?? 20,
        sigma_s: 0.005,
        mass_kg: 0.05,
      })),
      thrust_t_s: [0, 1],
      thrust_force_n: [1, 0],
      cda_m2: 0.002,
      crr: 0.01,
      thrust_scale: 1,
      log_sd: 0.3,
      extra_noise_scale_s: 0.01,
      offset_sd_s: 0.02,
      rho_kg_m3: 1.2,
      seed: 0,
    },
    results: {
      held_out: held.map((row) => ({
        measured_s: row.measured_s,
        median_s: row.median_s,
        p05_s: row.median_s - 0.01,
        p95_s: row.median_s + 0.01,
        error_s: row.error_s,
      })),
      effective_sample_size: 512,
    },
    sources: options.hash
      ? [
          {
            artifact_id: "a",
            label: "training.csv",
            content_sha256: "train",
            size_bytes: 1,
          },
          {
            artifact_id: "b",
            label: "held.csv",
            content_sha256: options.hash,
            size_bytes: 1,
          },
        ]
      : [],
  };
}

describe("saved-study comparison", () => {
  it("derives MAE and RMSE only from scored held-out rows", () => {
    const rows = comparisonRows([
      detail("a", [
        { measured_s: 1.5, median_s: 1.51, error_s: 0.01 },
        { measured_s: 1.6, median_s: 1.57, error_s: -0.03 },
      ]),
    ]);
    expect(rows[0].mae_ms).toBeCloseTo(20);
    expect(rows[0].rmse_ms).toBeCloseTo(Math.sqrt((100 + 900) / 2));
    expect(rows[0].effective_sample_size).toBe(512);
  });

  it("keeps missing held-out data as not evaluated, never a zero error", () => {
    const rows = comparisonRows([detail("a", [])]);
    expect(rows[0].mae_ms).toBeNull();
    expect(rows[0].rmse_ms).toBeNull();
    expect(rows[0].comparability).toContain("Not evaluated");
  });

  it("marks different held-out signatures as non-comparable", () => {
    const rows = comparisonRows([
      detail("a", [{ measured_s: 1.5, median_s: 1.51, error_s: 0.01 }], { hash: "h1" }),
      detail("b", [{ measured_s: 1.5, median_s: 1.51, error_s: 0.01 }], { hash: "h2" }),
    ]);
    expect(rows.every((row) => row.comparability.includes("Not comparable"))).toBe(true);
  });

  it("names a shared scored set even when the source hash is unavailable", () => {
    const rows = comparisonRows([
      detail("a", [{ measured_s: 1.5, median_s: 1.51, error_s: 0.01 }]),
      detail("b", [{ measured_s: 1.5, median_s: 1.51, error_s: 0.01 }]),
    ]);
    expect(rows[0].comparability).toContain("source-file hash unavailable");
  });
});
