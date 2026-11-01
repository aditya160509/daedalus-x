import { describe, expect, it } from "vitest";
import { contourBand, deltaRange, nearestDelta, packLines, sliceRange } from "./flowMath";
import type { FlowMesh } from "../../../lib/api";

const mesh = (x: number[], cp: number[]): FlowMesh => ({
  positions: new Float32Array(x.flatMap((v) => [v, 0, 0])),
  scalar: new Float32Array(cp),
  indices: new Uint32Array([0, 1, 2]),
  name: "Cp",
  range: [-1, 1],
});
describe("flow operations", () => {
  it("places scalar extrema and zero in the declared 16 contour bands", () => {
    expect(contourBand(-2, [-1, 1])).toBe(0);
    expect(contourBand(1, [-1, 1])).toBe(15);
    expect(contourBand(0, [-1, 1])).toBe(8);
    expect(() => contourBand(NaN, [-1, 1])).toThrow();
  });
  it("uses index counts rather than vertex offsets when scrubbing", () => {
    expect(sliceRange(new Uint32Array([0, 6, 15]), 1)).toEqual([6, 9]);
    expect(() => sliceRange(new Uint32Array([0, 6]), 1)).toThrow();
  });
  it("subtracts matching topology directly and maps changed meshes spatially", () => {
    const a = mesh([0, 1, 2], [1, 3, 5]);
    expect(Array.from(nearestDelta(a, mesh([0, 1, 2], [0, 1, 2])).scalar)).toEqual([1, 2, 3]);
    const mapped = nearestDelta(a, mesh([2.1, 0.1, 1.1], [2, 0, 1]));
    expect(mapped.mapped).toBe(true);
    expect(Array.from(mapped.scalar)).toEqual([1, 2, 3]);
    expect(mapped.rmsDistance).toBeCloseTo(0.1);
  });
  it("subsamples full seeds without bridging polylines", () => {
    const packed = packLines(
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
        offsets: new Uint32Array([0, 2, 4]),
        scalar: new Float32Array([1, 1, 1, 1]),
        range: [0, 1],
        name: "speed",
      },
      0.5,
    );
    expect(Array.from(packed.positions)).toEqual([0, 1, 0, 1, 1, 0]);
    expect(Array.from(packed.arcs)).toEqual([0, 1]);
  });
  it("scales the delta map to the p99 magnitude and keeps it symmetric", () => {
    expect(deltaRange(new Float32Array([-3, 0, 1, 2]))).toEqual([-2, 2]);
    const skewed = new Float32Array([...Array(100).fill(0.1), 50]);
    const [lo, hi] = deltaRange(skewed);
    expect(lo).toBeCloseTo(-0.1);
    expect(hi).toBeCloseTo(0.1);
    expect(() => deltaRange(new Float32Array())).toThrow();
  });
  it("matches the KD-tree delta mapper against brute force on scattered points", () => {
    const points = Array.from({ length: 40 }, (_, i) => [
      Math.sin(i * 1.7) * 0.3,
      Math.cos(i * 2.3) * 0.2,
      Math.sin(i * 0.9) * 0.1,
    ]);
    const a: FlowMesh = {
      positions: new Float32Array(points.flat()),
      scalar: new Float32Array(points.map((_, i) => i)),
      indices: new Uint32Array(),
      name: "Cp",
      range: [0, 39],
    };
    const b: FlowMesh = {
      positions: new Float32Array(points.slice().reverse().flat()),
      scalar: new Float32Array(points.map((_, i) => 39 - i)),
      indices: new Uint32Array(),
      name: "Cp",
      range: [0, 39],
    };
    const result = nearestDelta(a, b);
    expect(result.mapped).toBe(true);
    expect(Array.from(result.scalar)).toEqual(Array(40).fill(0));
  });
});
