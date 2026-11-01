"use client";

import type { DragBuildup } from "@/lib/api";
import { chartTheme, useECharts } from "./useECharts";

const GROUP_COLOURS = ["#5aa8ff", "#3dd6f0", "#b18cff", "#f5a524", "#7ee787", "#ff7b72"];

type Available = Extract<DragBuildup, { wall_shear: "available" }>;

function cumulative(values: number[]): number[] {
  let sum = 0;
  return values.map((value) => (sum += value));
}

function pointerX(params: unknown): number | null {
  if (typeof params !== "object" || params === null || !("axesInfo" in params)) return null;
  const axes = params.axesInfo;
  if (!Array.isArray(axes) || axes.length === 0) return null;
  const first: unknown = axes[0];
  if (typeof first !== "object" || first === null || !("value" in first)) return null;
  const value = first.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Stacked-area drag build-up over x. Hovering the plot moves the linked 3D marker plane;
 * the marker is cleared on leave so a stale plane is never implied.
 */
export function DragBuildupChart({
  data,
  onMarker,
}: {
  data: Available;
  onMarker: (x: number | null) => void;
}) {
  const host = useECharts(
    () => {
      const t = chartTheme();
      const groups = Object.entries(data.groups);
      const mm = data.x_m.map((x) => x * 1000);
      return {
        animation: false,
        textStyle: { fontFamily: t.mono },
        grid: { left: 54, right: 20, top: 22, bottom: 34 },
        legend: {
          top: 0,
          right: 4,
          icon: "roundRect",
          itemWidth: 10,
          itemHeight: 6,
          textStyle: { color: t.text2, fontSize: 10 },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "line", lineStyle: { color: t.brand, width: 1 } },
          backgroundColor: t.popover,
          borderColor: t.lineStrong,
          textStyle: { color: t.text, fontSize: 11 },
          valueFormatter: (v: unknown) =>
            typeof v === "number" ? v.toFixed(5) : typeof v === "string" ? v : "",
        },
        xAxis: {
          type: "value",
          name: "x (mm)",
          nameLocation: "middle",
          nameGap: 22,
          nameTextStyle: { color: t.muted, fontSize: 10 },
          axisLabel: { color: t.muted, fontSize: 10 },
          splitLine: { lineStyle: { color: t.line, opacity: 0.5 } },
        },
        yAxis: {
          type: "value",
          name: "cumulative ΔCd",
          nameTextStyle: { color: t.muted, fontSize: 10 },
          axisLabel: { color: t.muted, fontSize: 10 },
          splitLine: { lineStyle: { color: t.line, opacity: 0.5 } },
        },
        series: groups.map(([name, values], index) => ({
          name: name.replaceAll("_", " "),
          type: "line",
          stack: "cd",
          symbol: "none",
          smooth: false,
          lineStyle: { width: 1, color: GROUP_COLOURS[index % GROUP_COLOURS.length] },
          itemStyle: { color: GROUP_COLOURS[index % GROUP_COLOURS.length] },
          areaStyle: { opacity: 0.34 },
          data: cumulative(values).map((value, i) => [mm[i], value]),
        })),
      };
    },
    [data],
    {
      updateAxisPointer: (params) => {
        const x = pointerX(params);
        if (x !== null) onMarker(x / 1000);
      },
      globalout: () => onMarker(null),
    },
  );
  return (
    <div
      ref={host}
      className="h-full w-full"
      role="img"
      aria-label="Cumulative drag build-up along the car, stacked by component group"
    />
  );
}
