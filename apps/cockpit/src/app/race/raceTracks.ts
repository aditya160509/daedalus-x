import type { TelemetryTrack } from "@/components/charts/TelemetryChart";
import { SERIES } from "@/lib/colormap";
import type { RaceSimulation } from "@/lib/api";

export const channelOf = (sim: RaceSimulation, name: string): number[] =>
  sim.channels.find((c) => c.name === name)?.values ?? [];

/** The API names its band arrays time_s; the chart wants `time`. Null when the band is missing. */
export function toBand(
  band: { time_s: number[]; p5: number[]; p50: number[]; p95: number[] } | null | undefined,
) {
  return band ? { time: band.time_s, p5: band.p5, p50: band.p50, p95: band.p95 } : null;
}

export function buildTracks(sim: RaceSimulation): TelemetryTrack[] {
  return [
    {
      id: "velocity",
      name: "Velocity",
      unit: "m/s",
      color: "#22d3ee",
      series: [{ label: "velocity", values: channelOf(sim, "velocity") }],
    },
    {
      id: "acceleration",
      name: "Accel",
      unit: "m/s²",
      color: "#b18cff",
      series: [{ label: "acceleration", values: channelOf(sim, "acceleration") }],
    },
    {
      id: "forces",
      name: "Force",
      unit: "N",
      color: "#e7ebef",
      series: [
        { label: "thrust", values: channelOf(sim, "thrust"), color: "#d8b45a" },
        { label: "drag", values: channelOf(sim, "drag"), color: SERIES.blue },
        {
          label: "rolling",
          values: channelOf(sim, "rolling_resistance"),
          color: "#f0525a",
          dashed: true,
        },
      ],
    },
    {
      id: "distance",
      name: "Distance",
      unit: "m",
      color: "#3ccf91",
      series: [{ label: "position", values: channelOf(sim, "position") }],
    },
  ];
}

export type RaceMarkerKind = "launch" | "burnout" | "peak" | "finish" | "stop";

export interface RaceMarker {
  t: number;
  label: string;
  kind: RaceMarkerKind;
}

const stamp = (t: number) => `${t.toFixed(3)} s`;

/**
 * Event annotations derived from the returned trace, never from assumed constants:
 *
 * - launch = first sample with positive thrust (time zero for a constant-acceleration run);
 * - burnout = last sample with positive thrust;
 * - peak = sample with the highest velocity;
 * - finish = the model's finish time, only when `finished` is true;
 * - stop = final sample of a non-finishing run, labelled with the solver's stop reason.
 *
 * Coincident events share one marker so labels cannot overdraw on the chart.
 */
export function markers(sim: RaceSimulation, time: number[]): RaceMarker[] {
  const out: RaceMarker[] = [];
  const push = (t: number | undefined, label: string, kind: RaceMarkerKind) => {
    if (t === undefined || !Number.isFinite(t)) return;
    out.push({ t, label: `${label} ${stamp(t)}`, kind });
  };

  const thrust = channelOf(sim, "thrust");
  const velocity = channelOf(sim, "velocity");

  const launchIndex = thrust.findIndex((value) => value > 0);
  if (launchIndex >= 0) push(time[launchIndex], "launch", "launch");
  else push(time[0], "launch", "launch");

  const burnIndex = thrust.findLastIndex((value) => value > 0);
  if (burnIndex >= 0) push(time[burnIndex], "burnout", "burnout");

  let peakIndex = -1;
  let peak = -Infinity;
  velocity.forEach((value, index) => {
    if (Number.isFinite(value) && value > peak) {
      peak = value;
      peakIndex = index;
    }
  });
  if (peakIndex >= 0) push(time[peakIndex], "peak", "peak");

  if (sim.finished && sim.time_s !== null) {
    push(sim.time_s, "finish", "finish");
  } else {
    const reason = sim.stop_reason.trim();
    push(
      time[time.length - 1],
      reason ? `stop · ${reason}` : "stop",
      "stop",
    );
  }

  const merged = new Map<number, RaceMarker>();
  for (const marker of out) {
    const key = Math.round(marker.t * 1e6) / 1e6;
    const previous = merged.get(key);
    if (previous) previous.label = `${previous.label} · ${marker.label}`;
    else merged.set(key, { ...marker });
  }
  return [...merged.values()].sort((a, b) => a.t - b.t);
}
