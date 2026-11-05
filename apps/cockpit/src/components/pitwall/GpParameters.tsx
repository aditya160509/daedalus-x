"use client";

import { ToolboxComponent } from "echarts/components";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { RepeatNoise } from "./RepeatNoise";
import type { OracleSensitivity } from "@/lib/api";

echarts.use([ToolboxComponent]);
type Diagnostics = OracleSensitivity["gp"];
type Row = Diagnostics["length_scales"][number];
const columns: DataColumn<Row>[] = [
  { accessorKey: "name", header: "Parameter" },
  {
    accessorKey: "normalised",
    header: "Length / parameter range (1)",
    meta: { numeric: true },
    cell: (c) => Number(c.getValue()).toFixed(3),
  },
  {
    accessorKey: "physical",
    header: "Length in input units",
    meta: { numeric: true },
    cell: (c) => `${Number(c.getValue()).toFixed(3)} ${c.row.original.unit}`,
  },
  {
    accessorKey: "at_bound",
    header: "Fit bound",
    cell: (c) => (c.getValue() ? "At bound — review fit" : "Within fit bounds"),
  },
];

export function GpParameters({ data }: { data: Diagnostics }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 24, right: 24, top: 38, bottom: 45, containLabel: true },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: unknown) => `${Number(v).toFixed(3)} range units`,
      },
      toolbox: { feature: { saveAsImage: { type: "png", name: "oracle-gp-length-scales" } } },
      xAxis: {
        type: "value",
        ...chartAxis(t),
        name: "length / input range (1)",
        nameLocation: "middle",
        nameGap: 28,
        min: 0,
      },
      yAxis: {
        type: "category",
        ...chartAxis(t),
        inverse: true,
        data: data.length_scales.map((r) => r.name.replaceAll("_", " ")),
      },
      series: [
        {
          type: "bar",
          name: "RBF length scale",
          barMaxWidth: 14,
          itemStyle: { color: t.brand },
          data: data.length_scales.map((r) => r.normalised),
        },
      ],
    };
  }, [data]);
  return (
    <section className="space-y-3 border-t p-4" aria-label="Fitted GP parameters">
      <h3 className="text-sm font-medium">Fitted GP length scales and noise</h3>
      {!data.fit_success && (
        <p role="alert" className="text-xs text-risk">
          Hyperparameter optimiser did not report convergence: {data.fit_message}
        </p>
      )}
      <div
        ref={host}
        className="h-64 w-full"
        role="img"
        aria-label="Fitted GP correlation length per normalised parameter"
      />
      <DataTable data={data.length_scales} columns={columns} label="GP kernel length scales" />
      <p className="text-xs text-muted-foreground">
        Fitted noise SD: {(data.noise_sd_m2 * 10000).toFixed(4)} cm² CdA. Duplicate input
        observations: {data.repeat_inputs}. This nugget comes from marginal likelihood, not measured
        repeat-run variability.
      </p>
      <RepeatNoise nuggetCm2={data.noise_sd_m2 * 10000} />
      <p className="text-xs text-muted-foreground">
        Shorter RBF lengths allow the fitted surrogate to vary faster along that parameter. They are
        correlation scales, not causal importance scores or confidence intervals. Bound hits can
        indicate weakly identified fits; compare with SALib and accepted observations.
      </p>
    </section>
  );
}
