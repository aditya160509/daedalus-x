"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { FlowMesh, FlowSlices } from "@/lib/api";
import { colorize } from "@/lib/colormap";
import { sliceRange } from "./flowMath";
import { probe, useFlowGeometry } from "./geometry";
import type { Probe } from "./types";

export function scalarMesh(mesh: FlowMesh, name: string): FlowMesh {
  const scalar = mesh.scalars?.[name];
  return scalar ? { ...mesh, scalar, range: mesh.ranges?.[name] ?? mesh.range, name } : mesh;
}

export function SliceMesh({
  mesh,
  label,
  opacity = 1,
  drawRange,
  onProbe,
}: {
  mesh: FlowMesh;
  label: string;
  opacity?: number;
  drawRange?: [number, number];
  onProbe: (p: Probe | null) => void;
}) {
  const colors = useMemo(() => colorize(mesh.scalar, mesh.range, "turbo"), [mesh]);
  const geometry = useFlowGeometry(mesh, colors);
  const start = drawRange?.[0] ?? 0,
    count = drawRange?.[1] ?? mesh.indices.length;
  useEffect(() => {
    geometry.setDrawRange(start, count);
  }, [geometry, start, count]);
  return (
    <mesh
      geometry={geometry}
      onPointerMove={(e) => onProbe(probe(e, mesh, label))}
      onPointerOut={() => onProbe(null)}
    >
      <meshBasicMaterial
        vertexColors
        side={THREE.DoubleSide}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity === 1}
      />
    </mesh>
  );
}

export function WakeScanner({
  slices,
  legacy,
  index,
  scalar,
  onProbe,
}: {
  slices?: FlowSlices;
  legacy: FlowMesh;
  index: number;
  scalar: string;
  onProbe: (p: Probe | null) => void;
}) {
  const selected = useMemo(() => scalarMesh(slices ?? legacy, scalar), [slices, legacy, scalar]);
  if (!slices) return <SliceMesh mesh={selected} label="wake" onProbe={onProbe} />;
  const active = Math.min(slices.x_m.length - 1, Math.max(0, index));
  return (
    <group>
      {[active - 1, active, active + 1]
        .filter((i) => i >= 0 && i < slices.x_m.length)
        .map((i) => (
          <SliceMesh
            key={i}
            mesh={selected}
            label={`x ${(slices.x_m[i] * 1000).toFixed(1)} mm`}
            drawRange={sliceRange(slices.offsets, i)}
            opacity={i === active ? 1 : 0.12}
            onProbe={onProbe}
          />
        ))}
    </group>
  );
}
