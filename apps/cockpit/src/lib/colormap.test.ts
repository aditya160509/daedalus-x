import { describe, expect, it } from "vitest";
import { colorize, sample } from "./colormap";

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));

describe("colormap", () => {
  it("clamps and hits the end stops", () => {
    close(sample("coolwarm", -5), [0.23, 0.299, 0.754]);
    close(sample("coolwarm", 9), [0.706, 0.016, 0.15]);
    expect(sample("turbo", Number.NaN)).toEqual(sample("turbo", 0));
  });
  it("is neutral at the centre of the diverging map", () => {
    const [r, g, b] = sample("coolwarm", 0.5);
    expect(r).toBeCloseTo(g);
    expect(g).toBeCloseTo(b);
  });
  it("colorizes into interleaved RGB", () => {
    const c = colorize([0, 1], [0, 1], "turbo");
    expect(c.length).toBe(6);
    expect(Array.from(c.slice(3))).toEqual(sample("turbo", 1).map((v) => Math.fround(v)));
  });
});
