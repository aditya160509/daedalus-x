"use client";

import { useQuery } from "@tanstack/react-query";
import { ScatterChart } from "echarts/charts";
import { ToolboxComponent } from "echarts/components";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { Panel, Metric, ProvenanceBadge, Skeleton } from "@/components/ui/primitives";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { getOracleDiagnostics, type OracleDiagnostics as Diagnostics } from "@/lib/api";

echarts.use([ScatterChart, ToolboxComponent]);
type Row = Diagnostics["rows"][number];
const COLUMNS: DataColumn<Row>[] = [
  {
    accessorKey: "index",
    header: "Observation",
    meta: { numeric: true },
    cell: (c) => Number(c.getValue()) + 1,
  },
  {
    accessorKey: "target_m2",
    header: "Stored target (cm²)",
    meta: { numeric: true },
    cell: (c) => (Number(c.getValue()) * 10000).toFixed(3),
  },
  {
    accessorKey: "predicted_m2",
    header: "LOO mean (cm²)",
    meta: { numeric: true },
    cell: (c) => (Number(c.getValue()) * 10000).toFixed(3),
  },
  {
    accessorKey: "error_m2",
    header: "Error (cm²)",
    meta: { numeric: true },
    cell: (c) => (Number(c.getValue()) * 10000).toFixed(3),
  },
  { accessorKey: "provenance", header: "Target source" },
];

function PredictionPlot({ data }: { data: Diagnostics }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const values = data.rows
      .flatMap((r) => [r.target_m2, r.predicted_m2, r.lower90_m2, r.upper90_m2])
      .map((v) => v * 10000);
    const lo = Math.min(...values),
      hi = Math.max(...values);
    return {
      animation: false,
      grid: { left: 65, right: 22, top: 38, bottom: 52 },
      tooltip: { ...chartTooltip(t), trigger: "item" },
      toolbox: { feature: { saveAsImage: { type: "png", name: "oracle-loo-predictions" } } },
      xAxis: {
        type: "value",
        ...chartAxis(t),
        name: "stored target CdA (cm²)",
        nameLocation: "middle",
        nameGap: 30,
        scale: true,
      },
      yAxis: { type: "value", ...chartAxis(t), name: "LOO prediction (cm²)", scale: true },
      series: [
        {
          type: "line",
          data: [
            [lo, lo],
            [hi, hi],
          ],
          symbol: "none",
          lineStyle: { color: t.muted, type: "dashed" },
          silent: true,
        },
        {
          type: "line",
          data: data.rows.flatMap((r) => [
            [r.target_m2 * 10000, r.lower90_m2 * 10000],
            [r.target_m2 * 10000, r.upper90_m2 * 10000],
            null,
          ]),
          symbol: "rect",
          symbolSize: [6, 2],
          lineStyle: { color: t.muted, width: 1 },
          itemStyle: { color: t.muted },
          tooltip: { show: false },
        },
        {
          type: "scatter",
          name: "Held-out target",
          data: data.rows.map((r) => [r.target_m2 * 10000, r.predicted_m2 * 10000, r.index + 1]),
          symbolSize: 8,
          itemStyle: { color: t.brand },
          tooltip: {
            formatter: (p: { value: number[] }) =>
              `Observation ${p.value[2]}<br/>Target ${p.value[0].toFixed(3)} cm²<br/>LOO mean ${p.value[1].toFixed(3)} cm²`,
          },
        },
      ],
    };
  }, [data]);
  return (
    <div
      ref={host}
      className="h-80 min-w-0"
      role="img"
      aria-label="Leave-one-out predicted versus stored target CdA with 90 percent predictive intervals"
    />
  );
}

function CoveragePlot({ data }: { data: Diagnostics }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 58, right: 20, top: 38, bottom: 52 },
      tooltip: { ...chartTooltip(t), trigger: "item" },
      toolbox: { feature: { saveAsImage: { type: "png", name: "oracle-loo-coverage" } } },
      xAxis: {
        type: "value",
        ...chartAxis(t),
        min: 0,
        max: 100,
        name: "nominal coverage (%)",
        nameLocation: "middle",
        nameGap: 30,
      },
      yAxis: { type: "value", ...chartAxis(t), min: 0, max: 100, name: "held-out coverage (%)" },
      series: [
        {
          type: "line",
          data: [
            [0, 0],
            [100, 100],
          ],
          symbol: "none",
          lineStyle: { color: t.muted, type: "dashed" },
          silent: true,
        },
        {
          type: "line",
          data: data.coverage.flatMap((r) => [
            [r.nominal * 100, r.lower95 * 100],
            [r.nominal * 100, r.upper95 * 100],
            null,
          ]),
          symbol: "rect",
          symbolSize: [6, 2],
          lineStyle: { color: t.muted, width: 1 },
          itemStyle: { color: t.muted },
          tooltip: { show: false },
        },
        {
          type: "scatter",
          data: data.coverage.map((r) => [r.nominal * 100, r.observed * 100, r.count]),
          symbolSize: 9,
          itemStyle: { color: t.brand },
          tooltip: {
            formatter: (p: { value: number[] }) =>
              `Nominal ${p.value[0].toFixed(0)}%<br/>Covered ${p.value[1].toFixed(1)}% (${p.value[2]}/${data.observations})`,
          },
        },
      ],
    };
  }, [data]);
  return (
    <div
      ref={host}
      className="h-80 min-w-0"
      role="img"
      aria-label="Nominal versus observed leave-one-out interval coverage with Wilson confidence intervals"
    />
  );
}

export function OracleDiagnostics() {
  const q = useQuery({
    queryKey: ["oracle-diagnostics"],
    queryFn: getOracleDiagnostics,
    staleTime: 60000,
  });
  const data = q.data;
  return (
    <Panel
      title="Held-out surrogate diagnostics"
      actions={
        data && (
          <ProvenanceBadge value={data.provenance === "synthetic" ? "synthetic" : "predicted"} />
        )
      }
      bodyClassName="space-y-4 overflow-y-auto p-4"
    >
      {q.isPending ? (
        <Skeleton className="h-80" />
      ) : q.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {q.error.message}
        </p>
      ) : (
        data && (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Each target is omitted, the GP is refitted, then its omitted value is predicted. This
              checks the stored {data.provenance} campaign—not independently measured aerodynamics.
              Four to 64 observations are supported.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Targets" value={String(data.observations)} />
              <Metric label="MAE" value={(data.mae_m2 * 10000).toFixed(3)} unit="cm²" />
              <Metric label="RMSE" value={(data.rmse_m2 * 10000).toFixed(3)} unit="cm²" />
            </div>
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <div className="min-w-0">
                <h3 className="text-xs font-medium">Prediction vs target · 90% intervals</h3>
                <PredictionPlot data={data} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-medium">Interval coverage · 95% Wilson bounds</h3>
                <CoveragePlot data={data} />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Points near the diagonal agree with held-out targets; wide bounds expose limited
              evidence. Predictive intervals include the fitted observation nugget. Fold dependence
              and small samples limit conclusions.
            </p>
            <DataTable
              data={data.rows}
              columns={COLUMNS}
              label="Leave-one-out campaign predictions"
            />
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {data.assumptions.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        )
      )}
    </Panel>
  );
}
