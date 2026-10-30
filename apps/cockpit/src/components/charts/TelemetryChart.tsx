"use client";

import { LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export interface TelemetryTrack {
  name: string;
  unit: string;
  color: string;
  series: Array<{ label: string; values: number[]; color?: string; dashed?: boolean }>;
}

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

/**
 * Stacked telemetry tracks sharing one time axis, one cursor and one zoom range —
 * the motorsport channel view (spec §7.7).
 */
export function TelemetryChart({
  time,
  tracks,
  markers = [],
}: {
  time: number[];
  tracks: TelemetryTrack[];
  markers?: Array<{ t: number; label: string }>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const render = useRef<() => void>(() => {});

  useEffect(() => {
    if (!host.current) return;
    const instance = echarts.init(host.current, undefined, { renderer: "canvas" });
    chart.current = instance;
    const ro = new ResizeObserver(() => {
      instance.resize();
      render.current();
    });
    ro.observe(host.current);
    return () => {
      ro.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    render.current = () => draw();
    draw();

    function draw() {
      const instance = chart.current;
      const el = host.current;
      if (!instance || !el) return;
      const line = css("--color-line");
      const muted = css("--color-muted");
      const text2 = css("--color-text-2");
      const accent = css("--color-accent");
      const n = tracks.length;
      const top = 8;
      const bottom = 46;
      const gap = 14;
      const height = Math.max(40, (el.clientHeight - top - bottom - gap * (n - 1)) / n);
      const axisIdx = tracks.map((_, i) => i);

      instance.setOption(
        {
          animation: false,
          textStyle: { fontFamily: css("--font-mono") },
          axisPointer: { link: [{ xAxisIndex: "all" }], lineStyle: { color: accent, width: 1 } },
          tooltip: {
            trigger: "axis",
            backgroundColor: css("--color-surface-2"),
            borderColor: css("--color-line-strong"),
            textStyle: { color: css("--color-text"), fontSize: 11 },
            valueFormatter: (v: unknown) => (typeof v === "number" ? v.toPrecision(4) : String(v)),
          },
          grid: tracks.map((_, i) => ({
            left: 64,
            right: 16,
            top: top + i * (height + gap),
            height,
          })),
          xAxis: tracks.map((_, i) => ({
            type: "value",
            gridIndex: i,
            min: time[0],
            max: time[time.length - 1],
            axisLine: { lineStyle: { color: line } },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: line, opacity: 0.5 } },
            axisLabel: {
              show: i === n - 1,
              color: muted,
              fontSize: 10,
              formatter: (v: number) => `${v.toFixed(2)} s`,
            },
          })),
          yAxis: tracks.map((t, i) => ({
            type: "value",
            gridIndex: i,
            name: `${t.name} [${t.unit}]`,
            nameLocation: "middle",
            nameGap: 46,
            nameTextStyle: { color: text2, fontSize: 10 },
            axisLine: { show: false },
            splitNumber: 3,
            splitLine: { lineStyle: { color: line, opacity: 0.5 } },
            axisLabel: { color: muted, fontSize: 10 },
          })),
          dataZoom: [
            { type: "inside", xAxisIndex: axisIdx, filterMode: "none" },
            {
              type: "slider",
              xAxisIndex: axisIdx,
              height: 18,
              bottom: 6,
              borderColor: line,
              fillerColor: "rgba(34,211,238,0.12)",
              handleStyle: { color: accent },
              textStyle: { color: muted, fontSize: 10 },
              dataBackground: { lineStyle: { color: line }, areaStyle: { color: line } },
            },
          ],
          series: tracks.flatMap((t, i) =>
            t.series.map((s, j) => ({
              name: `${s.label} [${t.unit}]`,
              type: "line",
              xAxisIndex: i,
              yAxisIndex: i,
              showSymbol: false,
              sampling: "lttb",
              lineStyle: {
                width: 1.5,
                color: s.color ?? t.color,
                type: s.dashed ? "dashed" : "solid",
              },
              itemStyle: { color: s.color ?? t.color },
              data: time.map((x, k) => [x, s.values[k]]),
              markLine:
                j === 0 && markers.length
                  ? {
                      silent: true,
                      symbol: "none",
                      lineStyle: { color: muted, type: "dotted" },
                      label: {
                        show: i === 0,
                        color: text2,
                        fontSize: 10,
                        formatter: (p: { name?: string }) => p.name ?? "",
                      },
                      data: markers.map((m) => ({ xAxis: m.t, name: m.label })),
                    }
                  : undefined,
            })),
          ),
        },
        { notMerge: true },
      );
    }
  }, [time, tracks, markers]);

  return <div ref={host} className="h-full w-full" role="img" aria-label="Telemetry channels" />;
}
