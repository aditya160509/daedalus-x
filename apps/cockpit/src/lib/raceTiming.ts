/**
 * Pure helpers for the race timing view: speed trap values and the timing export rows.
 * Every number comes from the returned trace; nothing is assumed or re-simulated here.
 */
import type { RaceSimulation } from "./api";

const KMH_PER_MS = 3.6;

const channel = (sim: RaceSimulation, name: string): number[] =>
  sim.channels.find((c) => c.name === name)?.values ?? [];

/** Linear interpolation of a trace at time t (clamped to the sampled range). */
export function valueAt(time: number[], values: number[], t: number): number | null {
  if (time.length === 0 || values.length !== time.length) return null;
  if (t <= time[0]) return values[0] ?? null;
  const last = time.length - 1;
  if (t >= time[last]) return values[last] ?? null;
  let i = 0;
  while (i < last - 1 && time[i + 1] < t) i += 1;
  const span = time[i + 1] - time[i];
  if (span <= 0) return values[i];
  const f = (t - time[i]) / span;
  return values[i] + f * (values[i + 1] - values[i]);
}

export interface SpeedTrap {
  peakMs: number | null;
  peakT: number | null;
  finishMs: number | null;
  finishT: number | null;
}

/** Peak speed is the trace maximum. Finish speed is read at the finish time, if the run finished. */
export function speedTrap(sim: RaceSimulation): SpeedTrap {
  const time = sim.time_axis.values;
  const velocity = channel(sim, "velocity");
  let peakIndex = -1;
  let peak = -Infinity;
  velocity.forEach((v, i) => {
    if (Number.isFinite(v) && v > peak) {
      peak = v;
      peakIndex = i;
    }
  });
  const finishT = sim.finished && sim.time_s != null ? sim.time_s : null;
  return {
    peakMs: peakIndex >= 0 ? peak : null,
    peakT: peakIndex >= 0 ? (time[peakIndex] ?? null) : null,
    finishMs: finishT == null ? null : valueAt(time, velocity, finishT),
    finishT,
  };
}

export interface TimingRow {
  t_s: number;
  velocity_m_s: number | null;
  velocity_km_h: number | null;
  position_m: number | null;
  thrust_n: number | null;
}

/** One row per returned sample. Columns that the model did not return stay null. */
export function timingRows(sim: RaceSimulation): TimingRow[] {
  const time = sim.time_axis.values;
  const velocity = channel(sim, "velocity");
  const position = channel(sim, "position");
  const thrust = channel(sim, "thrust");
  const at = (values: number[], i: number) => (Number.isFinite(values[i]) ? values[i] : null);
  return time.map((t, i) => {
    const v = at(velocity, i);
    return {
      t_s: t,
      velocity_m_s: v,
      velocity_km_h: v == null ? null : v * KMH_PER_MS,
      position_m: at(position, i),
      thrust_n: at(thrust, i),
    };
  });
}

const CSV_HEADER = "t_s,velocity_m_s,velocity_km_h,position_m,thrust_n";
const cell = (v: number | null) => (v == null ? "" : String(v));

export function timingCsv(sim: RaceSimulation): string {
  const lines = timingRows(sim).map((r) =>
    [r.t_s, r.velocity_m_s, r.velocity_km_h, r.position_m, r.thrust_n].map(cell).join(","),
  );
  return [CSV_HEADER, ...lines].join("\n") + "\n";
}

export function timingJson(sim: RaceSimulation): string {
  const trap = speedTrap(sim);
  return `${JSON.stringify(
    {
      provenance: sim.provenance,
      model: sim.model,
      finished: sim.finished,
      time_s: sim.time_s,
      stop_reason: sim.stop_reason,
      speed_trap: {
        peak_m_s: trap.peakMs,
        peak_t_s: trap.peakT,
        finish_m_s: trap.finishMs,
        finish_t_s: trap.finishT,
      },
      rows: timingRows(sim),
    },
    null,
    2,
  )}\n`;
}
