"use client";

import { useQuery } from "@tanstack/react-query";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import type { RaceSimulationRequest, UncertaintyInput } from "@/lib/api";
import { monteCarloAt } from "@/lib/api-extra";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";

const SAMPLE_COUNTS = [50, 100, 200, 400, 800, 1000] as const;

/**
 * Monte Carlo convergence: p5, p50 and p95 race time as the sample count grows, same seed.
 * The band between p5 and p95 is shaded; flat lines mean the estimate has settled.
 */
export function MonteCarloConvergence({
  race,
  uncertainty,
}: {
  race: RaceSimulationRequest;
  uncertainty: UncertaintyInput;
}) {
  const query = useQuery({
    queryKey: ["mc-convergence", race, uncertainty],
    queryFn: async () =>
      Promise.all(
        SAMPLE_COUNTS.map(async (n) => {
          const r = await monteCarloAt(race, uncertainty, n, 0);
          return {
            n,
            p5: r.percentiles_s.p5 ?? null,
            p50: r.percentiles_s.p50 ?? null,
            p95: r.percentiles_s.p95 ?? null,
          };
        }),
      ),
    staleTime: 30_000,
  });
  const points = query.data?.filter((p) => p.p50 != null) ?? [];

  const host = useECharts(() => {
    const t = chartTheme();
    const xs = points.map((p) => String(p.n));
    const p5 = points.map((p) => p.p5 ?? 0);
    const p95 = points.map((p) => p.p95 ?? 0);
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 52, right: 16, top: 24, bottom: 40 },
      toolbox: {
        right: 0,
        top: 0,
        feature: { saveAsImage: { type: "png", name: "mc-convergence", pixelRatio: 2 } },
      },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: number) => `${v.toFixed(3)} s`,
      },
      xAxis: {
        type: "category",
        data: xs,
        name: "samples, n",
        nameLocation: "middle",
        nameGap: 24,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        ...chartAxis(t),
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        name: "race time, s",
        nameTextStyle: { color: t.muted, fontSize: 10 },
        scale: true,
        ...chartAxis(t),
      },
      series: [
        // Stacked pair: an invisible p5 base plus the p95 - p5 width gives a shaded band.
        { name: "p5 base", type: "line", stack: "band", data: p5, silent: true, lineStyle: { opacity: 0 }, symbol: "none" },
        {
          name: "p5–p95",
          type: "line",
          stack: "band",
          data: p95.map((v, i) => v - p5[i]),
          silent: true,
          lineStyle: { opacity: 0 },
          symbol: "none",
          areaStyle: { color: t.brand, opacity: 0.15 },
        },
        {
          name: "p5",
          type: "line",
          data: p5,
          lineStyle: { color: t.muted, type: "dashed", width: 1 },
          symbol: "none",
        },
        {
          name: "p95",
          type: "line",
          data: p95,
          lineStyle: { color: t.muted, type: "dashed", width: 1 },
          symbol: "none",
        },
        {
          name: "p50",
          type: "line",
          data: points.map((p) => p.p50),
          lineStyle: { color: t.brand, width: 1.5 },
          itemStyle: { color: t.brand },
          symbol: "circle",
          symbolSize: 4,
        },
      ],
    };
  }, [points]);

  return (
    <Panel
      title="Monte Carlo convergence"
      description="p5, p50 and p95 race time against sample count, one seed."
      actions={<ProvenanceBadge value="predicted" />}
      bodyClassName="p-3"
    >
      {query.isError ? (
        <p role="alert" className="text-xs text-danger">
          {query.error instanceof Error ? query.error.message : "Convergence failed"}
        </p>
      ) : query.isPending ? (
        <div className="h-44 animate-pulse rounded-lg bg-surface-2" />
      ) : (
        <div className="flex flex-col gap-1">
          <div ref={host} className="h-44 w-full" />
          <p className="text-2xs text-muted-foreground">
            Simulated race times from the input uncertainty, not measured runs. The band is p5 to
            p95.
          </p>
        </div>
      )}
    </Panel>
  );
}
