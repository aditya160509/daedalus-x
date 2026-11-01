"use client";

import { BarChart, LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  DataZoomComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

export { echarts };

/** Read a design token (CSS custom property on :root) for chart styling. */
export function token(name: string): string {
  if (typeof document === "undefined") return "#888";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

export function chartTheme() {
  return {
    line: token("--border"),
    muted: token("--muted-foreground"),
    text: token("--foreground"),
    text2: token("--text-2"),
    brand: token("--brand"),
    popover: token("--popover"),
    lineStrong: token("--line-strong"),
    mono: token("--font-jetbrains"),
  };
}

/**
 * Owns one ECharts instance bound to a div. `build` receives the element height so layouts
 * that need pixel geometry stay correct; it re-runs on resize and when `deps` change.
 */
export function useECharts(
  build: (el: HTMLDivElement) => echarts.EChartsCoreOption,
  deps: ReadonlyArray<unknown>,
  events?: Record<string, (params: unknown) => void>,
) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const builder = useRef(build);
  builder.current = build;
  const handlers = useRef(events);
  handlers.current = events;

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const instance = echarts.init(el, undefined, { renderer: "canvas" });
    chart.current = instance;
    const names = Object.keys(handlers.current ?? {});
    const bound = names.map((name) => {
      const listener = (params: unknown) => handlers.current?.[name]?.(params);
      instance.on(name, listener);
      return [name, listener] as const;
    });
    const ro = new ResizeObserver(() => {
      instance.resize();
      instance.setOption(builder.current(el), { notMerge: true });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      for (const [name, listener] of bound) instance.off(name, listener);
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const el = host.current;
    if (chart.current && el) chart.current.setOption(builder.current(el), { notMerge: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return host;
}
