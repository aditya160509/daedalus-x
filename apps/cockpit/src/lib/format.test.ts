import { describe, expect, it } from "vitest";
import { EMPTY, fmt, fmtCm2, fmtCount, fmtMs, fmtPct, fmtSec } from "./format";

describe("format", () => {
  it("returns the dash for missing and non-finite values", () => {
    expect(fmt(null)).toBe(EMPTY);
    expect(fmt(Number.NaN)).toBe(EMPTY);
    expect(fmtSec(Number.POSITIVE_INFINITY)).toBe(EMPTY);
    expect(fmtPct(null)).toBe(EMPTY);
  });

  it("keeps fixed digits and tabular-friendly output", () => {
    expect(fmt(1.23456, 3)).toBe("1.235");
    expect(fmt(7, 0)).toBe("7");
    expect(fmtSec(1.0851)).toBe("1.085");
  });

  it("converts seconds to milliseconds and m2 to cm2", () => {
    expect(fmtMs(0.01234, 1)).toBe("12.3");
    expect(fmtCm2(0.003012, 2)).toBe("30.12");
    expect(fmtPct(0.781, 0)).toBe("78");
  });

  it("groups large counts", () => {
    expect(fmtCount(12345)).toBe("12,345");
    expect(fmtCount(null)).toBe(EMPTY);
  });
});
