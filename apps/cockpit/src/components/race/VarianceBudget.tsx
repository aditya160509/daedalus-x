"use client";

import { useState } from "react";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import { Input } from "@/components/ui/input";
import { Panel, ProvenanceBadge } from "@/components/ui/primitives";

const SOURCES = [
  { name: "CFD CdA", unit: "cm²", hint: "One-sigma CdA uncertainty for this design" },
  { name: "Driver reaction", unit: "ms", hint: "Standard deviation across comparable starts" },
  { name: "Timing instrument", unit: "ms", hint: "Standard uncertainty from the timing system" },
];

function VarianceChart({ values }: { values: number[] }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 113, right: 27, top: 30, bottom: 45 },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: number) => `${v.toFixed(2)} ms²`,
      },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        name: "Time variance (ms²)",
        nameLocation: "middle",
        nameGap: 27,
      },
      yAxis: { ...chartAxis(t), type: "category", inverse: true, data: SOURCES.map((s) => s.name) },
      series: [{ type: "bar", data: values, itemStyle: { color: t.brand } }],
    };
  }, [values]);
  return (
    <div
      ref={host}
      className="h-48 w-full"
      role="img"
      aria-label="CFD, reaction and timing contributions to race time variance"
    />
  );
}

export function VarianceBudget({ msPerCm2 }: { msPerCm2: number }) {
  const [inputs, setInputs] = useState(["", "", ""]);
  const ready = inputs.every(
    (v) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1000,
  );
  const values = inputs.map((v, i) => (Number(v) * (i === 0 ? msPerCm2 : 1)) ** 2);
  const total = Math.sqrt(values.reduce((a, b) => a + b, 0));
  return (
    <Panel
      title="Race time uncertainty budget"
      actions={<ProvenanceBadge value="estimated" />}
      description="First-order propagation from three independent uncertainty inputs."
      bodyClassName="space-y-3 p-3"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {SOURCES.map((source, i) => (
          <label key={source.name} htmlFor={`variance-source-${i}`} className="grid gap-1 text-xs">
            {source.name} σ ({source.unit})
            <Input
              id={`variance-source-${i}`}
              type="number"
              min={0}
              max={1000}
              step="any"
              value={inputs[i]}
              onChange={(event) =>
                setInputs(inputs.map((v, j) => (i === j ? event.target.value : v)))
              }
            />
            <span className="text-muted-foreground">{source.hint}</span>
          </label>
        ))}
      </div>
      {ready ? (
        <>
          <VarianceChart values={values} />
          <p className="text-xs">Combined standard uncertainty: {total.toFixed(2)} ms.</p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Enter all three standard uncertainties. Zero is valid for an intentionally omitted source.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        CdA uses the local TITAN exchange rate ({msPerCm2.toFixed(2)} ms/cm²). Enter standard
        uncertainties directly. GCI and 95% intervals are different quantities.
      </p>
    </Panel>
  );
}
