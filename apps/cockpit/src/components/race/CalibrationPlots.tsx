"use client";

import { ScatterChart } from "echarts/charts";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";

echarts.use([ScatterChart]);

export interface IntervalItem {
  key: string;
  label: string;
  unit: string;
  p05: number;
  median: number;
  p95: number;
}

function padding(low: number, high: number): number {
  const span = Math.abs(high - low);
  return span > 0 ? span * 0.08 : Math.max(Math.abs(low) * 0.05, 1e-6);
}

/** One posterior summary: a p05–p95 line with the returned median, never a fitted density. */
function IntervalRow({ item }: { item: IntervalItem }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const pad = padding(item.p05, item.p95);
    return {
      animation: false,
      grid: { left: 10, right: 10, top: 8, bottom: 24, containLabel: true },
      tooltip: {
        ...chartTooltip(t),
        formatter: () =>
          `${item.label}<br/>p05 ${item.p05.toFixed(3)} ${item.unit}<br/>median ${item.median.toFixed(3)} ${item.unit}<br/>p95 ${item.p95.toFixed(3)} ${item.unit}`,
      },
      xAxis: {
        type: "value",
        ...chartAxis(t),
        min: item.p05 - pad,
        max: item.p95 + pad,
        name: item.unit,
        nameLocation: "middle",
        nameGap: 18,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        splitLine: { show: false },
        axisLabel: { color: t.muted, fontSize: 9 },
      },
      yAxis: { type: "category", data: [""], show: false },
      series: [
        {
          type: "line",
          data: [
            [item.p05, 0],
            [item.p95, 0],
          ],
          symbol: "none",
          lineStyle: { width: 6, color: t.brand, opacity: 0.55 },
          silent: true,
        },
        {
          type: "scatter",
          data: [[item.median, 0]],
          symbolSize: 10,
          itemStyle: { color: t.text, borderColor: t.popover, borderWidth: 1 },
        },
      ],
    };
  }, [item]);
  return (
    <div className="rounded-lg border p-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span>{item.label}</span>
        <span className="tabular font-mono text-muted-foreground">
          {item.p05.toFixed(3)} → {item.p95.toFixed(3)} {item.unit}
        </span>
      </div>
      <div className="h-16">
        <div
          ref={host}
          className="h-full w-full"
          role="img"
          aria-label={`${item.label} 90 percent posterior interval from ${item.p05.toFixed(3)} to ${item.p95.toFixed(3)} ${item.unit}, median ${item.median.toFixed(3)}`}
        />
      </div>
    </div>
  );
}

/**
 * Actual returned posterior quantiles. Each parameter keeps its own axis because the units and
 * magnitudes differ; no density curve is inferred from three quantiles.
 */
export function PosteriorIntervals({ items }: { items: IntervalItem[] }) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground">No posterior summaries were returned.</p>;
  }
  return (
    <section aria-label="Posterior 90% intervals" className="space-y-2">
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <IntervalRow key={item.key} item={item} />
        ))}
      </div>
      <p className="text-2xs leading-relaxed text-muted-foreground">
        Returned 5th–95th posterior quantiles with their medians. Each panel has its own unit; these
        are not densities, fitted Normal curves or independent physical validation.
      </p>
    </section>
  );
}

export interface HeldOutRow {
  measured_s: number;
  median_s: number;
  p05_s: number;
  p95_s: number;
  error_s: number;
}

function heldCaption(rows: HeldOutRow[]): string {
  const covered = rows.filter((row) => row.p05_s <= row.measured_s && row.measured_s <= row.p95_s);
  return `${rows.length} supplied held-out run(s); ${covered.length} measured time(s) fall inside the returned 90% interval. These are held-out results on the supplied data, not independent physical verification.`;
}

/** Measured versus predicted median with the returned prediction interval and a y = x reference. */
export function HeldOutPlot({ rows, labels }: { rows: HeldOutRow[]; labels: string[] }) {
  const predictedHost = useECharts(() => {
    const t = chartTheme();
    const all = rows.flatMap((row) => [row.measured_s, row.p05_s, row.p95_s]);
    const pad = padding(Math.min(...all), Math.max(...all));
    const low = Math.min(...all) - pad;
    const high = Math.max(...all) + pad;
    return {
      animation: false,
      grid: { left: 56, right: 16, top: 16, bottom: 42 },
      toolbox: {
        right: 0,
        top: 0,
        feature: {
          saveAsImage: { type: "png", name: "held-out-measured-vs-predicted", pixelRatio: 2 },
        },
      },
      tooltip: {
        ...chartTooltip(t),
        formatter: (params: { dataIndex: number }) => {
          const row = rows[params.dataIndex];
          if (!row) return "";
          return `${labels[params.dataIndex] ?? `row ${params.dataIndex}`}<br/>measured ${row.measured_s.toFixed(4)} s<br/>predicted ${row.median_s.toFixed(4)} s<br/>90% ${row.p05_s.toFixed(4)}–${row.p95_s.toFixed(4)} s<br/>residual ${(row.error_s * 1000).toFixed(1)} ms`;
        },
      },
      xAxis: {
        type: "value",
        ...chartAxis(t),
        min: low,
        max: high,
        name: "measured time (s)",
        nameLocation: "middle",
        nameGap: 26,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        axisLabel: { color: t.muted, fontSize: 9, formatter: (v: number) => v.toFixed(3) },
      },
      yAxis: {
        type: "value",
        ...chartAxis(t),
        min: low,
        max: high,
        name: "predicted time (s)",
        nameLocation: "middle",
        nameGap: 42,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        axisLabel: { color: t.muted, fontSize: 9, formatter: (v: number) => v.toFixed(3) },
      },
      series: [
        {
          type: "line",
          // Null separators keep each interval vertical instead of joining different runs.
          data: rows.flatMap((row) => [
            [row.measured_s, row.p05_s],
            [row.measured_s, row.p95_s],
            null,
          ]),
          showSymbol: false,
          silent: true,
          lineStyle: { color: t.muted, width: 1, opacity: 0.7 },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: t.muted, type: "dashed", width: 1 },
            label: { show: false },
            data: [[{ coord: [low, low] }, { coord: [high, high] }]],
          },
        },
        {
          type: "scatter",
          symbolSize: 9,
          itemStyle: { color: t.brand, borderColor: t.popover, borderWidth: 1 },
          data: rows.map((row) => [row.measured_s, row.median_s]),
        },
      ],
    };
  }, [rows, labels]);
  const residualHost = useECharts(() => {
    const t = chartTheme();
    const values = rows.map((row) => row.error_s * 1000);
    return {
      animation: false,
      grid: { left: 52, right: 12, top: 12, bottom: 48 },
      toolbox: {
        right: 0,
        top: 0,
        feature: { saveAsImage: { type: "png", name: "held-out-residuals", pixelRatio: 2 } },
      },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: unknown) => `${Number(v).toFixed(1)} ms`,
      },
      xAxis: {
        type: "category",
        ...chartAxis(t),
        data: labels,
        axisLabel: { color: t.muted, fontSize: 9, rotate: labels.length > 6 ? 35 : 0 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        ...chartAxis(t),
        name: "residual (ms)",
        nameTextStyle: { color: t.muted, fontSize: 10 },
        axisLabel: { color: t.muted, fontSize: 9 },
        splitLine: { lineStyle: { color: t.line, opacity: 0.5 } },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 22,
          data: values.map((value) => ({
            value,
            itemStyle: { color: value > 0 ? t.risk : t.brand },
          })),
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: t.muted, width: 1 },
            label: { show: false },
            data: [{ yAxis: 0 }],
          },
        },
      ],
    };
  }, [rows, labels]);
  return (
    <div className="space-y-3">
      <div>
        <div
          ref={predictedHost}
          className="h-64 w-full"
          role="img"
          aria-label="Held-out measured time against predicted median with the returned 90 percent interval and the y equals x reference"
        />
      </div>
      <div>
        <div
          ref={residualHost}
          className="h-40 w-full"
          role="img"
          aria-label="Held-out residual per run: predicted median minus measured time"
        />
        <p className="text-2xs leading-relaxed text-muted-foreground">
          Residual = predicted median − measured. Positive means the prediction was slower than the
          measurement. {heldCaption(rows)}
        </p>
      </div>
    </div>
  );
}

export function CalibrationDensity({
  label,
  unit,
  scale,
  bins,
}: {
  label: string;
  unit: string;
  scale: number;
  bins: [number, number, number][];
}) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      toolbox: { feature: { saveAsImage: { type: "png", name: `calibration-${label}` } } },
      legend: { textStyle: { color: t.text } },
      grid: { left: 65, right: 20, top: 45, bottom: 45 },
      tooltip: { ...chartTooltip(t), trigger: "axis" },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        scale: true,
        name: `${label} (${unit || "1"})`,
        nameLocation: "middle",
        nameGap: 28,
      },
      yAxis: {
        ...chartAxis(t),
        type: "value",
        name: unit && unit !== "1" ? `Density (1/${unit})` : "Density",
      },
      series: [
        {
          type: "line",
          name: "Prior",
          showSymbol: false,
          color: t.muted,
          data: bins.map(([x, prior]) => [x * scale, prior / scale]),
        },
        {
          type: "line",
          name: "Posterior",
          showSymbol: false,
          step: "middle",
          color: t.brand,
          data: bins.map(([x, , posterior]) => [x * scale, posterior / scale]),
        },
      ],
    };
  }, [label, unit, scale, bins]);
  return (
    <div
      ref={host}
      className="h-52 w-full"
      role="img"
      aria-label={`Prior versus posterior density for ${label}`}
    />
  );
}
