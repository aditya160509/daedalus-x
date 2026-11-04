import { describe, expect, it } from "vitest";
import {
  elapsedSeconds,
  etaSeconds,
  parseResiduals,
  progressPercent,
  suggestRunId,
} from "./jobMath";
describe("job presentation", () => {
  it("suggests a valid unique bounded run id", () => {
    expect(suggestRunId("car", 20, "quick", ["car_20ms_quick_1"])).toBe("car_20ms_quick_2");
    expect(suggestRunId("Long-Name".repeat(20), 20.5, "final", [])).toMatch(/^[a-z0-9_]{3,64}$/);
  });
  it("reports only meaningful bounded solver progress", () => {
    expect(progressPercent(null, 1200)).toBeNull();
    expect(progressPercent(200, 1000)).toBe(20);
    expect(progressPercent(1500, 1000)).toBe(100);
    expect(elapsedSeconds(null, null)).toBeNull();
    expect(elapsedSeconds("2026-11-01T00:00:00Z", "2026-11-01T00:00:05Z")).toBe(5);
  });
});

describe("parseResiduals", () => {
  it("collects initial residuals per field", () => {
    const log = [
      "Time = 1",
      "smoothSolver:  Solving for Ux, Initial residual = 0.5, Final residual = 0.01, No Iterations 2",
      "GAMG:  Solving for p, Initial residual = 1, Final residual = 0.05, No Iterations 4",
      "Time = 2",
      "smoothSolver:  Solving for Ux, Initial residual = 0.25, Final residual = 0.01, No Iterations 2",
    ].join("\n");
    expect(parseResiduals(log)).toEqual({
      Ux: [
        [1, 0.5],
        [2, 0.25],
      ],
      p: [[1, 1]],
    });
  });
  it("gives an ETA only with enough progress", () => {
    expect(etaSeconds(100, 1)).toBeNull();
    expect(etaSeconds(100, 50)).toBe(100);
  });
});
