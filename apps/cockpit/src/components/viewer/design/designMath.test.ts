import { describe, expect, it } from "vitest";
import {
  dimensionLines,
  explodeOffset,
  matchCadPart,
  measure,
  nearestVertex,
  notWatertight,
} from "./designMath";

describe("design studio math", () => {
  it("moves a part away from the car centre and keeps the centre fixed", () => {
    const moved = explodeOffset([0.2, 0, 0], [0.1, 0, 0], 0.5);
    expect(moved[0]).toBeCloseTo(0.05);
    expect(moved[1]).toBe(0);
    expect(moved[2]).toBe(0);
    expect(explodeOffset([0.1, 0.02, 0], [0.1, 0.02, 0], 1)).toEqual([0, 0, 0]);
    expect(() => explodeOffset([1, 0, 0], [0, 0, 0], -1)).toThrow();
  });

  it("snaps a click to the nearest display vertex", () => {
    const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const snap = nearestVertex(vertices, [0.8, 0.1, 0]);
    expect(snap.index).toBe(1);
    expect(snap.point).toEqual([1, 0, 0]);
    expect(snap.distance).toBeCloseTo(Math.hypot(0.2, 0.1));
    expect(() => nearestVertex(new Float32Array(), [0, 0, 0])).toThrow();
  });

  it("reports distance and per-axis deltas", () => {
    expect(measure([0, 0, 0], [3, 4, 0])).toEqual({ distance: 5, dx: 3, dy: 4, dz: 0 });
  });

  it("places three dimension lines outside the bounding box", () => {
    const lines = dimensionLines([0, 0, 0], [0.2, 0.05, 0.08]);
    expect(lines.map((l) => l.key)).toEqual(["length", "width", "height"]);
    expect(lines[0].value).toBeCloseTo(0.2);
    expect(lines[1].value).toBeCloseTo(0.08);
    expect(lines[2].value).toBeCloseTo(0.05);
    expect(lines[0].start[2]).toBeGreaterThan(0.08);
  });

  it("matches duplicate CAD labels by bounding-box centre and detects non-watertight parts", () => {
    const parts = [
      {
        label: "axle",
        group: "wheels",
        volume_m3: 1,
        bbox_min_m: [0, 0, 0] as [number, number, number],
        bbox_max_m: [0.1, 0.1, 0.1] as [number, number, number],
      },
      {
        label: "axle",
        group: "wheels",
        volume_m3: 2,
        bbox_min_m: [1, 0, 0] as [number, number, number],
        bbox_max_m: [1.1, 0.1, 0.1] as [number, number, number],
      },
    ];
    expect(matchCadPart("axle", [1.04, 0.05, 0.05], parts)?.volume_m3).toBe(2);
    expect(matchCadPart("missing", [0, 0, 0], parts)).toBeNull();
    expect(notWatertight("axle", ["part 'axle' tessellation is not watertight"])).toBe(true);
    expect(notWatertight("axle", ["part 'body' tessellation is not watertight"])).toBe(false);
  });
});
