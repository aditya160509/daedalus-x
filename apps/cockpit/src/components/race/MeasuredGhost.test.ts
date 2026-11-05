import { describe, expect, it } from "vitest";
import { parseMeasuredTrace } from "./MeasuredGhost";

describe("measured ghost trace", () => {
  it("accepts monotonically advancing measured traces with launch origin", () => {
    expect(parseMeasuredTrace("time_s,distance_m\n0,0\n0.1,0\n1.0,20", "lane A.csv")).toEqual({
      name: "lane A.csv",
      time: [0, 0.1, 1],
      position: [0, 0, 20],
    });
  });
  it("rejects reversed distance and incomplete fields", () => {
    expect(() => parseMeasuredTrace("time_s,distance_m\n0,0\n1,20\n2,19", "x")).toThrow();
    expect(() => parseMeasuredTrace("time_s,distance_m\n0,0\n1,", "x")).toThrow();
  });
});
