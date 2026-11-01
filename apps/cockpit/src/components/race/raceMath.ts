/**
 * Pure telemetry-cursor and ghost-race maths. The wall, the cursor table and the replay all
 * share these functions so a value read in one place is the value used in the other.
 */

export interface DistanceTrace {
  time: readonly number[];
  position: readonly number[];
}

export interface DeltaReading {
  /** B − A, always defined. */
  dt: number;
  a: number | null;
  b: number | null;
  /** B − A in the channel's unit; null when either sample is outside the run. */
  delta: number | null;
}

export interface DeltaPoint {
  x: number;
  /** Ghost time minus primary time at this distance, seconds; null when either misses it. */
  dt: number | null;
}

export interface LabelledCentroid {
  label: string;
  centroid: readonly [number, number, number];
}

/** First index whose time is >= t; the array must be sorted ascending. */
export function nearestIndex(t: number, times: readonly number[]): number {
  if (times.length === 0) return -1;
  if (!Number.isFinite(t) || t <= times[0]) return 0;
  if (t >= times[times.length - 1]) return times.length - 1;
  let lo = 0;
  let hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }
  return t - times[lo] <= times[hi] - t ? lo : hi;
}

/** Linear interpolation between samples. Null outside the run or when a sample is invalid. */
export function sampleAt(
  t: number,
  times: readonly number[],
  values: readonly number[],
): number | null {
  if (times.length !== values.length || times.length === 0 || !Number.isFinite(t)) return null;
  const last = times.length - 1;
  if (t < times[0] || t > times[last]) return null;
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }
  const a = values[lo];
  const b = values[hi];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (hi === lo || times[hi] === times[lo]) return a;
  return a + ((t - times[lo]) / (times[hi] - times[lo])) * (b - a);
}

/** Interpolation that clamps to the ends, for replay where the car must stay on track. */
export function clampedSampleAt(
  t: number,
  times: readonly number[],
  values: readonly number[],
): number | null {
  if (times.length !== values.length || times.length === 0 || !Number.isFinite(t)) return null;
  const last = times.length - 1;
  if (t <= times[0]) return values[0] ?? null;
  if (t >= times[last]) return values[last] ?? null;
  return sampleAt(t, times, values);
}

/** Move a sample index by `step`, clamped to the run. */
export function stepCursor(index: number, step: number, count: number): number {
  if (count <= 0) return -1;
  return Math.min(Math.max(index + step, 0), count - 1);
}

export function deltaReading(
  aTime: number,
  bTime: number,
  times: readonly number[],
  values: readonly number[],
): DeltaReading {
  const a = sampleAt(aTime, times, values);
  const b = sampleAt(bTime, times, values);
  return { dt: bTime - aTime, a, b, delta: a !== null && b !== null ? b - a : null };
}

/** Time at which a monotonically advancing trace first reaches `distance`. */
export function timeAtDistance(
  distance: number,
  times: readonly number[],
  positions: readonly number[],
): number | null {
  if (times.length !== positions.length || times.length === 0 || !Number.isFinite(distance)) {
    return null;
  }
  if (distance <= positions[0]) return times[0];
  if (distance > positions[positions.length - 1]) return null;
  let lo = 0;
  let hi = positions.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (positions[mid] < distance) lo = mid;
    else hi = mid;
  }
  if (positions[hi] === positions[lo]) return times[hi];
  const f = (distance - positions[lo]) / (positions[hi] - positions[lo]);
  return times[lo] + f * (times[hi] - times[lo]);
}

/** Ghost time minus primary time at evenly spaced distances up to the shorter run. */
export function deltaTimeCurve(
  primary: DistanceTrace,
  ghost: DistanceTrace,
  samples = 80,
): DeltaPoint[] {
  if (samples < 2) throw new Error("deltaTimeCurve needs at least two samples");
  if (primary.position.length === 0 || ghost.position.length === 0) return [];
  const end = Math.min(
    primary.position[primary.position.length - 1],
    ghost.position[ghost.position.length - 1],
  );
  if (!(end > 0)) return [];
  return Array.from({ length: samples }, (_, i) => {
    const x = (end * i) / (samples - 1);
    const tp = timeAtDistance(x, primary.time, primary.position);
    const tg = timeAtDistance(x, ghost.time, ghost.position);
    return { x, dt: tp !== null && tg !== null ? tg - tp : null };
  });
}

/** Ghost finish time minus primary finish time; null when either car did not finish. */
export function finishGap(primaryTime: number | null, ghostTime: number | null): number | null {
  if (primaryTime === null || ghostTime === null) return null;
  return ghostTime - primaryTime;
}

/**
 * Yaw that turns a display mesh's nose towards +X. The GLB long axis is X, but a model whose
 * front parts sit at lower X than its rear parts is modelled nose-to-−X and needs half a turn.
 * With no labelled parts the model is left as authored.
 */
export function carForwardYaw(parts: readonly LabelledCentroid[]): number {
  const mean = (list: LabelledCentroid[]) =>
    list.reduce((sum, part) => sum + part.centroid[0], 0) / list.length;
  const front = parts.filter((part) => /front/i.test(part.label));
  const rear = parts.filter((part) => /rear|back/i.test(part.label));
  if (front.length === 0 || rear.length === 0) return 0;
  return mean(front) < mean(rear) ? Math.PI : 0;
}

/** Ghost CdA at the same drag coefficient, scaled by frontal area. */
export function ghostCdaFromArea(baseCda: number, baseArea: number, ghostArea: number): number {
  if (!(baseCda >= 0)) throw new Error("base CdA must be non-negative");
  if (!(baseArea > 0) || !(ghostArea > 0)) {
    throw new Error("frontal areas must be positive to scale CdA");
  }
  return (baseCda * ghostArea) / baseArea;
}

/** Split times (s) for `n` equal mini-sectors of a run; null where the run doesn't reach it. */
export function miniSectorTimes(trace: DistanceTrace, lengthM: number, n = 8): (number | null)[] {
  const out: (number | null)[] = [];
  let prev = 0;
  for (let i = 1; i <= n; i++) {
    const t = timeAtDistance((lengthM * i) / n, trace.time, trace.position);
    out.push(t == null ? null : t - prev);
    if (t != null) prev = t;
  }
  return out;
}
