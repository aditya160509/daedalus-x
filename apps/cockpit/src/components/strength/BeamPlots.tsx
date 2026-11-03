"use client";

import { ToolboxComponent } from "echarts/components";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import type { BeamResult } from "@/lib/api";

echarts.use([ToolboxComponent]);

/** Solver nodal values, without visual displacement magnification or inferred CAD geometry. */
export function BeamPlots({ data }: { data: BeamResult }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const axis = {
      type: "value",
      ...chartAxis(t),
      min: 0,
      max: data.x_mm.at(-1),
      name: "position (mm)",
    };
    return {
      animation: false,
      tooltip: { ...chartTooltip(t), trigger: "axis", axisPointer: { type: "cross" } },
      axisPointer: { link: [{ xAxisIndex: "all" }] },
      toolbox: { feature: { saveAsImage: { type: "png", name: "beam-deflection-stress" } } },
      grid: [
        { left: 62, right: 26, top: 36, height: "31%" },
        { left: 62, right: 26, top: "59%", height: "30%" },
      ],
      xAxis: [
        { ...axis, gridIndex: 0 },
        { ...axis, gridIndex: 1 },
      ],
      yAxis: [
        { type: "value", ...chartAxis(t), gridIndex: 0, name: "deflection (mm)" },
        { type: "value", ...chartAxis(t), gridIndex: 1, name: "bending stress (MPa)", min: 0 },
      ],
      series: [
        {
          name: "Deflection (mm)",
          type: "line",
          showSymbol: false,
          data: data.x_mm.map((x, i) => [x, data.deflection_mm[i]]),
          lineStyle: { color: t.brand, width: 2 },
          itemStyle: { color: t.brand },
        },
        {
          name: "Bending stress (MPa)",
          type: "line",
          showSymbol: false,
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: data.x_mm.map((x, i) => [x, data.stress_mpa[i]]),
          lineStyle: { color: t.brand, width: 2 },
          itemStyle: { color: t.brand },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: t.risk, type: "dashed" },
            label: { formatter: "estimated strength", position: "insideEndTop", color: t.muted },
            data: [{ yAxis: data.strength_mpa }],
          },
        },
      ],
    };
  }, [data]);
  return (
    <figure className="min-w-0 rounded-lg border p-2">
      <div
        ref={host}
        className="h-96 w-full"
        role="img"
        aria-label="Beam deflection and absolute bending stress along the modelled span"
      />
      <figcaption className="px-2 pb-1 text-xs text-muted-foreground">
        Estimated Euler–Bernoulli beam response from the entered section and loads. Stress is the
        outer-fibre bending magnitude; the dashed line is handbook material strength. This omits
        joints, shear failure, print anisotropy and 3D stress concentrations. No physical load test
        or uncertainty interval has been supplied.
      </figcaption>
    </figure>
  );
}
