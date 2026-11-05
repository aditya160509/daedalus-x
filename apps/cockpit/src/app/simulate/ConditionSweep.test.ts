import { describe, expect, it } from "vitest";
import { parseConditionSweep } from "./ConditionSweep";

const header = "axis,value,cd,cd_low,cd_high\n";

describe("condition sweep import", () => {
  it("sorts each axis and preserves the reported intervals", () => {
    const parsed = parseConditionSweep(header + "yaw,4,0.3,0.28,0.31\nyaw,-4,0.27,0.26,0.28");
    expect(parsed.yaw.map((point) => point.value)).toEqual([-4, 4]);
    expect(parsed.yaw[1]).toMatchObject({ low: 0.28, high: 0.31 });
    expect(parsed.ride).toEqual([]);
  });
  it("rejects duplicate coordinates and inconsistent intervals", () => {
    expect(() => parseConditionSweep(header + "ride,2,0.3,0.2,0.4\nride,2,0.4,0.3,0.5")).toThrow();
    expect(() => parseConditionSweep(header + "ride,2,0.3,0.4,0.5\nride,3,0.4,0.3,0.5")).toThrow();
  });
});
