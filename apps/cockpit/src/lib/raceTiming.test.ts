import { describe, expect, it } from "vitest";
import type { RaceSimulation } from "./api";
import { speedTrap, timingCsv, timingJson, valueAt } from "./raceTiming";

const sim = (over: Partial<RaceSimulation> = {}): RaceSimulation => ({
  model: "M2",
  provenance: "predicted",
  input_provenance: ["estimated"],
  finished: true,
  time_s: 0.5,
  stop_reason: "finish line",
  peak_speed_m_s: 20,
  time_axis: { name: "time", unit: "s", values: [0, 0.25, 0.5, 1] },
  channels: [
    { name: "velocity", unit: "m/s", values: [0, 10, 20, 18] },
    { name: "thrust", unit: "N", values: [4, 4, 0, 0] },
    { name: "position", unit: "m", values: [0, 2, 8, 20] },
  ],
  ...over,
});

describe("speedTrap", () => {
  it("reads the peak from the trace and the finish speed at the finish time", () => {
    const trap = speedTrap(sim());
    expect(trap.peakMs).toBe(20);
    expect(trap.peakT).toBe(0.5);
    expect(trap.finishT).toBe(0.5);
    expect(trap.finishMs).toBe(20);
  });

  it("has no finish speed when the run did not finish", () => {
    const trap = speedTrap(sim({ finished: false, time_s: null, stop_reason: "stalled" }));
    expect(trap.finishMs).toBeNull();
    expect(trap.finishT).toBeNull();
  });
});

describe("valueAt", () => {
  it("interpolates linearly between samples and clamps at the ends", () => {
    expect(valueAt([0, 1], [0, 10], 0.25)).toBeCloseTo(2.5);
    expect(valueAt([0, 1], [0, 10], 5)).toBe(10);
  });
});

describe("timing export", () => {
  it("writes one CSV row per sample with a header", () => {
    const lines = timingCsv(sim()).trim().split("\n");
    expect(lines[0]).toBe("t_s,velocity_m_s,velocity_km_h,position_m,thrust_n");
    expect(lines).toHaveLength(5);
    expect(lines[3]).toBe("0.5,20,72,8,0");
  });

  it("writes JSON with the speed trap and every row", () => {
    const parsed = JSON.parse(timingJson(sim()));
    expect(parsed.model).toBe("M2");
    expect(parsed.speed_trap.peak_m_s).toBe(20);
    expect(parsed.rows).toHaveLength(4);
  });
});
