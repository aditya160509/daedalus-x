import { describe, expect, it } from "vitest";
import { readF32, readU32 } from "./vizBinary";

describe("viz binary refs", () => {
  it("treats length as an element count while offset stays in bytes", () => {
    const buffer = new ArrayBuffer(16);
    new Float32Array(buffer, 0, 2).set([0.25, -1.5]);
    new Uint32Array(buffer, 8, 2).set([7, 42]);

    expect([...readF32(buffer, { offset: 0, length: 2, type: "f32" })]).toEqual([0.25, -1.5]);
    expect([...readU32(buffer, { offset: 8, length: 2, type: "u32" })]).toEqual([7, 42]);
  });

  it("returns every element, not a quarter of them", () => {
    const buffer = new ArrayBuffer(12);
    new Float32Array(buffer).set([1, 2, 3]);
    expect(readF32(buffer, { offset: 0, length: 3, type: "f32" })).toHaveLength(3);
  });
});
