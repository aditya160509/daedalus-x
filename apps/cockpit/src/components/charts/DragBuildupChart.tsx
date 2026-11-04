"use client";

import type { DragBuildup } from "@/lib/api";
import { SERIES_CYCLE } from "@/lib/colormap";
import { chartTheme, useECharts } from "./useECharts";

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
  caption = "Integrated pressure and wall-shear drag over the simulated surface, grouped by part. It is solver output from this case, not a measured force balance; no uncertainty interval or accepted-source claim is shown.",
}: {
  data: Available;
  onMarker: (x: number | null) => void;
  caption?: string;
}) {
  const host = useECharts(
    () => {
      const t = chartTheme();
      const groups = Object.entries(data.groups);
      const mm = data.x_m.map((x) => x * 1000);
      return {
        animation: false,
        textStyle: { fontFamily: t.mono },
        grid: { left: 54, right: 20, top: 32, bottom: 34 },
        toolbox: {
          right: 0,
          top: 0,
          feature: { saveAsImage: { type: "png", name: "drag-buildup", pixelRatio: 2 } },
        },
        legend: {
          top: 0,
          left: 0,
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
          lineStyle: { width: 1, color: SERIES_CYCLE[index % SERIES_CYCLE.length] },
          itemStyle: { color: SERIES_CYCLE[index % SERIES_CYCLE.length] },
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
    <figure className="flex h-full min-h-0 min-w-0 flex-col">
      <div
        ref={host}
        className="min-h-0 w-full flex-1"
        role="img"
        aria-label="Cumulative drag build-up along the car, stacked by component group"
      />
      <figcaption className="px-2 pt-1 text-2xs leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
