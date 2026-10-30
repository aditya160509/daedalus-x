"use client";

import { chartTheme, useECharts } from "./useECharts";

/** Histogram of Monte Carlo race times with p5 / p50 / p95 markers. */
export function SpreadChart({
  edges,
  counts,
  percentiles,
}: {
  edges: number[];
  counts: number[];
  percentiles: Record<string, number>;
}) {
  const host = useECharts(() => {
    const t = chartTheme();
    const centres = counts.map((_, i) => (edges[i] + edges[i + 1]) / 2);
    const width = edges.length > 1 ? edges[1] - edges[0] : 0;
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 40, right: 16, top: 24, bottom: 30 },
      tooltip: {
        trigger: "axis",
        backgroundColor: t.popover,
        borderColor: t.lineStrong,
        textStyle: { color: t.text, fontSize: 11 },
        formatter: (p: Array<{ data: [number, number] }>) => {
          const [x, c] = p[0].data;
          return `${(x - width / 2).toFixed(3)}–${(x + width / 2).toFixed(3)} s<br/>${c} runs`;
        },
      },
      xAxis: {
        type: "value",
        min: edges[0],
        max: edges.at(-1),
        name: "race time, s",
        nameLocation: "middle",
        nameGap: 20,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        axisLabel: { color: t.muted, fontSize: 10, formatter: (v: number) => v.toFixed(3) },
        axisLine: { lineStyle: { color: t.line } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        splitNumber: 3,
        axisLabel: { color: t.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: t.line, opacity: 0.6 } },
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
    <div ref={host} className="h-full w-full" role="img" aria-label="Race time distribution" />
  );
}
