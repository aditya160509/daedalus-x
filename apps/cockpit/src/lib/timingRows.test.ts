import { describe, expect, it } from "vitest";
import { isOutlierRow, outlierRowIndices } from "./timingRows";

describe("timing outlier row mapping", () => {
  it("treats API indices as zero-based row positions, not run numbers", () => {
    // Run numbers are 10, 20, 30; position 1 is the second row and the flagged one.
    expect(outlierRowIndices(3, [1])).toEqual([1]);
    expect(isOutlierRow(3, [1], 0)).toBe(false);
    expect(isOutlierRow(3, [1], 1)).toBe(true);
    expect(isOutlierRow(3, [1], 2)).toBe(false);
  });

  it("drops out-of-range and duplicate indices instead of shifting a flag", () => {
    expect(outlierRowIndices(2, [-1, 0, 2, 0, 1.5])).toEqual([0]);
  });

  it("keeps every row in the preview even when all are flagged", () => {
    expect(outlierRowIndices(3, [0, 1, 2])).toHaveLength(3);
  });
});
