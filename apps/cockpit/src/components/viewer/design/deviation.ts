import * as THREE from "three";
import type { LoadedModel } from "@/lib/gltf";

/**
 * CAD-to-CAD deviation. This is not a measured manufacturing deviation: both sides are display
 * meshes, so the result is only as good as the tessellation.
 *
 * Convention: for each sampled point on B (the revision), the signed normal distance to A (the
 * reference) is positive when the point lies outside A along A's triangle normal, i.e. material
 * added, and negative when it lies inside A, i.e. material removed. Distances are millimetres.
 */

type Vec3 = [number, number, number];

export interface TriangleMesh {
  label: string;
  /** Flat xyz positions in metres. */
  positions: Float32Array;
  /** Triangle indices; null means consecutive triples. */
  indices: Uint32Array | null;
}

export interface PartDeviation {
  label: string;
  /** Sampled xyz positions in metres, in the same frame as the reference. */
  samples: Float32Array;
  /** One signed millimetre value per sample. */
  deviationMm: Float32Array;
  triangles: number;
  sampled: number;
}

export interface DeviationReport {
  status: "ok" | "rejected";
  /** Present when status is "rejected". */
  reason?: string;
  /** Symmetric colour range in millimetres; always at least 1 mm. */
  rangeMm: number;
  toleranceMm: number;
  parts: PartDeviation[];
  referenceOnly: string[];
  candidateOnly: string[];
  sampledVertices: number;
  /** Largest absolute deviation across every sampled point, in millimetres. */
  maxAbsMm: number;
}

export interface DeviationRender {
  positions: Float32Array;
  colors: Float32Array;
}

const DEFAULT_SAMPLES = 20_000;
const DEFAULT_TOLERANCE_MM = 0.05;

function boundsOf(mesh: TriangleMesh): {
  min: Vec3;
  max: Vec3;
  centre: Vec3;
  diagonal: number;
} {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = mesh.positions[i + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }
  return {
    min,
    max,
    centre: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    diagonal: Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
  };
}

/**
 * A revision must be explicitly aligned before any signed distance is meaningful. We reject
 * designs whose centres differ by more than 5% of the reference diagonal. The threshold is a
 * display-mesh sanity check, not a tolerance claim.
 */
export function alignmentProblem(reference: TriangleMesh, candidate: TriangleMesh): string | null {
  const a = boundsOf(reference);
  const b = boundsOf(candidate);
  if (!Number.isFinite(a.diagonal) || a.diagonal <= 1e-9) return "reference geometry is empty";
  if (!Number.isFinite(b.diagonal) || b.diagonal <= 1e-9) return "candidate geometry is empty";
  const offset = Math.hypot(
    b.centre[0] - a.centre[0],
    b.centre[1] - a.centre[1],
    b.centre[2] - a.centre[2],
  );
  const allowed = Math.max(0.002, a.diagonal * 0.05);
  if (offset > allowed) {
    return `parts are not in the same frame: centres differ by ${(offset * 1000).toFixed(1)} mm (limit ${(
      allowed * 1000
    ).toFixed(1)} mm)`;
  }
  return null;
}

interface Grid {
  cell: number;
  map: Map<string, number[]>;
  origin: Vec3;
}

function key(x: number, y: number, z: number): string {
  return `${x}|${y}|${z}`;
}

function buildGrid(mesh: TriangleMesh): Grid {
  const { min, diagonal } = boundsOf(mesh);
  const triangles = triangleCount(mesh);
  const cell = Math.max(diagonal / Math.max(4, Math.cbrt(triangles) * 2), 1e-4);
  const map = new Map<string, number[]>();
  const push = (ix: number, iy: number, iz: number, tri: number) => {
    const k = key(ix, iy, iz);
    const list = map.get(k);
    if (list) list.push(tri);
    else map.set(k, [tri]);
  };
  for (let tri = 0; tri < triangles; tri++) {
    const [a, b, c] = triangleVertices(mesh, tri);
    const lo = [0, 1, 2].map((axis) =>
      Math.floor((Math.min(a[axis], b[axis], c[axis]) - min[axis]) / cell),
    );
    const hi = [0, 1, 2].map((axis) =>
      Math.floor((Math.max(a[axis], b[axis], c[axis]) - min[axis]) / cell),
    );
    for (let x = lo[0]; x <= hi[0]; x++)
      for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) push(x, y, z, tri);
  }
  return { cell, map, origin: min };
}

function triangleCount(mesh: TriangleMesh): number {
  return mesh.indices ? Math.floor(mesh.indices.length / 3) : Math.floor(mesh.positions.length / 9);
}

function triangleVertices(mesh: TriangleMesh, tri: number): [Vec3, Vec3, Vec3] {
  const read = (offset: number): Vec3 => [
    mesh.positions[offset],
    mesh.positions[offset + 1],
    mesh.positions[offset + 2],
  ];
  if (mesh.indices) {
    return [
      read(mesh.indices[tri * 3] * 3),
      read(mesh.indices[tri * 3 + 1] * 3),
      read(mesh.indices[tri * 3 + 2] * 3),
    ];
  }
  return [read(tri * 9), read(tri * 9 + 3), read(tri * 9 + 6)];
}

/** Closest point on a triangle (Ericson, Real-Time Collision Detection) plus that triangle normal. */
function closestOnTriangle(point: Vec3, a: Vec3, b: Vec3, c: Vec3) {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap: Vec3 = [point[0] - a[0], point[1] - a[1], point[2] - a[2]];
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  const normal = normalOf(a, b, c);
  const finish = (q: Vec3) => ({ point: q, normal });
  if (d1 <= 0 && d2 <= 0) return finish(a);

  const bp: Vec3 = [point[0] - b[0], point[1] - b[1], point[2] - b[2]];
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return finish(b);

  const cp: Vec3 = [point[0] - c[0], point[1] - c[1], point[2] - c[2]];
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return finish(c);

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return finish([a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]);
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const v = d2 / (d2 - d6);
    return finish([a[0] + v * ac[0], a[1] + v * ac[1], a[2] + v * ac[2]]);
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const v = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return finish([b[0] + v * (c[0] - b[0]), b[1] + v * (c[1] - b[1]), b[2] + v * (c[2] - b[2])]);
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return finish([
    a[0] + ab[0] * v + ac[0] * w,
    a[1] + ab[1] * v + ac[1] * w,
    a[2] + ab[2] * v + ac[2] * w,
  ]);
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalOf(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const length = Math.hypot(n[0], n[1], n[2]);
  return length > 1e-15 ? [n[0] / length, n[1] / length, n[2] / length] : [0, 1, 0];
}

function gridCandidates(grid: Grid, point: Vec3, triangles: number): number[] {
  const { cell, map, origin } = grid;
  const cx = Math.floor((point[0] - origin[0]) / cell);
  const cy = Math.floor((point[1] - origin[1]) / cell);
  const cz = Math.floor((point[2] - origin[2]) / cell);
  let radius = 1;
  while (radius <= 32) {
    const seen = new Set<number>();
    const candidates: number[] = [];
    for (let x = cx - radius; x <= cx + radius; x++)
      for (let y = cy - radius; y <= cy + radius; y++)
        for (let z = cz - radius; z <= cz + radius; z++) {
          const list = map.get(key(x, y, z));
          if (list)
            for (const tri of list)
              if (!seen.has(tri)) {
                seen.add(tri);
                candidates.push(tri);
              }
        }
    if (candidates.length) return candidates;
    radius *= 2;
  }
  return Array.from({ length: triangles }, (_, i) => i);
}

/** Signed distance in millimetres from one candidate vertex to the reference surface. */
function signedDistanceMm(
  grid: Grid | null,
  reference: TriangleMesh,
  point: Vec3,
): { mm: number; normal: Vec3 } {
  const g = grid ?? buildGrid(reference);
  const triangles = triangleCount(reference);
  let bestDistance = Infinity;
  let bestNormal: Vec3 = [0, 1, 0];
  let bestPoint: Vec3 = [0, 0, 0];
  // Small fixtures are searched exhaustively, so tests and tiny parts are exact. Dense display
  // meshes use the uniform grid, which finds the nearest cell block but is a bounded approximation.
  const candidates =
    triangles <= 512
      ? Array.from({ length: triangles }, (_, i) => i)
      : gridCandidates(g, point, triangles);
  for (const tri of candidates) {
    const [a, b, c] = triangleVertices(reference, tri);
    const hit = closestOnTriangle(point, a, b, c);
    const distance = Math.hypot(
      point[0] - hit.point[0],
      point[1] - hit.point[1],
      point[2] - hit.point[2],
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNormal = hit.normal;
      bestPoint = hit.point;
    }
  }
  const sign =
    (point[0] - bestPoint[0]) * bestNormal[0] +
      (point[1] - bestPoint[1]) * bestNormal[1] +
      (point[2] - bestPoint[2]) * bestNormal[2] >=
    0
      ? 1
      : -1;
  return { mm: sign * bestDistance * 1000, normal: bestNormal };
}

export function signedDeviation(
  reference: TriangleMesh,
  candidate: TriangleMesh,
  maxSamples = DEFAULT_SAMPLES,
): PartDeviation {
  const grid = buildGrid(reference);
  const vertexCount = Math.floor(candidate.positions.length / 3);
  const stride = Math.max(1, Math.ceil(vertexCount / Math.max(1, maxSamples)));
  const samples: number[] = [];
  const values: number[] = [];
  for (let vertex = 0; vertex < vertexCount; vertex += stride) {
    const point: Vec3 = [
      candidate.positions[vertex * 3],
      candidate.positions[vertex * 3 + 1],
      candidate.positions[vertex * 3 + 2],
    ];
    const result = signedDistanceMm(grid, reference, point);
    samples.push(point[0], point[1], point[2]);
    values.push(result.mm);
  }
  return {
    label: candidate.label,
    samples: new Float32Array(samples),
    deviationMm: new Float32Array(values),
    triangles: triangleCount(reference),
    sampled: values.length,
  };
}

/** Diverging scale: material removed is red, zero is neutral, material added is blue. */
export function deviationColor(mm: number, rangeMm: number): [number, number, number] {
  const span = Math.max(rangeMm, 1e-6);
  const t = Math.max(-1, Math.min(1, mm / span));
  const neutral: [number, number, number] = [0.62, 0.64, 0.68];
  const added: [number, number, number] = [0.24, 0.84, 0.94];
  const removed: [number, number, number] = [0.94, 0.32, 0.32];
  const target = t >= 0 ? added : removed;
  const amount = Math.abs(t);
  return [
    neutral[0] + (target[0] - neutral[0]) * amount,
    neutral[1] + (target[1] - neutral[1]) * amount,
    neutral[2] + (target[2] - neutral[2]) * amount,
  ];
}

export interface DeviationOptions {
  maxSamples?: number;
  toleranceMm?: number;
}

/**
 * Compare every matched part (by label) and collect unmatched labels honestly. Frames must already
 * be aligned; a part whose centres disagree is rejected instead of producing a bogus heat map.
 */
export function compareParts(
  reference: readonly TriangleMesh[],
  candidate: readonly TriangleMesh[],
  options: DeviationOptions = {},
): DeviationReport {
  const toleranceMm = options.toleranceMm ?? DEFAULT_TOLERANCE_MM;
  const maxSamples = options.maxSamples ?? DEFAULT_SAMPLES;
  const refByLabel = new Map(uniqueLabels(reference).map((part) => [part.label, part]));
  const candByLabel = new Map(uniqueLabels(candidate).map((part) => [part.label, part]));
  const labels = [...refByLabel.keys()].filter((label) => candByLabel.has(label)).toSorted();
  const referenceOnly = [...refByLabel.keys()]
    .filter((label) => !candByLabel.has(label))
    .toSorted();
  const candidateOnly = [...candByLabel.keys()]
    .filter((label) => !refByLabel.has(label))
    .toSorted();

  if (labels.length === 0) {
    return {
      status: "rejected",
      reason: "no named parts match between the two designs",
      rangeMm: 1,
      toleranceMm,
      parts: [],
      referenceOnly,
      candidateOnly,
      sampledVertices: 0,
      maxAbsMm: 0,
    };
  }

  const parts: PartDeviation[] = [];
  for (const label of labels) {
    const a = refByLabel.get(label)!;
    const b = candByLabel.get(label)!;
    const problem = alignmentProblem(a, b);
    if (problem) {
      return {
        status: "rejected",
        reason: `${label}: ${problem}`,
        rangeMm: 1,
        toleranceMm,
        parts: [],
        referenceOnly,
        candidateOnly,
        sampledVertices: 0,
        maxAbsMm: 0,
      };
    }
    const perPart = Math.max(200, Math.floor(maxSamples / labels.length));
    parts.push(signedDeviation(a, b, perPart));
  }

  let maxAbsMm = 0;
  let sampledVertices = 0;
  for (const part of parts) {
    sampledVertices += part.sampled;
    for (const mm of part.deviationMm) maxAbsMm = Math.max(maxAbsMm, Math.abs(mm));
  }
  return {
    status: "ok",
    rangeMm: Math.max(1, Math.ceil(maxAbsMm)),
    toleranceMm,
    parts,
    referenceOnly,
    candidateOnly,
    sampledVertices,
    maxAbsMm,
  };
}

/** Colour-mapped point buffers for the revision surface. */
export function deviationRender(report: DeviationReport): DeviationRender {
  const positions: number[] = [];
  const colors: number[] = [];
  for (const part of report.parts) {
    for (let i = 0; i < part.sampled; i++) {
      const mm = part.deviationMm[i];
      const [r, g, b] = deviationColor(mm, report.rangeMm);
      positions.push(part.samples[i * 3], part.samples[i * 3 + 1], part.samples[i * 3 + 2]);
      colors.push(r, g, b);
    }
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
}

/**
 * Four identical labels (four wheels) would otherwise collapse into one map entry. Suffix repeated
 * labels in bounding-box-centre order so the pairing is deterministic and visible in the legend.
 */
function uniqueLabels(meshes: readonly TriangleMesh[]): TriangleMesh[] {
  const counts = new Map<string, number>();
  const out: TriangleMesh[] = [];
  const sorted = meshes.toSorted((a, b) => {
    const ca = boundsOf(a).centre;
    const cb = boundsOf(b).centre;
    return ca[0] - cb[0] || ca[1] - cb[1] || ca[2] - cb[2] || a.label.localeCompare(b.label);
  });
  for (const part of sorted) {
    const seen = (counts.get(part.label) ?? 0) + 1;
    counts.set(part.label, seen);
    out.push(seen === 1 ? part : { ...part, label: `${part.label} (${seen})` });
  }
  return out;
}

/** Flatten a loaded display model into named part meshes in world space, excluding section caps. */
export function modelPartMeshes(model: LoadedModel): TriangleMesh[] {
  const meshes: TriangleMesh[] = [];
  for (const part of model.parts) {
    if (part.depth !== 0) continue;
    const node = model.scene.getObjectByProperty("uuid", part.uuid);
    if (!node) continue;
    const positions: number[] = [];
    const indices: number[] = [];
    let base = 0;
    const matrix = new THREE.Matrix4();
    node.updateWorldMatrix(true, true);
    node.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.sectionCap) return;
      const geometry = child.geometry as THREE.BufferGeometry;
      const attribute = geometry.getAttribute("position");
      if (!attribute) return;
      matrix.copy(child.matrixWorld);
      const vertex = new THREE.Vector3();
      for (let i = 0; i < attribute.count; i++) {
        vertex.fromBufferAttribute(attribute, i).applyMatrix4(matrix);
        positions.push(vertex.x, vertex.y, vertex.z);
      }
      const index = geometry.getIndex();
      if (index) for (let i = 0; i < index.count; i++) indices.push(base + index.getX(i));
      else for (let i = 0; i < attribute.count; i++) indices.push(base + i);
      base += attribute.count;
    });
    if (indices.length) {
      meshes.push({
        label: part.label,
        positions: new Float32Array(positions),
        indices: new Uint32Array(indices),
      });
    }
  }
  return meshes;
}
