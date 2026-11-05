"use client";

import { BarChart, CustomChart, LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  ToolboxComponent,
  TooltipComponent,
  type ToolboxComponentOption,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([
  LineChart,
  BarChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  DataZoomComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  ToolboxComponent,
  CanvasRenderer,
]);

export { echarts };

/** Read a design token (CSS custom property on :root) for chart styling. */
function token(name: string): string {
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
    ok: token("--ok"),
    risk: token("--risk"),
    popover: token("--popover"),
    lineStrong: token("--line-strong"),
    mono: token("--font-jetbrains"),
  };
}

type ChartTheme = ReturnType<typeof chartTheme>;

/** One tooltip treatment: graphite card, hairline border, mono numbers, soft shadow. */
export function chartTooltip(t: ChartTheme) {
  return {
    backgroundColor: t.popover,
    borderColor: t.lineStrong,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: t.text, fontSize: 11, fontFamily: t.mono },
    extraCssText: "border-radius:8px;box-shadow:0 10px 30px -12px rgba(0,0,0,0.7);",
  };
}

/** Leave the data, remove the chart junk: no axis spine, no ticks, dashed hairlines. */
export function chartAxis(t: ChartTheme) {
  return {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 10, fontFamily: t.mono },
    splitLine: { lineStyle: { color: t.line, opacity: 0.55, type: "dashed" } },
  };
}

const linkedCharts = new Map<string, number>();

type ChartOption = echarts.EChartsCoreOption & { toolbox?: ToolboxComponentOption };

export function withPngExport(option: ChartOption): ChartOption {
  const toolbox = option.toolbox;
  return {
    ...option,
    toolbox: {
      right: 0,
      top: 0,
      ...toolbox,
      feature: {
        ...toolbox?.feature,
        saveAsImage: { type: "png", pixelRatio: 2, ...toolbox?.feature?.saveAsImage },
      },
    },
  };
}

/**
 * Owns one ECharts instance bound to a div. `build` receives the element height so layouts
 * that need pixel geometry stay correct; it re-runs on resize and when `deps` change.
 */
export function useECharts(
  build: (el: HTMLDivElement) => ChartOption,
  deps: ReadonlyArray<unknown>,
  events?: Record<string, (params: unknown) => void>,
  cursorGroup?: string,
) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const builder = useRef(build);
  const handlers = useRef(events);

  // Declared first so the refs are current before the effects below read them.
  useEffect(() => {
    builder.current = build;
    handlers.current = events;
  });

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
      instance.setOption(withPngExport(builder.current(el)), { notMerge: true });
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
    const instance = chart.current;
    if (!instance || !cursorGroup) return;
    instance.group = cursorGroup;
    linkedCharts.set(cursorGroup, (linkedCharts.get(cursorGroup) ?? 0) + 1);
    echarts.connect(cursorGroup);
    return () => {
      const remaining = (linkedCharts.get(cursorGroup) ?? 1) - 1;
      if (remaining) linkedCharts.set(cursorGroup, remaining);
      else {
        linkedCharts.delete(cursorGroup);
        echarts.disconnect(cursorGroup);
      }
    };
  }, [cursorGroup]);

  useEffect(() => {
    const el = host.current;
    if (chart.current && el)
      chart.current.setOption(withPngExport(builder.current(el)), { notMerge: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return host;
}
