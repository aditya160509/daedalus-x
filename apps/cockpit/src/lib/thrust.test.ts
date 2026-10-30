import { describe, expect, it } from "vitest";
import { estimateThrust, impulse, parseThrustCsv, ThrustCsvError } from "./thrust";

describe("estimateThrust", () => {
  it("rises to peak, decays, ends at zero", () => {
    const tr = estimateThrust({ peakN: 20, riseS: 0.02, decayTauS: 0.06, burnS: 0.4 });
    expect(tr.t_s[0]).toBe(0);
    expect(tr.force_n[0]).toBe(0);
    expect(Math.max(...tr.force_n)).toBeCloseTo(20, 0);
    expect(tr.force_n.at(-1)).toBe(0);
    expect(tr.t_s.every((t, i) => i === 0 || t > tr.t_s[i - 1])).toBe(true);
  });
});

describe("impulse", () => {
  it("integrates a constant force exactly", () => {
    expect(impulse({ t_s: [0, 0.5, 1], force_n: [2, 2, 2] })).toBeCloseTo(2, 12);
  });
});

describe("parseThrustCsv", () => {
  it("parses with header", () => {
    expect(parseThrustCsv("time_s,force_n\n0,0\n0.1,5\n0.2,0\n")).toEqual({
      t_s: [0, 0.1, 0.2],
      force_n: [0, 5, 0],
    });
  });
  it("parses without header and with semicolons", () => {
    expect(parseThrustCsv("0;1\n1;2").force_n).toEqual([1, 2]);
  });
  it("rejects wrong units, bad rows, non-increasing time, negatives", () => {
    expect(() => parseThrustCsv("t (ms),F (N)\n0,1\n1,2")).toThrow(ThrustCsvError);
    expect(() => parseThrustCsv("0,1\nx,2")).toThrow(/Row 2/);
    expect(() => parseThrustCsv("0,1\n0,2")).toThrow(/not increasing/);
    expect(() => parseThrustCsv("0,1\n1,-2")).toThrow(/Negative/);
    expect(() => parseThrustCsv("")).toThrow(/empty/);
  });
});
