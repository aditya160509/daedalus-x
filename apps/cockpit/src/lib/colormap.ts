/** Perceptual colormaps for field data. Each returns linear RGB in [0, 1]. */

type Stops = ReadonlyArray<readonly [number, number, number, number]>;

// Diverging blue–white–red (Moreland "cool to warm"), for signed quantities such as Cp.
const COOLWARM: Stops = [
  [0.0, 0.23, 0.299, 0.754],
  [0.25, 0.552, 0.69, 0.996],
  [0.5, 0.865, 0.865, 0.865],
  [0.75, 0.958, 0.604, 0.482],
  [1.0, 0.706, 0.016, 0.15],
];

// Turbo-like sequential map, for speed magnitude and velocity ratios.
const TURBO: Stops = [
  [0.0, 0.19, 0.072, 0.232],
  [0.15, 0.275, 0.408, 0.906],
  [0.3, 0.1, 0.753, 0.906],
  [0.45, 0.2, 0.95, 0.55],
  [0.6, 0.75, 0.95, 0.2],
  [0.75, 0.98, 0.7, 0.13],
  [0.9, 0.92, 0.32, 0.07],
  [1.0, 0.48, 0.016, 0.01],
];

export type ColormapName = "coolwarm" | "turbo";
const MAPS: Record<ColormapName, Stops> = { coolwarm: COOLWARM, turbo: TURBO };

export function sample(name: ColormapName, t: number): [number, number, number] {
  const s = MAPS[name];
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  let i = 1;
  while (i < s.length - 1 && s[i][0] < x) i++;
  const [t0, r0, g0, b0] = s[i - 1];
  const [t1, r1, g1, b1] = s[i];
  const f = (x - t0) / (t1 - t0 || 1);
  return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f];
}

/** Map scalars to an interleaved RGB Float32Array (for a BufferAttribute). */
export function colorize(
  values: ArrayLike<number>,
  range: readonly [number, number],
  name: ColormapName,
): Float32Array {
  const out = new Float32Array(values.length * 3);
  const [lo, hi] = range;
  const span = hi - lo || 1;
  for (let i = 0; i < values.length; i++) {
    const [r, g, b] = sample(name, (values[i] - lo) / span);
    out[3 * i] = r;
    out[3 * i + 1] = g;
    out[3 * i + 2] = b;
  }
  return out;
}

/** CSS linear-gradient matching a colormap, for legends. */
export function cssGradient(name: ColormapName, direction = "to right"): string {
  const stops = MAPS[name]
    .map(([t, r, g, b]) => `rgb(${(r * 255) | 0} ${(g * 255) | 0} ${(b * 255) | 0}) ${t * 100}%`)
    .join(", ");
  return `linear-gradient(${direction}, ${stops})`;
}
