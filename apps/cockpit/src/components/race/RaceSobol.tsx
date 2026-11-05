"use client";

import { useMutation } from "@tanstack/react-query";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import { Button } from "@/components/ui/button";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";
import { getRaceSobol, type RaceSimulationRequest } from "@/lib/api";

type Result = Awaited<ReturnType<typeof getRaceSobol>>;

function Indices({ data }: { data: Result }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 75, right: 25, top: 38, bottom: 45 },
      legend: { textStyle: { color: t.muted } },
      tooltip: { ...chartTooltip(t), trigger: "axis", valueFormatter: (v: number) => v.toFixed(3) },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        name: "Variance fraction [1]",
        nameLocation: "middle",
        nameGap: 27,
      },
      yAxis: {
        ...chartAxis(t),
        type: "category",
        inverse: true,
        data: data.rows.map(
          (r) =>
            ({
              mass: "Mass",
              cda: "CdA",
              crr: "Rolling",
              thrust: "Thrust",
            })[r.name] ?? r.name,
        ),
      },
      series: [
        {
          type: "bar",
          name: "First order",
          data: data.rows.map((r) => r.first_order),
          itemStyle: { color: t.brand },
        },
        {
          type: "bar",
          name: "Total order",
          data: data.rows.map((r) => r.total_order),
          itemStyle: { color: t.muted },
        },
      ],
    };
  }, [data]);
  return (
    <div
      ref={host}
      className="h-60 w-full"
      role="img"
      aria-label="First and total order Sobol indices for race time"
    />
  );
}

export function RaceSobol({ race }: { race: RaceSimulationRequest }) {
  const estimate = useMutation({ mutationFn: getRaceSobol });
  const result = estimate.variables === race ? estimate.data : undefined;
  return (
    <Panel
      title="Race-time variance sensitivity"
      actions={<ProvenanceBadge value="predicted" />}
      description="TITAN M2 · independent uniform ±10% ranges around the current inputs."
      bodyClassName="space-y-3 p-3"
    >
      <Button
        size="sm"
        variant="outline"
        disabled={estimate.isPending}
        onClick={() => estimate.mutate(race)}
      >
        {estimate.isPending ? "Sampling TITAN…" : "Calculate Sobol indices"}
      </Button>
      {estimate.variables === race && estimate.error && (
        <p role="alert" className="text-xs text-destructive">
          {estimate.error.message}
        </p>
      )}
      {result && (
        <>
          <Indices data={result} />
          <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {result.rows.map((r) => (
              <li key={r.name}>
                {r.name}: S₁ {r.first_order.toFixed(3)} ± {r.first_order_ci95.toFixed(3)} · Sₜ{" "}
                {r.total_order.toFixed(3)} ± {r.total_order_ci95.toFixed(3)}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {result.samples} evaluations. Uncertainty values are 95% bootstrap half-widths.
            Total-order values include interactions and do not add to one.
          </p>
        </>
      )}
    </Panel>
  );
}
