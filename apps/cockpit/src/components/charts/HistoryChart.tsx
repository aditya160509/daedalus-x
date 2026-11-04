"use client";

import { chartAxis, chartTheme, chartTooltip, useECharts } from "./useECharts";

export interface HistorySeries {
  name: string;
  values: number[];
  color: string;
}

/** Iteration history (convergence, residuals). Log axis for residuals. */
export function HistoryChart({
  iteration,
  series,
  yLabel,
  log = false,
  band,
  yRange,
  ariaLabel,
  exportName = "iteration-history",
  caption = "Simulated solver iteration history from this run. It shows numerical convergence only: it is not an experimental measurement and carries no GCI or uncertainty interval.",
}: {
  iteration: number[];
  series: HistorySeries[];
  yLabel: string;
  log?: boolean;
  /** Shaded acceptance window, e.g. the Cd stability window. */
  band?: { from: number; label: string };
  /** Fixed y extent, e.g. to hide the start-up transient; the full history stays zoomable. */
  yRange?: [number, number];
  ariaLabel: string;
  exportName?: string;
  caption?: string;
}) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 56, right: 16, top: 34, bottom: 32 },
      dataZoom: [{ type: "inside", filterMode: "none" }],
      toolbox: {
        right: 0,
        top: 0,
        feature: { saveAsImage: { type: "png", name: exportName, pixelRatio: 2 } },
      },
      legend: {
        top: 0,
        left: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 3,
        textStyle: { color: t.text2, fontSize: 11 },
      },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: unknown) => (typeof v === "number" ? v.toPrecision(4) : String(v)),
      },
      xAxis: {
        type: "value",
        ...chartAxis(t),
        min: iteration[0],
        max: iteration[iteration.length - 1],
        name: "iteration",
        nameLocation: "middle",
        nameGap: 22,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: log ? "log" : "value",
        ...chartAxis(t),
        scale: !log,
        min: yRange?.[0],
        max: yRange?.[1],
        name: yLabel,
        nameLocation: "middle",
        nameGap: 42,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        splitNumber: 4,
        axisLabel: {
          color: t.muted,
          fontSize: 10,
          formatter: (v: number) => (log ? v.toExponential(0) : v.toPrecision(3)),
        },
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: "line",
        showSymbol: false,
        sampling: "lttb",
        lineStyle: { width: 1.5, color: s.color },
        itemStyle: { color: s.color },
        data: iteration.map((x, k) => [x, s.values[k]]),
        markArea:
          i === 0 && band
            ? {
                silent: true,
                itemStyle: { color: "rgba(61,214,240,0.06)" },
                label: { show: true, color: t.muted, fontSize: 10, position: "insideTop" },
                data: [[{ xAxis: band.from, name: band.label }, { xAxis: iteration.at(-1) }]],
              }
            : undefined,
      })),
    };
  }, [iteration, series, yLabel, log, band, yRange, exportName]);
  return (
    <figure className="flex h-full min-h-0 min-w-0 flex-col">
      <div ref={host} className="min-h-0 w-full flex-1" role="img" aria-label={ariaLabel} />
      <figcaption className="px-1 pt-1 text-2xs leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
