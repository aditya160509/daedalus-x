"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Maximize2, Minimize2, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BarChart } from "echarts/charts";
import { MarkAreaComponent, MarkLineComponent } from "echarts/components";
import {
  chartAxis,
  chartTheme,
  chartTooltip,
  echarts,
  useECharts,
} from "@/components/charts/useECharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPredictions, simulateRace } from "@/lib/api";
import { estimateThrust } from "@/lib/thrust";
import { cn } from "@/lib/utils";
import { DEFAULT_CAR, DEFAULT_ESTIMATE } from "../raceInputsState";

type Run = { id: number; lane: "A" | "B"; car_s: number; reaction_s: number; at: string };
const KEY = "daedalus.raceday.runs";

function load(): Run[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Run[];
  } catch {
    return [];
  }
}

echarts.use([BarChart, MarkLineComponent, MarkAreaComponent]);

/** Every run as a bar against the prediction band: the stadium history strip. */
function HistoryStrip({
  runs,
  predicted,
  low,
  high,
}: {
  runs: Run[];
  predicted: number | null;
  low: number | null;
  high: number | null;
}) {
  const host = useECharts(() => {
    const t = chartTheme();
    const best = Math.min(...runs.map((r) => r.car_s));
    return {
      animation: false,
      grid: { left: 44, right: 16, top: 12, bottom: 24 },
      tooltip: {
        ...chartTooltip(t),
        trigger: "axis",
        valueFormatter: (v: number) => `${v.toFixed(3)} s`,
      },
      xAxis: { type: "category", data: runs.map((r, i) => `${i + 1}${r.lane}`), ...chartAxis(t) },
      yAxis: {
        type: "value",
        min: (v: { min: number }) => Math.floor((v.min - 0.05) * 20) / 20,
        ...chartAxis(t),
        axisLabel: { color: t.muted, fontSize: 10, formatter: (v: number) => v.toFixed(2) },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 18,
          data: runs.map((r) => ({
            value: r.car_s,
            itemStyle: { borderRadius: 2, color: r.car_s === best ? "#b18cff" : t.lineStrong },
          })),
          markLine:
            predicted != null
              ? {
                  symbol: "none",
                  silent: true,
                  lineStyle: { color: t.brand, type: "dashed" },
                  label: { color: t.muted, formatter: "pred" },
                  data: [{ yAxis: predicted }],
                }
              : undefined,
          markArea:
            low != null && high != null
              ? {
                  silent: true,
                  itemStyle: { color: t.brand, opacity: 0.08 },
                  data: [[{ yAxis: low }, { yAxis: high }]],
                }
              : undefined,
        },
      ],
    };
  }, [runs, predicted, low, high]);
  return <div ref={host} className="h-40 w-full" />;
}

function fmt(v: number | null | undefined, d = 3) {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(d);
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** One big broadcast number. */
function Big({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "best" | "good" | "slow";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card px-5 py-4">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "tabular font-mono text-5xl leading-none font-semibold tracking-[-0.04em] xl:text-6xl",
            tone === "best" && "text-[#b18cff]",
            tone === "good" && "text-ok",
            tone === "slow" && "text-risk",
          )}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-base text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

/**
 * Race-day mode and stadium (TV) view: type each timed run, compare it with the prediction,
 * and go fullscreen on a projector. Runs stay in this browser until exported.
 */
export function RaceDay() {
  const root = useRef<HTMLDivElement>(null);
  const [runs, setRuns] = useState<Run[]>(load);
  const [car, setCar] = useState("");
  const [reaction, setReaction] = useState("");
  const [lane, setLane] = useState<"A" | "B">("A");
  const [full, setFull] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(runs));
    } catch {
      /* storage unavailable: keep in memory */
    }
  }, [runs]);
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const model = useQuery({
    queryKey: ["raceday-model"],
    queryFn: () =>
      simulateRace({
        model: "M2",
        mass_kg: DEFAULT_CAR.massG / 1000,
        track_length_m: DEFAULT_CAR.trackM,
        thrust: {
          ...estimateThrust(DEFAULT_ESTIMATE),
          provenance: "estimated",
          source: "estimate",
        },
        cda_m2: DEFAULT_CAR.cdaCm2 / 1e4,
        crr: DEFAULT_CAR.crr,
        rho_kg_m3: DEFAULT_CAR.rho,
        input_provenance: "estimated",
      }),
  });
  const preds = useQuery({ queryKey: ["predictions"], queryFn: listPredictions });
  const sealed = preds.data?.at(-1);
  const predicted = sealed?.predicted.value ?? model.data?.time_s ?? null;
  const low = sealed?.interval_low.value ?? null;
  const high = sealed?.interval_high.value ?? null;

  const best = runs.length ? Math.min(...runs.map((r) => r.car_s)) : null;
  const last = runs.at(-1);
  const mean = runs.length ? runs.reduce((s, r) => s + r.car_s, 0) / runs.length : null;
  const meanReaction = runs.length
    ? runs.reduce((s, r) => s + r.reaction_s, 0) / runs.length
    : null;
  const inBand = (t: number) => low != null && high != null && t >= low && t <= high;

  function add() {
    const c = Number(car);
    const r = Number(reaction || 0);
    if (!Number.isFinite(c) || c <= 0) return;
    setRuns((xs) => [
      ...xs,
      { id: Date.now(), lane, car_s: c, reaction_s: r, at: new Date().toISOString() },
    ]);
    setCar("");
    setReaction("");
  }

  function toggleFull() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen();
  }

  const csv = () =>
    ["run,lane,car_s,reaction_s,total_s,delta_vs_pred_s,at"]
      .concat(
        runs.map((r, i) =>
          [
            i + 1,
            r.lane,
            r.car_s,
            r.reaction_s,
            (r.car_s + r.reaction_s).toFixed(4),
            predicted != null ? (r.car_s - predicted).toFixed(4) : "",
            r.at,
          ].join(","),
        ),
      )
      .join("\n");

  return (
    <div
      ref={root}
      className={cn("flex h-full flex-col gap-4 overflow-y-auto bg-background p-4", full && "p-8")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-sm font-medium">Race day</h1>
        <span className="text-xs text-muted-foreground">
          Predicted {fmt(predicted)} s
          {low != null && high != null ? ` · band ${fmt(low)}–${fmt(high)} s` : " · model estimate"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!runs.length}
            onClick={() => download("race-day.csv", csv(), "text/csv")}
          >
            <Download /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!runs.length}
            onClick={() =>
              download(
                "race-day.json",
                JSON.stringify({ predicted, low, high, runs }, null, 2),
                "application/json",
              )
            }
          >
            <Download /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFull}>
            {full ? <Minimize2 /> : <Maximize2 />} {full ? "Exit" : "Stadium view"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Big
          label="Last run"
          value={fmt(last?.car_s)}
          unit="s"
          tone={
            last && best != null && last.car_s === best
              ? "best"
              : last && inBand(last.car_s)
                ? "good"
                : last
                  ? "slow"
                  : undefined
          }
        />
        <Big label="Best" value={fmt(best)} unit="s" tone={best != null ? "best" : undefined} />
        <Big
          label="vs prediction"
          value={
            last && predicted != null
              ? `${last.car_s - predicted >= 0 ? "+" : ""}${((last.car_s - predicted) * 1000).toFixed(0)}`
              : "—"
          }
          unit="ms"
          tone={last ? (inBand(last.car_s) ? "good" : "slow") : undefined}
        />
        <Big
          label="Reaction"
          value={fmt(last?.reaction_s)}
          unit="s"
          tone={
            last
              ? last.reaction_s < 0.2
                ? "good"
                : last.reaction_s < 0.3
                  ? undefined
                  : "slow"
              : undefined
          }
        />
      </div>

      {runs.length > 0 && (
        <section className="rounded-lg border border-border bg-card px-2 pt-2">
          <HistoryStrip runs={runs} predicted={predicted} low={low} high={high} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full table-fixed text-sm">
            <thead className="text-[11px] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-12 px-4 py-2 text-left font-normal">#</th>
                <th className="w-14 px-2 py-2 text-left font-normal">Lane</th>
                <th className="px-2 py-2 text-right font-normal">Car time</th>
                <th className="px-2 py-2 text-right font-normal">Reaction</th>
                <th className="px-2 py-2 text-right font-normal">Total</th>
                <th className="px-2 py-2 text-right font-normal">Δ pred</th>
                <th className="w-12 px-2 py-2">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {runs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center font-sans text-sm text-muted-foreground"
                  >
                    Type the first timed run below.
                  </td>
                </tr>
              )}
              {runs.map((r, i) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 text-text-3">{i + 1}</td>
                  <td className="px-2 py-2">{r.lane}</td>
                  <td
                    className={cn(
                      "tabular px-2 py-2 text-right",
                      r.car_s === best && "text-[#b18cff]",
                    )}
                  >
                    {fmt(r.car_s)}
                  </td>
                  <td className="tabular px-2 py-2 text-right">{fmt(r.reaction_s)}</td>
                  <td className="tabular px-2 py-2 text-right">{fmt(r.car_s + r.reaction_s)}</td>
                  <td
                    className={cn(
                      "tabular px-2 py-2 text-right",
                      inBand(r.car_s) ? "text-ok" : "text-risk",
                    )}
                  >
                    {predicted != null
                      ? `${r.car_s - predicted >= 0 ? "+" : ""}${((r.car_s - predicted) * 1000).toFixed(0)} ms`
                      : "—"}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      aria-label={`Delete run ${i + 1}`}
                      onClick={() => setRuns((xs) => xs.filter((x) => x.id !== r.id))}
                      className="text-text-3 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <span className="text-[13px] font-medium">Add timed run</span>
            <div className="grid grid-cols-[1fr_96px] items-center gap-2 text-[13px]">
              <label htmlFor="rd-car" className="text-text-2">
                Car time (s)
              </label>
              <Input
                id="rd-car"
                inputMode="decimal"
                value={car}
                onChange={(e) => setCar(e.target.value)}
                className="h-8 text-right font-mono"
                placeholder="1.050"
              />
              <label htmlFor="rd-react" className="text-text-2">
                Reaction (s)
              </label>
              <Input
                id="rd-react"
                inputMode="decimal"
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                className="h-8 text-right font-mono"
                placeholder="0.150"
              />
              <span className="text-text-2">Lane</span>
              <div className="flex gap-1">
                {(["A", "B"] as const).map((l) => (
                  <Button
                    key={l}
                    type="button"
                    size="sm"
                    variant={lane === l ? "secondary" : "ghost"}
                    className="flex-1"
                    onClick={() => setLane(l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm">
              <Plus /> Add run
            </Button>
          </form>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-border bg-card p-4 text-[13px]">
            <dt className="text-muted-foreground">Runs</dt>
            <dd className="tabular text-right font-mono">{runs.length}</dd>
            <dt className="text-muted-foreground">Mean car time</dt>
            <dd className="tabular text-right font-mono">{fmt(mean)} s</dd>
            <dt className="text-muted-foreground">Mean reaction</dt>
            <dd className="tabular text-right font-mono">{fmt(meanReaction)} s</dd>
            <dt className="text-muted-foreground">In predicted band</dt>
            <dd className="tabular text-right font-mono">
              {low != null
                ? `${runs.filter((r) => inBand(r.car_s)).length} / ${runs.length}`
                : "no band"}
            </dd>
            <dt className="text-muted-foreground">Model peak speed</dt>
            <dd className="tabular text-right font-mono">
              {fmt(model.data?.peak_speed_m_s, 1)} m/s
            </dd>
          </dl>
        </aside>
      </div>
    </div>
  );
}
