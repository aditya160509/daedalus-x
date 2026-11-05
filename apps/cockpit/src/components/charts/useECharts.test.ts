import { describe, expect, it } from "vitest";
import { withPngExport } from "./useECharts";

describe("shared PNG export", () => {
  it("adds PNG export and preserves chart-specific toolbox settings", () => {
    expect(withPngExport({}).toolbox?.feature?.saveAsImage).toEqual({ type: "png", pixelRatio: 2 });
    const option = { toolbox: { top: 12, feature: { saveAsImage: { name: "mesh-quality" } } } };
    expect(withPngExport(option).toolbox).toMatchObject({
      top: 12,
      feature: { saveAsImage: { name: "mesh-quality", type: "png" } },
    });
    expect(option.toolbox.feature.saveAsImage).toEqual({ name: "mesh-quality" });
  });
});
