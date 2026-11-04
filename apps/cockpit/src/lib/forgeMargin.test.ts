import { describe, expect, it } from "vitest";
import { headroomLabel, normalisedHeadroom } from "./forgeMargin";

const check = (value: number | null, min: number | null, max: number | null) => {
  const margin =
    value != null && (min != null || max != null)
      ? Math.min(
          min != null ? value - min : Number.POSITIVE_INFINITY,
          max != null ? max - value : Number.POSITIVE_INFINITY,
        )
      : null;
  return { value, min, max, margin };
};

describe("normalised rule headroom", () => {
  it("uses the full two-sided allowed span as the denominator", () => {
    expect(normalisedHeadroom(check(75, 65, 85))).toBeCloseTo(50);
    expect(headroomLabel(check(65, 65, 85))).toBe("0.0% of allowed span");
  });

  it("keeps negative headroom negative when the design is outside the limit", () => {
    expect(normalisedHeadroom(check(60, 65, 85))).toBeCloseTo(-25);
    expect(headroomLabel(check(60, 65, 85))).toBe("-25.0% of allowed span");
  });

  it("does not invent a percentage for one-sided, zero-span or missing data", () => {
    expect(normalisedHeadroom(check(50, 50, null))).toBeNull();
    expect(normalisedHeadroom(check(50, null, 50))).toBeNull();
    expect(normalisedHeadroom(check(50, 50, 50))).toBeNull();
    expect(normalisedHeadroom(check(null, 1, 10))).toBeNull();
    expect(headroomLabel(check(50, 50, null))).toBe("not applicable");
  });
});
