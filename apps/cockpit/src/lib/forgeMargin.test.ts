import { describe, expect, it } from "vitest";
import {
  headroomLabel,
  marginBand,
  normalisedHeadroom,
  orderRiskRows,
  type RiskOrder,
} from "./forgeMargin";

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

const rule = (
  ruleId: string,
  value: number,
  min: number | null,
  max: number | null,
  extra: { unit?: string; page?: number; name?: string } = {},
) => ({
  rule_id: ruleId,
  name: extra.name ?? ruleId,
  page: extra.page ?? 1,
  unit: extra.unit ?? "mm",
  ...check(value, min, max),
});

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

describe("margin band", () => {
  it("converts the declared sigma into the same span percentage", () => {
    const band = marginBand(rule("T1", 75, 65, 85), 2);
    expect(band).not.toBeNull();
    expect(band?.pct).toBeCloseTo(50);
    expect(band?.band_low_pct).toBeCloseTo(40);
    expect(band?.band_high_pct).toBeCloseTo(60);
    expect(band?.margin).toBe(10);
    expect(band?.unit).toBe("mm");
  });

  it("keeps a negative margin sign and its band", () => {
    const band = marginBand(rule("T2", 60, 65, 85), 2);
    expect(band?.pct).toBeCloseTo(-25);
    expect(band?.band_low_pct).toBeCloseTo(-35);
    expect(band?.band_high_pct).toBeCloseTo(-15);
  });

  it("refuses a band without a declared sigma or a two-sided span", () => {
    expect(marginBand(rule("T3", 75, 65, 85), null)).toBeNull();
    expect(marginBand(rule("T4", 75, 65, 85), 0)).toBeNull();
    expect(marginBand(rule("T5", 50, 50, null), 2)).toBeNull();
    expect(marginBand(rule("T6", 50, null, 50), 2)).toBeNull();
  });
});

describe("risk ordering", () => {
  const rows = [
    { id: "manual", expected_points_lost: null, pass_probability: 0.99 },
    { id: "weak", expected_points_lost: 12.5, pass_probability: 0.4 },
    { id: "cheap", expected_points_lost: 1.0, pass_probability: 0.2 },
    { id: "unscored", expected_points_lost: null, pass_probability: 0.7 },
  ];

  it("orders by expected points at risk and puts unquantified rows last", () => {
    const order = orderRiskRows(rows, "expected").map((row) => row.id);
    expect(order).toEqual(["weak", "cheap", "manual", "unscored"]);
  });

  it("orders by pass probability without losing unquantified rows", () => {
    const order = orderRiskRows(rows, "probability").map((row) => row.id);
    expect(order).toEqual(["cheap", "weak", "unscored", "manual"]);
  });

  it("preserves the API rulebook order on request", () => {
    const order = orderRiskRows(rows, "rulebook").map((row) => row.id);
    expect(order).toEqual(["manual", "weak", "cheap", "unscored"]);
  });

  it("is stable for equal expected points", () => {
    const tied = [
      { id: "a", expected_points_lost: 5, pass_probability: 0.9 },
      { id: "b", expected_points_lost: 5, pass_probability: 0.1 },
      { id: "c", expected_points_lost: 5, pass_probability: 0.1 },
    ];
    const order: RiskOrder = "expected";
    expect(orderRiskRows(tied, order).map((row) => row.id)).toEqual(["b", "c", "a"]);
  });
});
