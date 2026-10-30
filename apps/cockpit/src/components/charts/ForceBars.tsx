"use client";

import { chartTheme, useECharts } from "./useECharts";

export interface ComponentForce {
  name: string;
  pressure: number;
  viscous: number;
}

/** Signed per-component drag split into pressure and viscous parts (spec §4.4a). */
export function ForceBars({ data, unit }: { data: ComponentForce[]; unit: string }) {
  const host = useECharts(() => {
    const t = chartTheme();
    const names = data.map((d) => d.name);
    return {
      animation: false,
      textStyle: { fontFamily: t.mono },
      grid: { left: 92, right: 24, top: 28, bottom: 28 },
      legend: {
        top: 0,
        right: 8,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 6,
        textStyle: { color: t.text2, fontSize: 11 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: t.popover,
        borderColor: t.lineStrong,
        textStyle: { color: t.text, fontSize: 11 },
        valueFormatter: (v: unknown) =>
          typeof v === "number" ? `${v.toFixed(2)} ${unit}` : String(v),
      },
      xAxis: {
        type: "value",
        name: unit,
        nameLocation: "middle",
        nameGap: 20,
        nameTextStyle: { color: t.muted, fontSize: 10 },
        axisLabel: { color: t.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: t.line, opacity: 0.6 } },
      },
      yAxis: {
        type: "category",
        data: names,
        inverse: true,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: t.line } },
        axisLabel: { color: t.text2, fontSize: 11, fontFamily: "inherit" },
      },
      series: [
        {
          name: "pressure",
          type: "bar",
          stack: "d",
          barWidth: 14,
          itemStyle: { color: "#5aa8ff", borderRadius: 2 },
          data: data.map((d) => d.pressure),
        },
        {
          name: "viscous",
          type: "bar",
          stack: "d",
          barWidth: 14,
          itemStyle: { color: "#b18cff", borderRadius: 2 },
          data: data.map((d) => d.viscous),
        },
      ],
    };
  }, [data, unit]);
  return (
    <div
      ref={host}
      className="h-full w-full"
      role="img"
      aria-label="Drag by component, pressure and viscous parts"
    />
  );
}
