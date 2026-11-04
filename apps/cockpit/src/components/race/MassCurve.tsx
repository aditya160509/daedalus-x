"use client";

import { useQuery } from "@tanstack/react-query";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import type { RaceSimulationRequest } from "@/lib/api";
import { simulateRaceExtra } from "@/lib/api-extra";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";

/** The legal minimum car mass in grams. Heavier cars are legal but slower. */
const RULE_MASS_G = 50.0;
const STEP_G = 0.5;
const SPAN_G = 30;

/**
 * Race time against car mass from the 50.0 g rule upward, using the same race model as the
 * Race workspace. Every other input (thrust, CdA, Crr, track) is held at the current request.
 */
export function MassCurve({ race }: { race: RaceSimulationRequest }) {
  const masses = Array.from(
    { length: Math.round(SPAN_G / STEP_G) + 1 },
    (_, i) => +(RULE_MASS_G + i * STEP_G).toFixed(2),
  );
  const query = useQuery({
    queryKey: ["mass-curve", race, masses],
    queryFn: () =>
      Promise.all(
        masses.map(async (g) => {
          const sim = await simulateRaceExtra({ ...race, mass_kg: g / 1000 });
          return { g, time: sim.finished ? sim.time_s : null };
        }),
      ),
    staleTime: 30_000,
  });
  const points = query.data ?? [];
  const best = points.reduce<{ g: number; time: number } | null>((acc, p) => {
    if (p.time == null) return acc;
    return acc == null || p.time < acc.time ? { g: p.g, time: p.time } : acc;
  }, null);

  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 52, right: 16, top: 24, bottom: 40 },
      toolbox: {
        right: 0,
        top: 0,
        feature: { saveAsImage: { type: "png", name: "optimal-legal-mass", pixelRatio: 2 } },
      },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        formatter: (p: Array<{ data: [number, number | null] }>) => {
          const [g, time] = p[0].data;
          return `${g.toFixed(2)} g<br/>${time == null ? "did not finish" : `${time.toFixed(3)} s`}`;
        },
      },
      xAxis: {
        type: "value",
        name: "car mass, g",
        nameLocation: "middle",
        nameGap: 24,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        min: RULE_MASS_G,
        max: RULE_MASS_G + SPAN_G,
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
        {
          type: "line",
          data: points.map((p) => [p.g, p.time]),
          connectNulls: false,
          symbol: "none",
          lineStyle: { color: t.brand, width: 1.5 },
          markLine: {
            silent: true,
            symbol: "none",
            label: { color: t.text2, fontSize: 10, formatter: "{b}" },
            lineStyle: { color: t.text2, type: "dashed", width: 1 },
            data: [{ name: "50.0 g rule", xAxis: RULE_MASS_G }],
          },
        },
      ],
    };
  }, [points]);

  return (
    <Panel
      title="Optimal legal mass"
      description="Race time from the 50.0 g minimum upward, all other inputs held."
      actions={<ProvenanceBadge value="predicted" />}
      bodyClassName="p-3"
    >
      {query.isError ? (
        <p role="alert" className="text-xs text-danger">
          {query.error instanceof Error ? query.error.message : "Mass curve failed"}
        </p>
      ) : query.isPending ? (
        <div className="h-52 animate-pulse rounded-lg bg-surface-2" />
      ) : (
        <div className="flex flex-col gap-1">
          <div ref={host} className="h-52 w-full" />
          <p className="text-2xs text-muted-foreground">
            {best
              ? `Fastest legal mass in range: ${best.g.toFixed(1)} g at ${best.time.toFixed(3)} s. Simulated, not measured.`
              : "No mass in range finishes the track."}
          </p>
        </div>
      )}
    </Panel>
  );
}
