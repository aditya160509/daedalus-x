"use client";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import "./TelemetryChart.css";
import { chartTheme } from "./useECharts";
import { nearestIndex, stepCursor, sampleAt } from "@/components/race/raceMath";

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
const LEFT = 64;
const RIGHT = 16;

const NO_MARKERS: Array<{ t: number; label: string }> = [];
const NO_ZOOM: Record<string, number> = {};

/** uPlot values use plot-relative CSS pixels; overlay lines use the whole lane. */
function pixelForTime(chart: uPlot, t: number): number | null {
  const offset = chart.over.getBoundingClientRect().left - chart.root.getBoundingClientRect().left;
  const value = chart.valToPos(t, "x") + offset;
  return Number.isFinite(value) ? value : null;
}
function timeForPixel(chart: uPlot, x: number, _y: number): number | null {
  const offset = chart.over.getBoundingClientRect().left - chart.root.getBoundingClientRect().left;
  const value = chart.posToVal(x - offset, "x");
  return Number.isFinite(value) ? value : null;
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
 * overlays so moving them never re-parses 12k points; uPlot only redraws when the data,
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
  const chart = useRef<uPlot | null>(null);
  const plots = useRef<uPlot[]>([]);
  const callbacks = useRef(onCursor);
  useEffect(() => {
    callbacks.current = onCursor;
  }, [onCursor]);
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
    if (!el || time.length < 2 || tracks.length === 0) return;
    const theme = chartTheme();
    const instances: uPlot[] = [];
    const observers: ResizeObserver[] = [];
    el.style.display = "grid";
    el.style.gridTemplateRows = `repeat(${tracks.length}, minmax(110px, 1fr))`;
    el.style.gap = "10px";
    tracks.forEach((track, laneIndex) => {
      const lane = document.createElement("div");
      lane.className = "daedalus-telemetry min-w-0 overflow-hidden";
      el.appendChild(lane);
      const data: uPlot.AlignedData = [time, ...track.series.map((series) => series.values)];
      const series: uPlot.Series[] = [
        {},
        ...track.series.map((item) => ({
          label: `${item.label} [${track.unit}]`,
          stroke: item.color ?? track.color,
          width: 1.5,
          dash: item.dashed ? [4, 3] : undefined,
          points: { show: false },
          spanGaps: false,
        })),
      ];
      const bands: uPlot.Band[] = [];
      if (band && track.id === bandTrackId) {
        const lower = data.length;
        data.push(time.map((t) => sampleAt(t, band.time, band.p5)));
        data.push(time.map((t) => sampleAt(t, band.time, band.p95)));
        series.push(
          { label: "p5", stroke: "transparent", width: 0, points: { show: false } },
          { label: "p95", stroke: "transparent", width: 0, points: { show: false } },
        );
        bands.push({ series: [lower + 1, lower], fill: "rgba(61,214,240,0.14)" });
      }
      const range = yRange(
        track,
        yZoom[track.id] ?? 1,
        band && track.id === bandTrackId ? band : null,
      );
      const instance = new uPlot(
        {
          title: `${track.name} [${track.unit}]`,
          width: Math.max(150, el.clientWidth),
          height: Math.max(92, (el.clientHeight - 10 * (tracks.length - 1)) / tracks.length - 16),
          padding: [4, RIGHT, 0, 0],
          legend: { show: false },
          scales: {
            x: { time: false, range: [time[0], time[time.length - 1]] },
            y: { range: [range.min, range.max] },
          },
          series,
          bands,
          cursor: {
            sync: { key: "daedalus-telemetry", scales: ["x", null] },
            drag: { x: true, y: false, setScale: true },
            points: { show: false },
          },
          axes: [
            {
              show: laneIndex === tracks.length - 1,
              stroke: theme.muted,
              size: 28,
              grid: { stroke: theme.line, width: 0.5 },
              ticks: { show: false },
              font: "10px monospace",
              values: (_u, ticks) => ticks.map((value) => `${value.toFixed(2)} s`),
            },
            {
              stroke: theme.muted,
              size: LEFT,
              grid: { stroke: theme.line, width: 0.5 },
              ticks: { show: false },
              font: "10px monospace",
              values: (_u, ticks) => ticks.map((value) => String(Number(value.toPrecision(3)))),
            },
          ],
          hooks: {
            setCursor: [
              (u) => {
                if (u.cursor.left == null || u.cursor.left < 0) return;
                const value = u.posToVal(u.cursor.left, "x");
                if (Number.isFinite(value)) {
                  latest.current = Math.min(time[time.length - 1], Math.max(time[0], value));
                  if (pending.current === null)
                    pending.current = requestAnimationFrame(() => {
                      pending.current = null;
                      callbacks.current(latest.current);
                    });
                }
              },
            ],
            setScale: [
              (u, key) => {
                if (key !== "x") return;
                const { min, max } = u.scales.x;
                if (min == null || max == null) return;
                for (const other of instances)
                  if (other !== u && (other.scales.x.min !== min || other.scales.x.max !== max))
                    other.setScale("x", { min, max });
                placeRef.current();
              },
            ],
            draw: [
              (u) => {
                const ctx = u.ctx,
                  ratio = window.devicePixelRatio || 1;
                ctx.save();
                ctx.strokeStyle = theme.muted;
                ctx.fillStyle = theme.muted;
                ctx.lineWidth = ratio * 0.5;
                ctx.setLineDash([ratio * 3, ratio * 3]);
                ctx.font = `${9 * ratio}px monospace`;
                for (const marker of markers) {
                  const x = u.valToPos(marker.t, "x", true) + u.bbox.left;
                  if (x < u.bbox.left || x > u.bbox.left + u.bbox.width) continue;
                  ctx.beginPath();
                  ctx.moveTo(x, u.bbox.top);
                  ctx.lineTo(x, u.bbox.top + u.bbox.height);
                  ctx.stroke();
                  if (laneIndex === 0)
                    ctx.fillText(marker.label, x + 3 * ratio, u.bbox.top + 10 * ratio);
                }
                ctx.restore();
              },
            ],
          },
        },
        data,
        lane,
      );
      instances.push(instance);
      const observer = new ResizeObserver(() => {
        instance.setSize({
          width: Math.max(150, el.clientWidth),
          height: Math.max(92, (el.clientHeight - 10 * (tracks.length - 1)) / tracks.length - 16),
        });
        placeRef.current();
      });
      observer.observe(el);
      observers.push(observer);
    });
    plots.current = instances;
    chart.current = instances[0] ?? null;
    drawRef.current = () => {
      for (const instance of instances) instance.redraw();
    };
    placeRef.current();
    return () => {
      for (const observer of observers) observer.disconnect();
      for (const instance of instances) instance.destroy();
      el.replaceChildren();
      plots.current = [];
      chart.current = null;
    };
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

  const exportPng = () => {
    const current = plots.current;
    if (!current.length) return;
    const ratio = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(...current.map((plot) => plot.ctx.canvas.width));
    canvas.height = current.reduce(
      (sum, plot) => sum + plot.ctx.canvas.height + 22 * ratio,
      40 * ratio,
    );
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#0b0b0c";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ececee";
    context.font = `${12 * ratio}px monospace`;
    context.fillText("Daedalus X · predicted model telemetry", 16 * ratio, 24 * ratio);
    let y = 40 * ratio;
    current.forEach((plot, index) => {
      context.fillStyle = "#8a8a93";
      context.font = `${10 * ratio}px monospace`;
      context.fillText(
        `${tracks[index].name} [${tracks[index].unit}]`,
        LEFT * ratio,
        y + 12 * ratio,
      );
      context.drawImage(plot.ctx.canvas, 0, y + 20 * ratio);
      y += plot.ctx.canvas.height + 22 * ratio;
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "daedalus-race-telemetry.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    });
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
      <div className="absolute top-0 right-2 z-10 flex gap-1">
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            const min = time[0],
              max = time[time.length - 1];
            if (min !== undefined && max !== undefined)
              for (const plot of plots.current) plot.setScale("x", { min, max });
          }}
        >
          Reset zoom
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={exportPng}
          disabled={time.length < 2 || tracks.length === 0}
        >
          PNG
        </Button>
      </div>
      <div ref={host} className="h-full min-h-110 w-full" />
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
