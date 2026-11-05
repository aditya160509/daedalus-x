"use client";

import { useQuery } from "@tanstack/react-query";
import { ScatterChart } from "echarts/charts";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { getForgeFrontierSamples } from "@/lib/api";

echarts.use([ScatterChart]);
type Result = Awaited<ReturnType<typeof getForgeFrontierSamples>>;

function Samples({ data }: { data: Result }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 55, right: 22, top: 45, bottom: 48 },
      tooltip: { ...chartTooltip(t), trigger: "item" },
      legend: { textStyle: { color: t.muted } },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        scale: true,
        name: "Frontal area (cm²)",
        nameLocation: "middle",
        nameGap: 28,
      },
      yAxis: { ...chartAxis(t), type: "value", name: "Minimum margin (mm)", scale: true },
      series: [
        ["Frontier", t.brand, data.rows.filter((r) => r.frontier)],
        ["Other sample", t.muted, data.rows.filter((r) => !r.frontier && !r.failed)],
        ["Fails CAD", t.risk, data.rows.filter((r) => r.failed > 0)],
      ].map(([name, color, rows]) => ({
        name,
        type: "scatter",
        itemStyle: { color },
        data: (rows as Result["rows"]).map((r) => ({
          name: r.design,
          value: [r.area_cm2, r.margin_mm],
        })),
        markLine:
          name === "Frontier"
            ? {
                silent: true,
                symbol: "none",
                data: [{ yAxis: 0 }],
                lineStyle: { type: "dashed", color: t.muted },
              }
            : undefined,
      })),
    };
  }, [data]);
  return (
    <div
      ref={host}
      className="h-56 w-full"
      role="img"
      aria-label="Sampled CAD frontier for frontal area and minimum shared rule margin"
    />
  );
}

export function ForgeSampleFrontier({ design }: { design: string }) {
  const samples = useQuery({
    queryKey: ["forge-frontier-samples", design],
    queryFn: () => getForgeFrontierSamples(design),
  });
  const data = samples.data;
  return (
    <section className="space-y-2 border-b pb-4">
      <h3 className="text-sm font-medium">Sampled CAD frontier</h3>
      <p className="text-xs text-muted-foreground">
        Built CAD samples only. The frontier favours smaller frontal area and more headroom under
        the same dimensional checks. Manual rules still need inspection.
      </p>
      {samples.error && (
        <p role="alert" className="text-xs text-destructive">
          {samples.error.message}
        </p>
      )}
      {samples.isPending && (
        <p className="text-xs text-muted-foreground">Checking the imported sample set…</p>
      )}
      {data &&
        (data.rows.length ? (
          <>
            <Samples data={data} />
            <p className="text-xs text-muted-foreground">
              {data.rows.length} comparable samples · {data.rules} shared dimensional checks ·{" "}
              {data.excluded} excluded · {data.outside_sample_limit} beyond the sample cap.
            </p>
            <ul className="space-y-1 text-xs">
              {data.rows
                .filter((r) => r.frontier)
                .map((r) => (
                  <li key={r.design}>
                    {r.design} · {r.area_cm2.toFixed(2)} cm² · {r.margin_mm.toFixed(2)} mm minimum
                    margin · {r.manual} manual checks
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            No comparable CAD samples with computable dimensional margins.
          </p>
        ))}
    </section>
  );
}
