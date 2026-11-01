"use client";

import { GaugeChart, HeatmapChart, ScatterChart } from "echarts/charts";
import { VisualMapComponent } from "echarts/components";
import type { OracleState } from "@/lib/api";
import { chartTheme, echarts, useECharts } from "@/components/charts/useECharts";

echarts.use([HeatmapChart, ScatterChart, GaugeChart, VisualMapComponent]);

const cm2 = (v: number) => (v * 1e4).toFixed(2); // m² → cm²

/** Aero map: GP-predicted CdA over the first two variables, tested runs and the next-best star. */
export function AeroMap({ s }: { s: OracleState }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const [vx, vy] = s.variables;
    const n = s.aero_map.axis.length;
    const flat = s.aero_map.cda_m2.flatMap((row, i) => row.map((v, j) => [i, j, v * 1e4]));
    const vals = flat.map((d) => d[2]);
    const toIdx = (u: number) => u * (n - 1);
    const lbl = (v: { low: number; high: number }, i: number) =>
      (v.low + (i / (n - 1)) * (v.high - v.low)).toFixed(1);
    return {
      animation: false,
      textStyle: { fontFamily: t.mono, color: t.muted },
      grid: { left: 44, right: 70, top: 10, bottom: 36 },
      tooltip: { formatter: (p: { value: number[] }) => `CdA ${p.value[2].toFixed(2)} cm²` },
      xAxis: {
        type: "category",
        data: s.aero_map.axis.map((_, i) => lbl(vx, i)),
        name: `${vx.name} ${vx.unit}`,
        nameLocation: "middle",
        nameGap: 24,
        axisLabel: { interval: 6, fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: s.aero_map.axis.map((_, i) => lbl(vy, i)),
        axisLabel: { interval: 6, fontSize: 10 },
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
  }, [s]);
  return <div ref={host} className="size-full min-h-56" />;
}

/** Best CdA found vs runs used: ORACLE against Latin hypercube on the same budget. */
export function BenchmarkChart({ s }: { s: OracleState }) {
  const host = useECharts(() => {
    const t = chartTheme();
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
      tooltip: { trigger: "axis", valueFormatter: (v: number) => `${v.toFixed(3)} cm²` },
      xAxis: {
        type: "category",
        data: x,
        axisLabel: { fontSize: 10 },
        name: "runs",
        nameLocation: "middle",
        nameGap: 18,
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { fontSize: 10, formatter: (v: number) => v.toFixed(2) },
        splitLine: { lineStyle: { color: t.line } },
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
  return <div ref={host} className="size-full min-h-40" />;
}

/** Car score 0–100: where the best tested CdA sits inside the aero map's range (100 = map minimum). */
export function ScoreGauge({ s }: { s: OracleState }) {
  const flat = s.aero_map.cda_m2.flat();
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  const score = Math.round(100 * Math.min(1, Math.max(0, (hi - s.best.cda_m2) / (hi - lo || 1))));
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: true,
      series: [
        {
          type: "gauge",
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 100,
          radius: "95%",
          progress: { show: true, width: 10, itemStyle: { color: t.brand } },
          axisLine: { lineStyle: { width: 10, color: [[1, t.line]] } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, "5%"],
            fontSize: 34,
            fontFamily: t.mono,
            color: t.text,
            formatter: "{value}",
          },
          title: { offsetCenter: [0, "45%"], fontSize: 11, color: t.muted },
          data: [{ value: score, name: "Aero score" }],
        },
      ],
    };
  }, [score]);
  return <div ref={host} className="size-full min-h-36" />;
}

export { cm2 };
