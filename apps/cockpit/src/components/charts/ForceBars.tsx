"use client";

import { useState } from "react";
import { ToolboxComponent } from "echarts/components";
import { SegmentedControl } from "@/components/ui/primitives";
import { forceWaterfall } from "@/lib/forceWaterfall";
import { SERIES } from "@/lib/colormap";
import { chartAxis, chartTheme, chartTooltip, echarts, useECharts } from "./useECharts";

echarts.use([ToolboxComponent]);

export interface ComponentForce {
  name: string;
  pressure: number;
  viscous: number;
}

/** Signed per-component drag split into pressure and viscous parts (spec §4.4a). */
export function ForceBars({ data, unit }: { data: ComponentForce[]; unit: string }) {
  const [view, setView] = useState<"split" | "waterfall">("waterfall");
  const host = useECharts(() => {
    const t = chartTheme();
    const rows = forceWaterfall(data);
    const names = view === "waterfall" ? rows.map((d) => d.name) : data.map((d) => d.name);
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 92, right: 24, top: 28, bottom: 28 },
      toolbox: { feature: { saveAsImage: { type: "png", name: "component-drag" } } },
      legend: {
        show: view === "split",
        top: 0,
        right: 8,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 6,
        textStyle: { color: t.text2, fontSize: 11 },
      },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: unknown) =>
          typeof v === "number" ? `${v.toFixed(2)} ${unit}` : String(v),
      },
      xAxis: {
        type: "value",
        ...chartAxis(t),
        name: unit,
        nameLocation: "middle",
        nameGap: 20,
        nameTextStyle: { color: t.muted, fontSize: 10 },
      },
      yAxis: {
        type: "category",
        ...chartAxis(t),
        data: names,
        inverse: true,
        splitLine: { show: false },
        axisLabel: { color: t.text2, fontSize: 11, fontFamily: "inherit" },
      },
      series:
        view === "waterfall"
          ? [
              {
                name: "offset",
                type: "bar",
                stack: "waterfall",
                stackStrategy: "all",
                barWidth: 14,
                silent: true,
                itemStyle: { color: "transparent" },
                emphasis: { disabled: true },
                tooltip: { show: false },
                data: rows.map((r) => Math.min(r.start, r.end)),
              },
              {
                name: "signed contribution",
                type: "bar",
                stack: "waterfall",
                stackStrategy: "all",
                barWidth: 14,
                data: rows.map((r, i) => ({
                  value: Math.abs(r.delta),
                  itemStyle: {
                    color: i === rows.length - 1 ? t.text2 : r.delta < 0 ? t.muted : t.brand,
                  },
                })),
                tooltip: {
                  valueFormatter: (_v: unknown, index: number) => {
                    const row = rows[index];
                    return `${row.delta.toFixed(4)} ${unit} (pressure ${row.pressure.toFixed(4)}, friction ${row.viscous.toFixed(4)} ${unit})`;
                  },
                },
              },
            ]
          : [
              {
                name: "pressure",
                type: "bar",
                stack: "d",
                barWidth: 14,
                itemStyle: { color: SERIES.blue, borderRadius: 2 },
                data: data.map((d) => d.pressure),
              },
              {
                name: "viscous",
                type: "bar",
                stack: "d",
                barWidth: 14,
                itemStyle: { color: SERIES.violet, borderRadius: 2 },
                data: data.map((d) => d.viscous),
              },
            ],
    };
  }, [data, unit, view]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <SegmentedControl
        label="Drag presentation"
        value={view}
        onChange={setView}
        options={[
          { value: "waterfall", label: "Waterfall" },
          { value: "split", label: "Pressure / friction" },
        ]}
      />
      <div
        ref={host}
        className="min-h-48 w-full flex-1"
        role="img"
        aria-label={
          view === "waterfall"
            ? "Signed component drag waterfall and computed component sum"
            : "Component pressure and viscous drag"
        }
      />
      <p className="px-1 text-xs text-muted-foreground">
        Simulated component forces in {unit}; negative contributions reduce the running sum. The
        final bar sums components and does not certify agreement with the total-force acceptance
        gate. No uncertainty estimate supplied.
      </p>
    </div>
  );
}
