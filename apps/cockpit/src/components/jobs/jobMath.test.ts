import { describe, expect, it } from "vitest";
import { elapsedSeconds, progressPercent, suggestRunId } from "./jobMath";
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
