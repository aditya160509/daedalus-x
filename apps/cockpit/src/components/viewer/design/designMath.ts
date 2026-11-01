export type Vec3 = [number, number, number];

/** Part moves away from the car centre; a part already at the centre stays put. */
export function explodeOffset(part: Vec3, car: Vec3, amount: number): Vec3 {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Explode amount must be ≥ 0");
  return [(part[0] - car[0]) * amount, (part[1] - car[1]) * amount, (part[2] - car[2]) * amount];
}

export interface SnapResult {
  index: number;
  point: Vec3;
  distance: number;
}

/** Nearest vertex in a flat xyz array. Snapping is display-mesh accuracy, not CAD accuracy. */
export function nearestVertex(vertices: Float32Array, point: Vec3): SnapResult {
  if (vertices.length < 3 || vertices.length % 3) throw new Error("Invalid vertex array");
  let best = 0;
  let bestSquared = Infinity;
  for (let i = 0; i < vertices.length; i += 3) {
    const dx = vertices[i] - point[0];
    const dy = vertices[i + 1] - point[1];
    const dz = vertices[i + 2] - point[2];
    const squared = dx * dx + dy * dy + dz * dz;
    if (squared < bestSquared) {
      bestSquared = squared;
      best = i;
    }
  }
  return {
    index: best / 3,
    point: [vertices[best], vertices[best + 1], vertices[best + 2]],
    distance: Math.sqrt(bestSquared),
  };
}

export interface Measurement {
  distance: number;
  dx: number;
  dy: number;
  dz: number;
}

export function measure(a: Vec3, b: Vec3): Measurement {
  return {
    distance: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
    dx: b[0] - a[0],
    dy: b[1] - a[1],
    dz: b[2] - a[2],
  };
}

export interface DimLine {
  key: "length" | "width" | "height";
  start: Vec3;
  end: Vec3;
  value: number;
}

/** Dimension lines sit outside the bounding box so they never intersect the car. */
export function dimensionLines(min: Vec3, max: Vec3): DimLine[] {
  const pad = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) * 0.12;
  return [
    {
      key: "length",
      start: [min[0], min[1], max[2] + pad],
      end: [max[0], min[1], max[2] + pad],
      value: max[0] - min[0],
    },
    {
      key: "width",
      start: [min[0] - pad, min[1], min[2]],
      end: [min[0] - pad, min[1], max[2]],
      value: max[2] - min[2],
    },
    {
      key: "height",
      start: [min[0] - pad, min[1], max[2] + pad],
      end: [min[0] - pad, max[1], max[2] + pad],
      value: max[1] - min[1],
    },
  ];
}

export interface CadPartLike {
  label: string;
  group: string;
  volume_m3: number;
  bbox_min_m: Vec3;
  bbox_max_m: Vec3;
}

function centre(part: CadPartLike): Vec3 {
  return [
    (part.bbox_min_m[0] + part.bbox_max_m[0]) / 2,
    (part.bbox_min_m[1] + part.bbox_max_m[1]) / 2,
    (part.bbox_min_m[2] + part.bbox_max_m[2]) / 2,
  ];
}

/** Duplicate labels (four axle bushes) are disambiguated by bounding-box centre. */
export function matchCadPart(
  label: string,
  centroid: Vec3,
  parts: readonly CadPartLike[],
): CadPartLike | null {
  const same = parts.filter((p) => p.label === label);
  if (same.length === 0) return null;
  if (same.length === 1) return same[0];
  return same.toSorted((a, b) => {
    const ca = centre(a);
    const cb = centre(b);
    return (
      Math.hypot(ca[0] - centroid[0], ca[1] - centroid[1], ca[2] - centroid[2]) -
      Math.hypot(cb[0] - centroid[0], cb[1] - centroid[1], cb[2] - centroid[2])
    );
  })[0];
}

export function notWatertight(label: string, warnings: readonly string[]): boolean {
  return warnings.some((w) => w.includes(`part '${label}'`) && w.includes("not watertight"));
}
