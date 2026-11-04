import { describe, expect, it } from "vitest";
import type { RaceSimulation } from "@/lib/api";
import { buildTracks, channelOf, markers } from "./raceTracks";

function sim(overrides: Partial<RaceSimulation> = {}): RaceSimulation {
  return {
    model: "M2",
    provenance: "predicted",
    input_provenance: ["estimated"],
    finished: true,
    time_s: 1.0,
    stop_reason: "finish line",
    peak_speed_m_s: 20,
    time_axis: { name: "time", unit: "s", values: [0, 0.25, 0.5, 0.75, 1.0] },
    channels: [
      { name: "velocity", unit: "m/s", values: [0, 12, 20, 18, 16] },
      { name: "thrust", unit: "N", values: [4, 4, 0, 0, 0] },
      { name: "position", unit: "m", values: [0, 2, 6, 12, 20] },
    ],
    ...overrides,
  };
}

describe("race markers", () => {
  it("annotates launch, burnout, peak and finish from the actual trace", () => {
    const data = sim();
    const result = markers(data, data.time_axis.values);
    expect(result).toEqual([
      { t: 0, label: "launch 0.000 s", kind: "launch" },
      { t: 0.25, label: "burnout 0.250 s", kind: "burnout" },
      { t: 0.5, label: "peak 0.500 s", kind: "peak" },
      { t: 1, label: "finish 1.000 s", kind: "finish" },
    ]);
  });

  it("keeps a DNF explicit and never invents a finish time", () => {
    const data = sim({ finished: false, time_s: null, stop_reason: "stalled before finish" });
    const result = markers(data, data.time_axis.values);
    expect(result.some((marker) => marker.kind === "finish")).toBe(false);
    expect(result.at(-1)).toEqual({
      t: 1,
      label: "stop · stalled before finish 1.000 s",
      kind: "stop",
    });
  });

  it("merges coincident events so labels do not overdraw", () => {
    const data = sim({ time_s: 0.5 });
    const result = markers(data, data.time_axis.values);
    const peakAndFinish = result.filter((marker) => marker.t === 0.5);
    expect(peakAndFinish).toHaveLength(1);
    expect(peakAndFinish[0].label).toBe("peak 0.500 s · finish 0.500 s");
  });

  it("falls back to the run start when the thrust trace is empty", () => {
    const data = sim({
      channels: [
        { name: "velocity", unit: "m/s", values: [1, 2, 3, 4, 5] },
        { name: "thrust", unit: "N", values: [] },
      ],
    });
    const result = markers(data, data.time_axis.values);
    expect(result[0]).toEqual({ t: 0, label: "launch 0.000 s", kind: "launch" });
    expect(result.some((marker) => marker.kind === "burnout")).toBe(false);
  });
});

describe("telemetry tracks", () => {
  it("includes units for every channel that is plotted", () => {
    const tracks = buildTracks(sim());
    expect(tracks.map((track) => [track.id, track.unit])).toEqual([
      ["velocity", "m/s"],
      ["acceleration", "m/s²"],
      ["forces", "N"],
      ["distance", "m"],
    ]);
    expect(channelOf(sim(), "velocity")).toHaveLength(5);
    expect(channelOf(sim(), "missing")).toEqual([]);
  });
});
