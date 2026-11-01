import { describe, expect, it } from "vitest";
import { newPresetId, parsePresets, sanitizePreset } from "./presets";

const valid = {
  id: "p1",
  name: "Baseline",
  massG: 55,
  cdaCm2: 15,
  crr: 0.02,
  thrustScale: 1,
  trackM: 20,
  rho: 1.204,
  model: "M2" as const,
};

describe("race presets", () => {
  it("accepts a valid preset and trims its name", () => {
    expect(sanitizePreset({ ...valid, name: "  Baseline  " })).toEqual(valid);
  });

  it("rejects missing, out-of-range and malformed fields", () => {
    expect(sanitizePreset(null)).toBeNull();
    expect(sanitizePreset({ ...valid, id: "" })).toBeNull();
    expect(sanitizePreset({ ...valid, name: "   " })).toBeNull();
    expect(sanitizePreset({ ...valid, name: "x".repeat(61) })).toBeNull();
    expect(sanitizePreset({ ...valid, massG: 0 })).toBeNull();
    expect(sanitizePreset({ ...valid, crr: Number.NaN })).toBeNull();
    expect(sanitizePreset({ ...valid, model: "M3" })).toBeNull();
  });

  it("drops corrupt entries and duplicate ids without throwing", () => {
    const parsed = parsePresets([valid, { ...valid, name: "duplicate" }, { nope: true }, 7]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Baseline");
    expect(parsePresets({})).toEqual([]);
  });

  it("generates unique ids", () => {
    expect(newPresetId()).not.toBe(newPresetId());
  });
});
