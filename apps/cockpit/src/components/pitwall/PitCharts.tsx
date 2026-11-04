"use client";

import { GaugeChart, HeatmapChart, ScatterChart } from "echarts/charts";
import { VisualMapComponent } from "echarts/components";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/primitives";
import type { OracleState } from "@/lib/api";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";

echarts.use([HeatmapChart, ScatterChart, GaugeChart, VisualMapComponent]);

const cm2 = (v: number) => (v * 1e4).toFixed(2); // m² → cm²

/** Aero map: GP-predicted CdA over the first two variables, tested runs and the next-best star. */
export function AeroMap({ s }: { s: OracleState }) {
  const [metric, setMetric] = useState<"mean" | "sd">("mean");
  const values = metric === "sd" && s.aero_map.cda_sd_m2 ? s.aero_map.cda_sd_m2 : s.aero_map.cda_m2;
  const host = useECharts(() => {
    const t = chartTheme();
    const [vx, vy] = s.variables;
    const n = s.aero_map.axis.length;
    const flat = values.flatMap((row, i) => row.map((v, j) => [i, j, v * 1e4]));
    const vals = flat.map((d) => d[2]);
    const toIdx = (u: number) => u * (n - 1);
    const lbl = (v: { low: number; high: number }, i: number) =>
      (v.low + (i / (n - 1)) * (v.high - v.low)).toFixed(1);
    return {
      animation: false,
      textStyle: { fontFamily: t.mono, color: t.muted },
      grid: { left: 44, right: 70, top: 28, bottom: 36 },
      toolbox: {
        right: 0,
        top: 0,
        feature: { saveAsImage: { type: "png", name: "oracle-aero-map", pixelRatio: 2 } },
      },
      tooltip: {
        ...chartTooltip(t),
        formatter: (p: { value: number[]; seriesIndex: number }) =>
          p.seriesIndex === 0
            ? `${metric === "sd" ? "Posterior SD" : "Mean CdA"} ${p.value[2].toFixed(2)} cm²`
            : p.seriesIndex === 1
              ? "Stored observation projected onto this slice"
              : "Next proposed design",
      },
      xAxis: {
        type: "category",
        ...chartAxis(t),
        data: s.aero_map.axis.map((_, i) => lbl(vx, i)),
        name: `${vx.name} ${vx.unit}`,
        nameLocation: "middle",
        nameGap: 24,
        splitLine: { show: false },
        axisLabel: { color: t.muted, interval: 6, fontSize: 10 },
      },
      yAxis: {
        type: "category",
        ...chartAxis(t),
        data: s.aero_map.axis.map((_, i) => lbl(vy, i)),
        splitLine: { show: false },
        axisLabel: { color: t.muted, interval: 6, fontSize: 10 },
      },
      visualMap: {
        min: Math.min(...vals),
        max: Math.max(...vals),
        right: 0,
        top: "center",
        itemHeight: 120,
        calculable: false,
        text: ["cm²", ""],
        textStyle: { color: t.muted, fontSize: 10 },
        inRange: { color: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"] },
        seriesIndex: 0,
      },
      series: [
        { type: "heatmap", data: flat, progressive: 0 },
        {
          type: "scatter",
          symbolSize: 7,
          itemStyle: { color: "#fff", borderColor: "#000" },
          data: s.observations.map((o) => [toIdx(o.unit[0]), toIdx(o.unit[1])]),
          coordinateSystem: "cartesian2d",
          xAxisIndex: 0,
          yAxisIndex: 0,
        },
        {
          type: "scatter",
          symbol: "path://M50 0L61 35H98L68 57L79 92L50 70L21 92L32 57L2 35H39Z",
          symbolSize: 18,
          itemStyle: { color: t.brand },
          data: [[toIdx(s.next.unit[0]), toIdx(s.next.unit[1])]],
        },
      ],
    };
  }, [s, values, metric]);
  return (
    <div className="flex h-full min-h-80 flex-col gap-2">
      {s.aero_map.cda_sd_m2 && (
        <SegmentedControl
          label="GP map field"
          options={[
            { value: "mean", label: "Mean CdA" },
            { value: "sd", label: "Posterior SD" },
          ]}
          value={metric}
          onChange={setMetric}
        />
      )}
      <div
        ref={host}
        className="min-h-56 flex-1"
        role="img"
        aria-label={`${metric === "sd" ? "GP posterior standard deviation" : "Predicted drag area"} over the first two variables`}
      />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Fitted GP map from {s.observations.length} stored observations ({s.provenance}). Other
        variables are fixed at the best observation. Markers project observations onto this slice;
        the star is the model's next proposal. Posterior SD is model uncertainty, not measured CFD
        error, and the map does not establish an accepted drag value.
      </p>
    </div>
  );
}

/** Best CdA found vs runs used: ORACLE against Latin hypercube on the same budget. */
export function BenchmarkChart({ s }: { s: OracleState }) {
  const host = useECharts(() => {
    const t = chartTheme();
    if (!s.benchmark) return {};
    const x = s.benchmark.gp.map((_, i) => i + 1);
    return {
      animation: false,
      textStyle: { fontFamily: t.mono, color: t.muted },
      grid: { left: 44, right: 12, top: 24, bottom: 28 },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: t.text2, fontSize: 10 },
        itemWidth: 12,
        itemHeight: 4,
      },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: number) => `${v.toFixed(3)} cm²`,
      },
      xAxis: {
        type: "category",
        ...chartAxis(t),
        data: x,
        splitLine: { show: false },
        axisLabel: { color: t.muted, fontSize: 10 },
        name: "runs",
        nameLocation: "middle",
        nameGap: 18,
      },
      yAxis: {
        type: "value",
        ...chartAxis(t),
        scale: true,
        axisLabel: {
          color: t.muted,
          fontSize: 10,
          formatter: (v: number) => v.toFixed(2),
        },
      },
      series: [
        {
          name: "ORACLE",
          type: "line",
          step: "end",
          showSymbol: false,
          lineStyle: { width: 2, color: t.brand },
          data: s.benchmark.gp.map((v) => v * 1e4),
        },
        {
          name: "Random (LHS)",
          type: "line",
          step: "end",
          showSymbol: false,
          lineStyle: { width: 1.5, color: t.muted, type: "dashed" },
          data: s.benchmark.lhs.map((v) => v * 1e4),
        },
      ],
    };
  }, [s]);
  return (
    <div
      ref={s.benchmark ? host : undefined}
      className="size-full min-h-40"
      role="img"
      aria-label="Best drag area found by the optimiser versus random search at the same budget"
    >
      {!s.benchmark && (
        <p className="p-4 text-xs text-muted-foreground">
          No completed registered benchmark. Open Pit Wall → ORACLE → Benchmark to register an
          equal-budget synthetic study.
        </p>
      )}
    </div>
  );
}

/** Car score 0–100: where the best tested CdA sits inside the aero map's range (100 = map minimum). */
export { cm2 };
