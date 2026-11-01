"use client";

import { useCallback, useEffect, useRef } from "react";
import { chartTheme, echarts } from "./useECharts";
import { nearestIndex, stepCursor } from "@/components/race/raceMath";

interface TelemetrySeries {
  label: string;
  values: number[];
  color?: string;
  dashed?: boolean;
}

export interface TelemetryTrack {
  id: string;
  name: string;
  unit: string;
  color: string;
  series: TelemetrySeries[];
}

export interface TelemetryBand {
  time: number[];
  p5: number[];
  p50: number[];
  p95: number[];
}

export interface DeltaCursors {
  a: number;
  b: number;
}

const TOP = 8;
const BOTTOM = 46;
const GAP = 14;
const LEFT = 64;
const RIGHT = 16;

const NO_MARKERS: Array<{ t: number; label: string }> = [];
const NO_ZOOM: Record<string, number> = {};

/** Pixel position for a time on the shared x axis; null when ECharts has no layout yet. */
function pixelForTime(chart: echarts.ECharts, t: number): number | null {
  const value: unknown = chart.convertToPixel({ xAxisIndex: 0 }, [t, 0]);
  return firstNumber(value);
}

function timeForPixel(chart: echarts.ECharts, x: number, y: number): number | null {
  const value: unknown = chart.convertFromPixel({ xAxisIndex: 0 }, [x, y]);
  return firstNumber(value);
}

function firstNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    const list = value as unknown[];
    const head = list[0];
    return typeof head === "number" && Number.isFinite(head) ? head : null;
  }
  return null;
}

function yRange(track: TelemetryTrack, zoom: number, band?: TelemetryBand | null) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const add = (v: number) => {
    if (!Number.isFinite(v)) return;
    if (v < min) min = v;
    if (v > max) max = v;
  };
  for (const series of track.series) for (const v of series.values) add(v);
  if (band) {
    for (const v of band.p5) add(v);
    for (const v of band.p95) add(v);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * 0.08;
  const lo = min - pad;
  const hi = max + pad;
  const mid = (lo + hi) / 2;
  const half = (hi - lo) / 2 / Math.max(zoom, 1);
  return { min: mid - half, max: mid + half };
}

/**
 * ATLAS-style stacked channels on one shared time axis. The cursor, A and B lines are DOM
 * overlays so moving them never re-parses 12k points; ECharts only redraws when the data,
 * channel order or y-zoom changes.
 */
export function TelemetryChart({
  time,
  tracks,
  markers = NO_MARKERS,
  band,
  bandTrackId,
  yZoom = NO_ZOOM,
  cursor,
  delta,
  onCursor,
  onDelta,
}: {
  time: number[];
  tracks: TelemetryTrack[];
  markers?: Array<{ t: number; label: string }>;
  band?: TelemetryBand | null;
  bandTrackId?: string;
  yZoom?: Record<string, number>;
  cursor: number;
  delta: DeltaCursors;
  onCursor: (t: number) => void;
  onDelta: (which: "a" | "b", t: number) => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const cursorLine = useRef<HTMLDivElement>(null);
  const cursorChip = useRef<HTMLDivElement>(null);
  const aLine = useRef<HTMLDivElement>(null);
  const aChip = useRef<HTMLDivElement>(null);
  const bLine = useRef<HTMLDivElement>(null);
  const bChip = useRef<HTMLDivElement>(null);
  const drag = useRef<"a" | "b" | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const placeRef = useRef<() => void>(() => {});
  const pending = useRef<number | null>(null);
  const latest = useRef(cursor);

  useEffect(() => {
    latest.current = cursor;
  }, [cursor]);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const instance = echarts.init(el, undefined, { renderer: "canvas" });
    chart.current = instance;
    const onZoom = () => placeRef.current();
    instance.on("dataZoom", onZoom);
    const ro = new ResizeObserver(() => {
      instance.resize();
      drawRef.current();
      placeRef.current();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      instance.off("dataZoom", onZoom);
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    drawRef.current = () => {
      const instance = chart.current;
      const el = host.current;
      if (!instance || !el) return;
      const t = chartTheme();
      const n = tracks.length;
      if (n === 0) {
        instance.clear();
        return;
      }
      const height = Math.max(40, (el.clientHeight - TOP - BOTTOM - GAP * (n - 1)) / n);
      const all = tracks.map((_, i) => i);
      const series = tracks.flatMap((track, i) => {
        const out: Record<string, unknown>[] = [];
        if (band && track.id === bandTrackId) {
          out.push({
            name: `${track.name} p5`,
            type: "line",
            xAxisIndex: i,
            yAxisIndex: i,
            data: band.time.map((x, k) => [x, band.p5[k]]),
            stack: "fan",
            showSymbol: false,
            silent: true,
            lineStyle: { opacity: 0 },
            areaStyle: { opacity: 0 },
            z: 0,
          });
          out.push({
            name: `${track.name} p5–p95`,
            type: "line",
            xAxisIndex: i,
            yAxisIndex: i,
            data: band.time.map((x, k) => [x, band.p95[k] - band.p5[k]]),
            stack: "fan",
            showSymbol: false,
            silent: true,
            lineStyle: { opacity: 0 },
            areaStyle: { color: t.brand, opacity: 0.16 },
            z: 0,
          });
        }
        track.series.forEach((s, j) => {
          out.push({
            name: `${s.label} [${track.unit}]`,
            type: "line",
            xAxisIndex: i,
            yAxisIndex: i,
            showSymbol: false,
            sampling: "lttb",
            lineStyle: {
              width: 1.5,
              color: s.color ?? track.color,
              type: s.dashed ? "dashed" : "solid",
            },
            itemStyle: { color: s.color ?? track.color },
            data: time.map((x, k) => [x, s.values[k]]),
            z: 3,
            markLine:
              j === 0 && markers.length
                ? {
                    silent: true,
                    symbol: "none",
                    lineStyle: { color: t.muted, type: "dotted" },
                    label: {
                      show: i === 0,
                      color: t.text2,
                      fontSize: 10,
                      formatter: (p: { name?: string }) => p.name ?? "",
                    },
                    data: markers.map((m) => ({ xAxis: m.t, name: m.label })),
                  }
                : undefined,
          });
        });
        return out;
      });

      instance.setOption(
        {
          animation: false,
          textStyle: { fontFamily: t.mono },
          grid: tracks.map((_, i) => ({
            left: LEFT,
            right: RIGHT,
            top: TOP + i * (height + GAP),
            height,
          })),
          xAxis: tracks.map((_, i) => ({
            type: "value",
            gridIndex: i,
            min: time[0],
            max: time[time.length - 1],
            axisLine: { lineStyle: { color: t.line } },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: t.line, opacity: 0.5 } },
            axisLabel: {
              show: i === n - 1,
              color: t.muted,
              fontSize: 10,
              formatter: (v: number) => `${v.toFixed(2)} s`,
            },
          })),
          yAxis: tracks.map((track, i) => {
            const range = yRange(
              track,
              yZoom[track.id] ?? 1,
              band && track.id === bandTrackId ? band : null,
            );
            return {
              type: "value",
              gridIndex: i,
              min: range.min,
              max: range.max,
              name: `${track.name} [${track.unit}]`,
              nameLocation: "middle",
              nameGap: 46,
              nameTextStyle: { color: t.text2, fontSize: 10 },
              axisLine: { show: false },
              splitNumber: 3,
              splitLine: { lineStyle: { color: t.line, opacity: 0.5 } },
              axisLabel: { color: t.muted, fontSize: 10 },
            };
          }),
          dataZoom: [
            { type: "inside", xAxisIndex: all, filterMode: "none" },
            {
              type: "slider",
              xAxisIndex: all,
              height: 18,
              bottom: 6,
              borderColor: t.line,
              fillerColor: "rgba(34,211,238,0.12)",
              handleStyle: { color: t.brand },
              textStyle: { color: t.muted, fontSize: 10 },
              dataBackground: { lineStyle: { color: t.line }, areaStyle: { color: t.line } },
            },
          ],
          series,
        },
        { notMerge: true },
      );
      placeRef.current();
    };
    drawRef.current();
  }, [time, tracks, markers, band, bandTrackId, yZoom]);

  useEffect(() => {
    placeRef.current = () => {
      const instance = chart.current;
      const el = host.current;
      if (!instance || !el) return;
      const width = el.clientWidth;
      const place = (line: HTMLDivElement | null, chip: HTMLDivElement | null, t: number) => {
        if (!line && !chip) return;
        const x = pixelForTime(instance, t);
        const visible = x !== null && x >= LEFT - 1 && x <= width - RIGHT + 1;
        for (const node of [line, chip]) {
          if (!node) continue;
          node.style.visibility = visible ? "visible" : "hidden";
          if (visible) node.style.transform = `translateX(${x}px) translateX(-50%)`;
        }
      };
      place(cursorLine.current, cursorChip.current, cursor);
      place(aLine.current, aChip.current, delta.a);
      place(bLine.current, bChip.current, delta.b);
    };
    placeRef.current();
  }, [cursor, delta]);

  const emitCursor = useCallback(
    (t: number) => {
      latest.current = t;
      if (pending.current !== null) return;
      pending.current = requestAnimationFrame(() => {
        pending.current = null;
        onCursor(latest.current);
      });
    },
    [onCursor],
  );

  useEffect(
    () => () => {
      if (pending.current !== null) cancelAnimationFrame(pending.current);
    },
    [],
  );

  const timeForEvent = (event: React.PointerEvent<HTMLDivElement>): number | null => {
    const instance = chart.current;
    const el = host.current;
    if (!instance || !el) return null;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < LEFT || x > rect.width - RIGHT || y < TOP || y > rect.height - 40) return null;
    const t = timeForPixel(instance, x, y);
    if (t === null) return null;
    return Math.min(Math.max(t, time[0]), time[time.length - 1]);
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const t = timeForEvent(event);
    if (t === null) return;
    if (drag.current) onDelta(drag.current, t);
    else emitCursor(t);
  };

  const startDrag = (which: "a" | "b") => (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    drag.current = which;
    wrapper.current?.setPointerCapture(event.pointerId);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    if (wrapper.current?.hasPointerCapture(event.pointerId)) {
      wrapper.current.releasePointerCapture(event.pointerId);
    }
  };

  const key = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const n = time.length;
    if (n === 0) return;
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onCursor(event.key === "Home" ? time[0] : time[n - 1]);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = (event.shiftKey ? 10 : 1) * (event.key === "ArrowRight" ? 1 : -1);
    const next = stepCursor(nearestIndex(cursor, time), step, n);
    if (next >= 0) onCursor(time[next]);
  };

  const keyDelta = (which: "a" | "b") => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    const current = which === "a" ? delta.a : delta.b;
    const step = (event.shiftKey ? 10 : 1) * (event.key === "ArrowRight" ? 1 : -1);
    const next = stepCursor(nearestIndex(current, time), step, time.length);
    if (next >= 0) onDelta(which, time[next]);
  };

  return (
    <div
      ref={wrapper}
      role="slider"
      aria-orientation="horizontal"
      aria-label="Stacked telemetry channels. Left and right arrows move the cursor; shift moves ten samples."
      aria-valuemin={time[0] ?? 0}
      aria-valuemax={time[time.length - 1] ?? 1}
      aria-valuenow={cursor}
      aria-valuetext={`${cursor.toFixed(3)} seconds`}
      tabIndex={0}
      className="relative h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onPointerMove={move}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={key}
    >
      <div ref={host} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          ref={cursorLine}
          className="absolute top-2 bottom-10 left-0 w-px bg-brand/80"
          aria-hidden
        />
        <div
          ref={cursorChip}
          className="absolute top-1 left-0 rounded-sm border border-brand/40 bg-card/90 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-brand backdrop-blur"
          aria-hidden
        >
          {cursor.toFixed(3)} s
        </div>
        <div ref={aLine} className="absolute top-2 bottom-10 left-0 w-px bg-risk/80" aria-hidden />
        <div
          ref={aChip}
          role="slider"
          tabIndex={0}
          aria-label="Delta cursor A"
          aria-valuemin={time[0]}
          aria-valuemax={time[time.length - 1]}
          aria-valuenow={delta.a}
          aria-valuetext={`${delta.a.toFixed(3)} seconds`}
          onPointerDown={startDrag("a")}
          onKeyDown={keyDelta("a")}
          className="pointer-events-auto absolute top-1 left-0 cursor-ew-resize rounded-sm border border-risk/50 bg-card/90 px-1.5 py-0.5 font-mono text-[10px] text-risk backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          A
        </div>
        <div ref={bLine} className="absolute top-2 bottom-10 left-0 w-px bg-ok/80" aria-hidden />
        <div
          ref={bChip}
          role="slider"
          tabIndex={0}
          aria-label="Delta cursor B"
          aria-valuemin={time[0]}
          aria-valuemax={time[time.length - 1]}
          aria-valuenow={delta.b}
          aria-valuetext={`${delta.b.toFixed(3)} seconds`}
          onPointerDown={startDrag("b")}
          onKeyDown={keyDelta("b")}
          className="pointer-events-auto absolute top-1 left-0 cursor-ew-resize rounded-sm border border-ok/50 bg-card/90 px-1.5 py-0.5 font-mono text-[10px] text-ok backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          B
        </div>
      </div>
    </div>
  );
}
