import { describe, expect, it } from "vitest";
import { defaultRunId, type RunSummary } from "./cfdRuns";

const run = (overrides: Partial<RunSummary>): RunSummary => ({
  run_id: "run",
  state: "succeeded",
  cd: 0.5,
  acceptance: "accepted",
  has_viz: true,
  ...overrides,
});

describe("defaultRunId", () => {
  it("picks the lowest-Cd accepted run with flow data", () => {
    const runs = [
      run({ run_id: "slow", cd: 0.6 }),
      run({ run_id: "fast", cd: 0.4 }),
      run({ run_id: "rejected", cd: 0.2, acceptance: "rejected" }),
    ];
    expect(defaultRunId(runs)).toBe("fast");
  });

  it("never picks a rejected run when no accepted run exists", () => {
    const runs = [
      run({ run_id: "rejected", cd: 0.2, acceptance: "rejected" }),
      run({ run_id: "pending", cd: 0.3, acceptance: "not_evaluated" }),
    ];
    expect(defaultRunId(runs)).toBe("pending");
  });

  it("previews the latest rejected run when nothing else is solved", () => {
    const runs = [
      run({ run_id: "older", cd: 0.2, acceptance: "rejected" }),
      run({ run_id: "latest", cd: 0.25, acceptance: "rejected" }),
    ];
    expect(defaultRunId(runs)).toBe("latest");
  });

  it("falls back to a solved run without a Cd rather than a running run", () => {
    const runs = [
      run({ run_id: "running", state: "running", cd: null, acceptance: null }),
      run({ run_id: "solved", cd: null, acceptance: null }),
    ];
    expect(defaultRunId(runs)).toBe("solved");
  });

  it("returns null when no solved run has flow data", () => {
    expect(defaultRunId([run({ has_viz: false })])).toBeNull();
    expect(defaultRunId([])).toBeNull();
  });
});
