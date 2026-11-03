import { expect, it } from "vitest";
import { forceWaterfall } from "./forceWaterfall";

it("keeps negative contributions and zero crossings without normalising component totals", () => {
  const rows = forceWaterfall([
    { name: "body", pressure: 3, viscous: 1 },
    { name: "wing", pressure: -7, viscous: 1 },
    { name: "wheel", pressure: 3, viscous: 0 },
  ]);
  expect(rows.map((r) => [r.start, r.end])).toEqual([
    [0, 4],
    [4, -2],
    [-2, 1],
    [0, 1],
  ]);
  expect(rows[1].delta).toBe(-6);
  expect(rows.at(-1)?.delta).toBe(1);
});
