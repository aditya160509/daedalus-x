import { describe, expect, it } from "vitest";
import { CfdResult } from "./api";

const legacyResult = {
  succeeded: true,
  steps: [],
  cells: 1000,
  mesh_ok: true,
  mesh_failures: [],
  iterations: 1500,
  converged_by_residuals: false,
  cd: 0.6,
  cl: 0.1,
  cd_window_spread: 0.05,
  forces_n: {},
  force_sum_check: {},
  acceptance: "pending_review",
  reasons: [],
  host: {},
};

describe("CFD result compatibility", () => {
  it("reads old results without averaging fields", () => {
    expect(CfdResult.parse(legacyResult).acceptance_mode).toBeUndefined();
  });

  it("preserves averaging statistics and rejects invalid modes", () => {
    const result = {
      ...legacyResult,
      cd_mean: 0.6,
      cd_ci95: [0.597, 0.603],
      acceptance_mode: "averaged",
    };
    expect(CfdResult.parse(result).cd_ci95).toEqual([0.597, 0.603]);
    expect(CfdResult.safeParse({ ...result, acceptance_mode: "transient" }).success).toBe(false);
  });
});
