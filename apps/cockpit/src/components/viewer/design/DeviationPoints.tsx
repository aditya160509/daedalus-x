"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { DeviationRender } from "./deviation";

/** Colour-mapped sampled points over the revision surface. Sized from the model, not the camera. */
export function DeviationPoints({ data, radius }: { data: DeviationRender; radius: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    return g;
  }, [data]);
  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={4}>
      <pointsMaterial
        vertexColors
        size={Math.max(radius * 0.004, 0.002)}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
