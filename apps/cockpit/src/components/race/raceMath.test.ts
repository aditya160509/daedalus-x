import { describe, expect, it } from "vitest";
import {
  carForwardYaw,
  clampedSampleAt,
  deltaReading,
  deltaTimeCurve,
  finishGap,
  ghostCdaFromArea,
  nearestIndex,
  sampleAt,
  stepCursor,
  timeAtDistance,
  miniSectorTimes,
} from "./raceMath";

const times = [0, 1, 2, 3];
const values = [0, 10, 20, 30];

describe("race cursor maths", () => {
  it("interpolates between samples and refuses points outside the run", () => {
    expect(sampleAt(1.5, times, values)).toBe(15);
    expect(sampleAt(2, times, values)).toBe(20);
    expect(sampleAt(-0.01, times, values)).toBeNull();
    expect(sampleAt(3.01, times, values)).toBeNull();
    expect(sampleAt(1, times, [0, 10, 20])).toBeNull();
    expect(sampleAt(1.5, times, [0, Number.NaN, 20, 30])).toBeNull();
  });

  it("snaps to the nearest sample and clamps keyboard steps", () => {
    expect(nearestIndex(1.4, times)).toBe(1);
    expect(nearestIndex(1.6, times)).toBe(2);
    expect(nearestIndex(-5, times)).toBe(0);
    expect(nearestIndex(99, times)).toBe(3);
    expect(stepCursor(2, 1, 4)).toBe(3);
    expect(stepCursor(2, 10, 4)).toBe(3);
    expect(stepCursor(2, -10, 4)).toBe(0);
    expect(stepCursor(0, 1, 0)).toBe(-1);
  });

  it("reports the delta cursor pair with Δt and Δvalue", () => {
    const reading = deltaReading(1, 2.5, times, values);
    expect(reading.dt).toBe(1.5);
    expect(reading.a).toBe(10);
    expect(reading.b).toBe(25);
    expect(reading.delta).toBe(15);
    expect(deltaReading(0.5, 9, times, values).delta).toBeNull();
  });

  it("inverts the distance trace and builds the ghost Δt(x) curve", () => {
    expect(timeAtDistance(5, times, [0, 10, 20, 30])).toBeCloseTo(0.5);
    expect(timeAtDistance(0, times, [0, 10, 20, 30])).toBe(0);
    expect(timeAtDistance(31, times, [0, 10, 20, 30])).toBeNull();
    expect(timeAtDistance(1, times, [0, 0, 20, 30])).toBeCloseTo(1.05);

    const primary = { time: times, position: [0, 10, 20, 30] };
    const ghost = { time: [0.2, 1.2, 2.2, 3.2], position: [0, 10, 20, 30] };
    const curve = deltaTimeCurve(primary, ghost, 4);
    expect(curve).toHaveLength(4);
    expect(curve[0].x).toBe(0);
    expect(curve[3].x).toBe(30);
    for (const point of curve) expect(point.dt).toBeCloseTo(0.2);
  });

  it("signs the finish gap from the ghost's point of view", () => {
    expect(finishGap(2, 2.05)).toBeCloseTo(0.05);
    expect(finishGap(2.05, 2)).toBeCloseTo(-0.05);
    expect(finishGap(2, null)).toBeNull();
  });

  it("clamps replay position to the ends of the run", () => {
    expect(clampedSampleAt(-1, times, [0, 10, 20, 30])).toBe(0);
    expect(clampedSampleAt(9, times, [0, 10, 20, 30])).toBe(30);
    expect(clampedSampleAt(1.5, times, [0, 10, 20, 30])).toBe(15);
    expect(clampedSampleAt(1, times, [])).toBeNull();
  });

  it("turns a nose-first-at-low-x model to face +X", () => {
    const noseLow = [
      { label: "Front_Wing", centroid: [0.01, 0, 0] as const },
      { label: "Rear_Wing", centroid: [0.19, 0, 0] as const },
    ];
    const noseHigh = [
      { label: "Front_Wing", centroid: [0.19, 0, 0] as const },
      { label: "Rear_Wing", centroid: [0.01, 0, 0] as const },
    ];
    expect(carForwardYaw(noseLow)).toBeCloseTo(Math.PI);
    expect(carForwardYaw(noseHigh)).toBe(0);
    expect(carForwardYaw([{ label: "Main_Body", centroid: [0.1, 0, 0] as const }])).toBe(0);
  });

  it("scales a ghost CdA by frontal area and rejects degenerate areas", () => {
    expect(ghostCdaFromArea(0.0015, 0.01, 0.02)).toBeCloseTo(0.003);
    expect(() => ghostCdaFromArea(0.0015, 0, 0.02)).toThrow(/positive/);
    expect(() => ghostCdaFromArea(-1, 0.01, 0.02)).toThrow(/non-negative/);
  });
});

describe("miniSectorTimes", () => {
  it("splits a constant-speed run into equal sectors", () => {
    const trace = { time: [0, 1, 2], position: [0, 10, 20] };
    const s = miniSectorTimes(trace, 20, 4);
    expect(s.map((v) => v?.toFixed(3))).toEqual(["0.500", "0.500", "0.500", "0.500"]);
  });
  it("is null past the end of a short run", () => {
    expect(miniSectorTimes({ time: [0, 1], position: [0, 10] }, 20, 2)).toEqual([1, null]);
  });
});
