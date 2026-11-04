"use client";

import { chartAxis, chartTheme, chartTooltip, useECharts } from "./useECharts";

/** Histogram of Monte Carlo race times with p5 / p50 / p95 markers. */
export function SpreadChart({
  edges,
  counts,
  percentiles,
  caption = "Predicted Monte Carlo trials from the entered input uncertainty. These are simulated race times, not measured runs; no sampling-convergence claim is made.",
}: {
  edges: number[];
  counts: number[];
  percentiles: Record<string, number>;
  caption?: string;
}) {
  const host = useECharts(() => {
    const t = chartTheme();
    const centres = counts.map((_, i) => (edges[i] + edges[i + 1]) / 2);
    const width = edges.length > 1 ? edges[1] - edges[0] : 0;
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 40, right: 16, top: 30, bottom: 30 },
      toolbox: {
        right: 0,
        top: 0,
        feature: { saveAsImage: { type: "png", name: "race-time-monte-carlo", pixelRatio: 2 } },
      },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        formatter: (p: Array<{ data: [number, number] }>) => {
          const [x, c] = p[0].data;
          return `${(x - width / 2).toFixed(3)}–${(x + width / 2).toFixed(3)} s<br/>${c} runs`;
        },
      },
      xAxis: {
        type: "value",
        ...chartAxis(t),
        min: edges[0],
        max: edges.at(-1),
        name: "race time, s",
        nameLocation: "middle",
        nameGap: 20,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        splitLine: { show: false },
        axisLabel: {
          color: t.muted,
          fontSize: 10,
          formatter: (v: number) => v.toFixed(3),
        },
      },
      yAxis: {
        type: "value",
        ...chartAxis(t),
        splitNumber: 3,
      },
      series: [
        {
          type: "bar",
          barWidth: "92%",
          itemStyle: { color: t.brand, opacity: 0.75, borderRadius: [2, 2, 0, 0] },
          data: centres.map((x, i) => [x, counts[i]]),
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: t.text2, type: "dashed", width: 1 },
            label: { color: t.text2, fontSize: 10, formatter: "{b}" },
            data: Object.entries(percentiles).map(([name, xAxis]) => ({ name, xAxis })),
          },
        },
      ],
    };
  }, [edges, counts, percentiles]);
  return (
    <figure className="flex h-full min-h-0 min-w-0 flex-col">
      <div
        ref={host}
        className="min-h-0 w-full flex-1"
        role="img"
        aria-label="Race time distribution"
      />
      <figcaption className="px-1 pt-1 text-2xs leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
