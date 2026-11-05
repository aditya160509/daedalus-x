"use client";

import { useState } from "react";
import { chartAxis, chartTheme, chartTooltip, useECharts } from "@/components/charts/useECharts";
import { Input } from "@/components/ui/input";
import { Metric, ProvenanceBadge } from "@/components/ui/primitives";

function DeflectionBars({ predicted, measured }: { predicted: number; measured: number }) {
  const host = useECharts(() => {
    const t = chartTheme();
    return {
      animation: false,
      grid: { left: 85, right: 30, top: 30, bottom: 45 },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: number) => `${v.toFixed(3)} mm`,
      },
      xAxis: {
        ...chartAxis(t),
        type: "value",
        name: "Tip deflection (mm)",
        nameLocation: "middle",
        nameGap: 27,
      },
      yAxis: { ...chartAxis(t), type: "category", inverse: true, data: ["Predicted", "Measured"] },
      series: [
        {
          type: "bar",
          data: [
            { value: predicted, itemStyle: { color: t.brand } },
            { value: measured, itemStyle: { color: t.ok } },
          ],
        },
      ],
    };
  }, [predicted, measured]);
  return (
    <div
      ref={host}
      className="h-36 w-full"
      role="img"
      aria-label="Predicted and measured tip deflection at the same load"
    />
  );
}

export function LoadComparison({ loadN, predicted }: { loadN: number; predicted: number }) {
  const [reading, setReading] = useState("");
  const [sameSetup, setSameSetup] = useState(false);
  const measured = Number(reading);
  const ready = sameSetup && reading.trim() !== "" && Number.isFinite(measured) && measured >= 0;
  return (
    <section className="space-y-2 border-t pt-3">
      <h3 className="text-sm font-medium">Predicted vs measured load test</h3>
      <p className="text-xs text-muted-foreground">
        Enter the measured tip deflection at {loadN.toFixed(3)} N with the same part, fixture and
        load direction. This comparison is local to the current view.
      </p>
      <label htmlFor="beam-measured-deflection" className="grid max-w-xs gap-1 text-xs">
        Measured tip deflection (mm)
        <Input
          id="beam-measured-deflection"
          type="number"
          min={0}
          step="any"
          value={reading}
          onChange={(e) => setReading(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={sameSetup}
          onChange={(e) => setSameSetup(e.target.checked)}
        />
        The physical load and setup match this model case.
      </label>
      {ready && (
        <>
          <div className="flex gap-2">
            <ProvenanceBadge value="predicted" />
            <ProvenanceBadge value="measured" />
          </div>
          <DeflectionBars predicted={predicted} measured={measured} />
          <Metric
            label="Prediction minus measurement"
            value={(predicted - measured).toFixed(3)}
            unit="mm"
          />
        </>
      )}
    </section>
  );
}
