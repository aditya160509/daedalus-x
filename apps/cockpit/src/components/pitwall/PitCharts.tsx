"use client";

import { GaugeChart, HeatmapChart, ScatterChart } from "echarts/charts";
import { VisualMapComponent } from "echarts/components";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/primitives";
import { useQuery } from "@tanstack/react-query";
import { getOraclePareto, type OracleState } from "@/lib/api";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";

echarts.use([HeatmapChart, ScatterChart, GaugeChart, VisualMapComponent]);

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

/** pymoo NSGA-II front: predicted CdA against GP uncertainty; hover shows the design. */
export function ParetoFront() {
  const q = useQuery({ queryKey: ["oracle-pareto"], queryFn: getOraclePareto, staleTime: 60_000 });
  const pts = q.data?.points ?? [];
  const robust = q.data?.robust_index ?? -1;
  const pick = pts[robust];
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 64, right: 24, top: 16, bottom: 40 },
      toolbox: { right: 8, feature: { saveAsImage: { type: "png", name: "pareto" } } },
      tooltip: {
        ...chartTooltip(t),
        trigger: "item",
        formatter: (p: { dataIndex: number }) => {
          const d = pts[p.dataIndex];
          return [
            `CdA ${(d.cda_m2 * 1e4).toFixed(3)} cm² ± ${(d.cda_sd_m2 * 1e4).toFixed(3)}`,
            `Race P50 ${d.race_p50_s.toFixed(3)} s · P90 ${d.race_p90_s.toFixed(3)} s`,
            ...Object.entries(d.params).map(([k, v]) => `${k}: ${v.toFixed(2)}`),
          ].join("<br/>");
        },
      },
      xAxis: {
        type: "value",
        name: "Predicted CdA (cm²)",
        nameLocation: "middle",
        nameGap: 26,
        scale: true,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      yAxis: {
        type: "value",
        name: "± 1σ (cm²)",
        scale: true,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
      },
      series: [
        {
          type: "line",
          step: "end",
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { color: t.lineStrong, width: 1 },
          itemStyle: { color: t.brand },
          data: pts.map((d, i) => ({
            value: [d.cda_m2 * 1e4, d.cda_sd_m2 * 1e4],
            symbolSize: i === robust ? 14 : 7,
            itemStyle:
              i === robust ? { color: t.ok, borderColor: t.text, borderWidth: 1 } : undefined,
          })),
        },
      ],
    };
  }, [pts, robust]);
  if (q.error) return <p className="p-4 text-sm text-destructive">{q.error.message}</p>;
  return (
    <div className="flex h-full flex-col gap-2">
      {pick && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-lg border border-border px-3 py-2 text-xs">
          <span className="text-ok">Robust pick (best P90 race time)</span>
          <span className="tabular font-mono">
            P50 {pick.race_p50_s.toFixed(3)} s · P90 {pick.race_p90_s.toFixed(3)} s
          </span>
          <span className="tabular font-mono text-muted-foreground">
            {Object.entries(pick.params)
              .map(([k, v]) => `${k} ${v.toFixed(1)}`)
              .join(" · ")}
          </span>
        </div>
      )}
      <div ref={host} className="min-h-80 w-full flex-1" />
      <p className="text-[11px] text-text-3">
        P90 = the time you beat 9 runs in 10, with cartridge ±3%, rolling ±0.002 and mass ±0.5 g
        (assumed until calibrated) plus the model&apos;s own drag uncertainty.
      </p>
    </div>
  );
}
