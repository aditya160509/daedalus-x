"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { FlowSlices } from "../../../lib/api";
import { sample } from "../../../lib/colormap";
import { arrowSamples } from "./flowMath";

export function FlowArrows({
  mesh,
  index,
  height,
}: {
  mesh: FlowSlices;
  index: number;
  height: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () => arrowSamples(mesh, mesh.offsets, Math.min(index, mesh.x_m.length - 1)),
    [mesh, index],
  );
  useEffect(() => {
    const instance = ref.current;
    if (!instance) return;
    const object = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    data.samples.forEach((s, i) => {
      const length = height * 0.15 * Math.min(2, s.speed / (data.p95 || 1));
      object.position.set(...s.position);
      object.quaternion.setFromUnitVectors(up, new THREE.Vector3(...s.vector).normalize());
      object.scale.set(length * 0.15, length, length * 0.15);
      object.updateMatrix();
      instance.setMatrixAt(i, object.matrix);
      instance.setColorAt(i, new THREE.Color(...sample("turbo", s.speed / (data.p95 || 1))));
    });
    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true;
    instance.computeBoundingSphere();
  }, [data, height]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, data.samples.length]}
      raycast={() => null}
    >
      <coneGeometry args={[1, 1, 6]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}
