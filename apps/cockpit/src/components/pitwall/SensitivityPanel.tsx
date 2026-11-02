"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Panel, ProvenanceBadge, SegmentedControl, Skeleton } from "@/components/ui/primitives";
import { chartTheme, useECharts } from "@/components/charts/useECharts";
import { getOracleSensitivity, type OracleSensitivity } from "@/lib/api";

function SensitivityChart({ data }: { data: OracleSensitivity }) {
  const sobol = data.method === "sobol",
    scale = sobol ? 1 : 1e4;
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      textStyle: { fontFamily: t.mono, color: t.muted },
      grid: { left: 24, right: 24, top: 42, bottom: 36, containLabel: true },
      tooltip: {
        trigger: "axis",
        valueFormatter: (v: unknown) =>
          typeof v === "number" ? `${v.toFixed(4)} ${sobol ? "1" : "cm²"}` : "—",
      },
      legend: {
        data: sobol ? ["First order S1", "Total order ST"] : ["Mean effect μ*", "Spread σ"],
        textStyle: { color: t.muted, fontSize: 11 },
        top: 12,
      },
      xAxis: {
        type: "value",
        name: sobol ? "Variance fraction [1]" : "CdA effect [cm²]",
        nameLocation: "middle",
        nameGap: 25,
        axisLabel: { color: t.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: t.line } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: data.rows.map((row) => row.name.replaceAll("_", " ")),
        axisLabel: { color: t.text2, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: sobol ? "First order S1" : "Mean effect μ*",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: t.brand },
          data: data.rows.map((row) =>
            sobol ? (row.first_order ?? null) : row.mu_star == null ? null : row.mu_star * scale,
          ),
        },
        {
          name: sobol ? "Total order ST" : "Spread σ",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: t.muted },
          data: data.rows.map((row) =>
            sobol ? (row.total_order ?? null) : row.sigma == null ? null : row.sigma * scale,
          ),
        },
      ],
    };
  }, [data]);
  return (
    <div
      ref={host}
      className="h-80 min-h-72 w-full"
      role="img"
      aria-label={`${data.method} sensitivity of surrogate drag area`}
    />
  );
}

export function SensitivityPanel() {
  const [method, setMethod] = useState<"sobol" | "morris">("sobol");
  const result = useQuery({
    queryKey: ["oracle-sensitivity", method],
    queryFn: () => getOracleSensitivity(method),
    staleTime: 60_000,
  });
  const data = result.data;
  const fmt = (v: number | undefined, scale = 1) => (v == null ? "—" : (v * scale).toFixed(4));
  return (
    <Panel
      title="What matters in the current surrogate"
      actions={
        data && (
          <ProvenanceBadge value={data.provenance === "synthetic" ? "synthetic" : "estimated"} />
        )
      }
      bodyClassName="overflow-y-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <SegmentedControl
          label="Sensitivity method"
          value={method}
          onChange={setMethod}
          options={[
            { value: "sobol", label: "Sobol" },
            { value: "morris", label: "Morris" },
          ]}
        />
        {data && (
          <span className="text-xs text-muted-foreground">
            {data.samples.toLocaleString()} surrogate evaluations · {data.observations} observations
          </span>
        )}
      </div>
      <p className="px-4 pt-3 text-xs text-muted-foreground">
        SALib evaluates the GP mean over independent uniform parameter bounds. This describes the
        current surrogate; measured design effects still require accepted runs. Confidence intervals
        are listed below.
      </p>
      {result.isError ? (
        <div role="alert" className="p-4 text-sm">
          {result.error.message}{" "}
          <Button variant="link" onClick={() => void result.refetch()}>
            Retry
          </Button>
        </div>
      ) : !data ? (
        <Skeleton className="m-4 h-80" />
      ) : (
        <>
          <SensitivityChart data={data} />
          <div className="overflow-x-auto border-t">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Parameter</th>
                  <th className="px-4 py-2 font-medium">
                    {method === "sobol" ? "S1 ± 95% CI [1]" : "μ* ± 95% CI [cm²]"}
                  </th>
                  <th className="px-4 py-2 font-medium">
                    {method === "sobol" ? "ST ± 95% CI [1]" : "σ [cm²]"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.name} className="border-t">
                    <td className="px-4 py-3 capitalize">{row.name.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap tabular-nums">
                      {method === "sobol"
                        ? `${fmt(row.first_order)} ± ${fmt(row.first_order_ci95)}`
                        : `${fmt(row.mu_star, 1e4)} ± ${fmt(row.mu_star_ci95, 1e4)}`}
                    </td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap tabular-nums">
                      {method === "sobol"
                        ? `${fmt(row.total_order)} ± ${fmt(row.total_order_ci95)}`
                        : fmt(row.sigma, 1e4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t px-4 py-3 text-[10px] text-muted-foreground">
            Seed {data.seed} · {data.input_distribution}.{" "}
            {method === "sobol"
              ? "Small negative indices can occur from sampling error; values are not clipped."
              : "μ* ranks average effect; σ indicates nonlinear or interaction effects."}
          </p>
        </>
      )}
    </Panel>
  );
}
