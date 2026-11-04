import { describe, expect, it } from "vitest";
import {
  alignmentProblem,
  compareParts,
  deviationColor,
  deviationRender,
  signedDeviation,
  type TriangleMesh,
} from "./deviation";

/** A 100 mm square at height z, wound so its normal points +z. */
function plane(z: number, size = 0.05, label = "panel"): TriangleMesh {
  return {
    label,
    positions: new Float32Array([-size, -size, z, size, -size, z, size, size, z, -size, size, z]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}

describe("signedDeviation", () => {
  it("returns zero for identical geometry within the declared tolerance", () => {
    const part = signedDeviation(plane(0), plane(0));
    expect(part.sampled).toBe(4);
    for (const mm of part.deviationMm) expect(Math.abs(mm)).toBeLessThan(1e-6);
  });

  it("reports +5 mm when the revision sits above the reference along its normal", () => {
    const part = signedDeviation(plane(0), plane(0.005));
    for (const mm of part.deviationMm) expect(mm).toBeCloseTo(5, 6);
  });

  it("reports negative distance when material is removed", () => {
    const part = signedDeviation(plane(0), plane(-0.0075));
    for (const mm of part.deviationMm) expect(mm).toBeCloseTo(-7.5, 6);
  });

  it("maps a scaled revision to the expected millimetres", () => {
    const reference = plane(0.01, 0.05);
    const scaled = reference.positions.map((value, index) => (index % 3 === 2 ? value * 2 : value));
    const part = signedDeviation(reference, {
      ...reference,
      positions: new Float32Array(scaled),
    });
    for (const mm of part.deviationMm) expect(mm).toBeCloseTo(10, 6);
  });

  it("honours the sample cap without changing small fixtures", () => {
    const many: TriangleMesh = {
      label: "dense",
      positions: new Float32Array(3000),
      indices: null,
    };
    for (let i = 0; i < 1000; i++) {
      many.positions[i * 3] = (i % 10) * 0.001;
      many.positions[i * 3 + 1] = Math.floor(i / 10) * 0.001;
    }
    const part = signedDeviation(plane(0), many, 25);
    expect(part.sampled).toBeLessThanOrEqual(25);
  });
});

describe("compareParts", () => {
  it("lists unmatched components instead of silently dropping them", () => {
    const report = compareParts(
      [plane(0, 0.05, "body"), plane(0, 0.02, "wing")],
      [plane(0, 0.05, "body")],
    );
    expect(report.status).toBe("ok");
    expect(report.referenceOnly).toEqual(["wing"]);
    expect(report.candidateOnly).toEqual([]);
    expect(report.parts.map((p) => p.label)).toEqual(["body"]);
  });

  it("rejects parts whose frames are not aligned", () => {
    const shifted = plane(0);
    for (let i = 0; i < shifted.positions.length; i += 3) shifted.positions[i] += 0.05;
    const report = compareParts([plane(0)], [shifted]);
    expect(report.status).toBe("rejected");
    expect(report.reason).toContain("not in the same frame");
  });

  it("rejects entirely unmatched designs", () => {
    const report = compareParts([plane(0, 0.05, "body")], [plane(0, 0.05, "wing")]);
    expect(report.status).toBe("rejected");
    expect(report.reason).toContain("no named parts match");
  });

  it("produces bounded colour buffers and a mm range", () => {
    const report = compareParts([plane(0)], [plane(0.004)]);
    expect(report.status).toBe("ok");
    expect(report.rangeMm).toBeGreaterThanOrEqual(4);
    expect(report.maxAbsMm).toBeCloseTo(4, 6);
    const render = deviationRender(report);
    expect(render.positions.length).toBe(report.sampledVertices * 3);
    expect(render.colors.length).toBe(report.sampledVertices * 3);
    for (const channel of render.colors) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
  });
});

describe("alignmentProblem", () => {
  it("accepts an identical frame and rejects a large centre offset", () => {
    expect(alignmentProblem(plane(0), plane(0.005))).toBeNull();
    const shifted = plane(0);
    for (let i = 0; i < shifted.positions.length; i += 3) shifted.positions[i] += 0.05;
    expect(alignmentProblem(plane(0), shifted)).toContain("not in the same frame");
  });

  it("flags empty geometry", () => {
    expect(
      alignmentProblem({ label: "a", positions: new Float32Array(), indices: null }, plane(0)),
    ).toBe("reference geometry is empty");
  });
});

describe("deviationColor", () => {
  it("is neutral at zero and saturated at both ends", () => {
    const [r, g, b] = deviationColor(0, 10);
    expect(r).toBeCloseTo(0.62);
    expect(g).toBeCloseTo(0.64);
    expect(b).toBeCloseTo(0.68);
    const added = deviationColor(10, 10);
    expect(added[1]).toBeGreaterThan(0.8);
    const removed = deviationColor(-10, 10);
    expect(removed[0]).toBeGreaterThan(0.9);
  });
});
