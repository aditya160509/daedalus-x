import { describe, expect, it } from "vitest";
import { VizMeta } from "./api";

const ref = { offset: 0, length: 0, type: "f32" };
const mesh = {
  positions: ref,
  indices: { ...ref, type: "u32" },
  scalar: ref,
  scalar_name: "Cp",
  range: [0, 1],
};
const legacy = {
  version: 1,
  U_m_s: 20,
  car: { length_m: 0.2, width_m: 0.08, height_m: 0.05 },
  acceptance: "rejected",
  reasons: ["mesh quality"],
  iterations: 1500,
  bytes: 0,
  layers: {
    surface: mesh,
    wake: mesh,
    centreline: mesh,
    streamlines: { ...mesh, offsets: { ...ref, type: "u32" } },
  },
  provenance: "simulated",
  notes: [],
};

describe("flow export version compatibility", () => {
  it("reads a v1 export without invented optional diagnostics", () => {
    const parsed = VizMeta.parse(legacy);
    expect(parsed.version).toBe(1);
    expect(parsed.layers.oilflow).toBeUndefined();
    expect(parsed.acceptance).toBe("rejected");
  });
  it("preserves v2 scalar switches, plane offsets and missing-field status", () => {
    const parsed = VizMeta.parse({
      ...legacy,
      version: 2,
      diagnostics: { wall_shear: "unavailable", missing_patches: ["body"] },
      layers: {
        ...legacy.layers,
        wake: { ...mesh, scalars: { Cp0: ref } },
        xslices: { ...mesh, offsets: { ...ref, type: "u32" }, x_m: [0, 0.1] },
      },
    });
    expect(parsed.layers.wake.scalars?.Cp0).toEqual(ref);
    expect(parsed.layers.xslices?.x_m).toEqual([0, 0.1]);
    expect(parsed.diagnostics?.wall_shear).toBe("unavailable");
    expect(VizMeta.safeParse({ ...legacy, version: 3 }).success).toBe(false);
  });
});
