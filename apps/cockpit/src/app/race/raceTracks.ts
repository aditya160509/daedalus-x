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

export function markers(sim: RaceSimulation, time: number[]): Array<{ t: number; label: string }> {
  const out: Array<{ t: number; label: string }> = [];
  const burn = channelOf(sim, "thrust");
  const lastBurn = burn.findLastIndex((v) => v > 0);
  if (lastBurn > 0 && time[lastBurn] !== undefined) {
    out.push({ t: time[lastBurn], label: "burn end" });
  }
  if (sim.time_s !== null) out.push({ t: sim.time_s, label: "finish" });
  return out;
}
