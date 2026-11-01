import { sample } from "../../../lib/colormap";
import type { FlowLines, FlowMesh } from "../../../lib/api";

export function contourBand(value: number, range: readonly [number, number], bands = 16): number {
  if (!Number.isFinite(value) || range[1] <= range[0] || bands < 2)
    throw new Error("Finite scalar, increasing range and at least two bands required");
  return Math.min(
    bands - 1,
    Math.max(0, Math.floor(((value - range[0]) / (range[1] - range[0])) * bands)),
  );
}

export function sliceRange(offsets: Uint32Array, index: number): [number, number] {
  if (!Number.isInteger(index) || index < 0 || index + 1 >= offsets.length)
    throw new Error("Slice index outside exported planes");
  return [offsets[index], offsets[index + 1] - offsets[index]];
}

export interface PackedLines {
  positions: Float32Array;
  colors: Float32Array;
  arcs: Float32Array;
}

/** Uniform deterministic seed subsampling; integration already happened in the CFD export. */
export function packLines(lines: FlowLines, density: number, white = false): PackedLines {
  if (!(density > 0 && density <= 1)) throw new Error("Line density must be in (0, 1]");
  const selected: number[] = [];
  let segments = 0;
  for (let l = 0; l + 1 < lines.offsets.length; l++) {
    if (Math.floor((l + 1) * density) === Math.floor(l * density)) continue;
    selected.push(l);
    segments += Math.max(0, lines.offsets[l + 1] - lines.offsets[l] - 1);
  }
  const positions = new Float32Array(segments * 6);
  const colors = new Float32Array(segments * 6);
  const arcs = new Float32Array(segments * 2);
  let segment = 0;
  for (const l of selected) {
    let arc = 0;
    for (let i = lines.offsets[l] + 1; i < lines.offsets[l + 1]; i++) {
      const start = i - 1;
      positions.set(lines.positions.subarray(start * 3, start * 3 + 6), segment * 6);
      arcs[segment * 2] = arc;
      arc += Math.hypot(
        lines.positions[i * 3] - lines.positions[start * 3],
        lines.positions[i * 3 + 1] - lines.positions[start * 3 + 1],
        lines.positions[i * 3 + 2] - lines.positions[start * 3 + 2],
      );
      arcs[segment * 2 + 1] = arc;
      for (let end = 0; end < 2; end++) {
        const t =
          (lines.scalar[start + end] - lines.range[0]) / (lines.range[1] - lines.range[0] || 1);
        colors.set(white ? [0.75, 0.87, 0.85] : sample("turbo", t), segment * 6 + end * 3);
      }
      segment++;
    }
  }
  return { positions, colors, arcs };
}

interface Node {
  index: number;
  axis: number;
  left?: Node;
  right?: Node;
}
function tree(points: Float32Array, ids: number[], depth = 0): Node | undefined {
  if (!ids.length) return undefined;
  const axis = depth % 3;
  ids.sort((a, b) => points[a * 3 + axis] - points[b * 3 + axis]);
  const middle = ids.length >> 1;
  return {
    index: ids[middle],
    axis,
    left: tree(points, ids.slice(0, middle), depth + 1),
    right: tree(points, ids.slice(middle + 1), depth + 1),
  };
}

export interface DeltaResult {
  scalar: Float32Array;
  mapped: boolean;
  rmsDistance: number;
}
/** Symmetric ΔCp range from the 99th percentile of |Δ|, so outliers cannot flatten the map. */
export function deltaRange(values: Float32Array): [number, number] {
  if (!values.length) throw new Error("Delta surface has no vertices");
  const magnitudes = Array.from(values, Math.abs).toSorted((a, b) => a - b);
  const p99 = magnitudes[Math.floor((magnitudes.length - 1) * 0.99)] ?? 0;
  const span = Math.max(p99, 1e-6);
  return [-span, span];
}
/** Exact correspondence only when both topology and coordinates match; otherwise a worker KD tree. */
export function nearestDelta(a: FlowMesh, b: FlowMesh): DeltaResult {
  if (!b.scalar.length) throw new Error("Comparison surface has no vertices");
  const exact =
    a.positions.length === b.positions.length &&
    a.indices.length === b.indices.length &&
    a.indices.every((v, i) => v === b.indices[i]) &&
    a.positions.every((v, i) => v === b.positions[i]);
  const scalar = new Float32Array(a.scalar.length);
  if (exact) {
    for (let i = 0; i < scalar.length; i++) scalar[i] = a.scalar[i] - b.scalar[i];
    return { scalar, mapped: false, rmsDistance: 0 };
  }
  const root = tree(
    b.positions,
    Array.from({ length: b.scalar.length }, (_, i) => i),
  );
  let distanceSum = 0;
  for (let i = 0; i < a.scalar.length; i++) {
    const q = a.positions.subarray(i * 3, i * 3 + 3);
    let best = 0,
      bestSquared = Infinity;
    const visit = (node: Node | undefined) => {
      if (!node) return;
      const j = node.index * 3;
      const distance =
        (q[0] - b.positions[j]) ** 2 +
        (q[1] - b.positions[j + 1]) ** 2 +
        (q[2] - b.positions[j + 2]) ** 2;
      if (distance < bestSquared) {
        bestSquared = distance;
        best = node.index;
      }
      const d = q[node.axis] - b.positions[j + node.axis];
      visit(d <= 0 ? node.left : node.right);
      if (d * d <= bestSquared) visit(d <= 0 ? node.right : node.left);
    };
    visit(root);
    scalar[i] = a.scalar[i] - b.scalar[best];
    distanceSum += bestSquared;
  }
  return { scalar, mapped: true, rmsDistance: Math.sqrt(distanceSum / Math.max(1, scalar.length)) };
}

export type WorkerTask =
  | { kind: "lines"; lines: FlowLines; density: number; white: boolean }
  | { kind: "delta"; a: FlowMesh; b: FlowMesh };
export type WorkerResult =
  | { kind: "lines"; data: PackedLines }
  | { kind: "delta"; data: DeltaResult }
  | { kind: "error"; message: string };

export interface ArrowSample {
  position: [number, number, number];
  vector: [number, number, number];
  speed: number;
}
export function arrowSamples(
  mesh: FlowMesh,
  offsets: Uint32Array,
  index: number,
): { samples: ArrowSample[]; p95: number } {
  if (!mesh.vectors) return { samples: [], p95: 0 };
  const [start, count] = sliceRange(offsets, index);
  const ids = new Set(mesh.indices.subarray(start, start + count));
  let y0 = Infinity,
    y1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const id of ids) {
    y0 = Math.min(y0, mesh.positions[id * 3 + 1]);
    y1 = Math.max(y1, mesh.positions[id * 3 + 1]);
    z0 = Math.min(z0, mesh.positions[id * 3 + 2]);
    z1 = Math.max(z1, mesh.positions[id * 3 + 2]);
  }
  const grid = new Map<string, ArrowSample>();
  for (const id of ids) {
    const x = mesh.positions[id * 3],
      y = mesh.positions[id * 3 + 1],
      z = mesh.positions[id * 3 + 2];
    const vy = mesh.vectors[id * 3 + 1],
      vz = mesh.vectors[id * 3 + 2];
    const speed = Math.hypot(vy, vz);
    if (speed < 1e-10) continue;
    const key = `${Math.floor((19 * (y - y0)) / (y1 - y0 || 1))}:${Math.floor((19 * (z - z0)) / (z1 - z0 || 1))}`;
    if (!grid.has(key)) grid.set(key, { position: [x + 0.0002, y, z], vector: [0, vy, vz], speed });
  }
  const samples = [...grid.values()];
  const speeds = samples.map((s) => s.speed).toSorted((a, b) => a - b);
  return { samples, p95: speeds[Math.floor((speeds.length - 1) * 0.95)] ?? 0 };
}
