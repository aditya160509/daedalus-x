"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { carForwardYaw } from "../raceMath";
import type { LoadedModel } from "@/lib/gltf";

/** Source GLB is in engineering metres (Z up). Convert once to Three's Y-up frame. */
export function ReplayCar({
  model,
  distance,
  lane,
  ghost = false,
}: {
  model: LoadedModel;
  distance: number;
  lane: number;
  ghost?: boolean;
}) {
  const clone = useMemo(() => model.scene.clone(true), [model.scene]);
  const wheels = useRef<{ pivot: THREE.Group; radius: number }[]>([]);
  const yaw = useMemo(() => carForwardYaw(model.parts), [model.parts]);
  useLayoutEffect(() => {
    const created: THREE.Material[] = [];
    const pivots: THREE.Group[] = [];
    const moving: { pivot: THREE.Group; radius: number }[] = [];
    const meshes: THREE.Mesh[] = [];
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    for (const mesh of meshes) {
      const name = mesh.name.toLowerCase();
      const wheel = /wheel/.test(name) && !/axle|bush|bearing/.test(name);
      const metal = /cartridge|axle|bush|bearing/.test(name);
      const material = new THREE.MeshStandardMaterial({
        color: wheel ? "#202329" : metal ? "#a0a7ae" : ghost ? "#a8b4c3" : "#2c8d97",
        metalness: metal ? 0.8 : wheel ? 0.05 : 0.55,
        roughness: metal ? 0.27 : wheel ? 0.78 : 0.3,
        transparent: ghost,
        opacity: ghost ? 0.4 : 1,
        depthWrite: !ghost,
      });
      // CAD exports encode group colours as vertex attributes; team paint is intentional here.
      mesh.material = material;
      mesh.castShadow = !ghost;
      mesh.receiveShadow = !ghost;
      created.push(material);
      if (wheel && mesh.parent) {
        mesh.geometry.computeBoundingBox();
        const bounds = mesh.geometry.boundingBox;
        if (!bounds) continue;
        const centre = bounds.getCenter(new THREE.Vector3());
        const radius = (bounds.max.z - bounds.min.z) / 2;
        if (!(radius > 0)) continue;
        const pivot = new THREE.Group();
        pivot.position.copy(centre).add(mesh.position);
        const parent = mesh.parent;
        parent.add(pivot);
        mesh.position.copy(centre).multiplyScalar(-1);
        pivot.add(mesh);
        moving.push({ pivot, radius });
        pivots.push(pivot);
      }
    }
    wheels.current = moving;
    return () => {
      // Geometry belongs to the loaded GLB; only dispose materials created by this instance.
      wheels.current = [];
      for (const pivot of pivots) {
        const child = pivot.children[0];
        if (child && pivot.parent) {
          child.position.add(pivot.position);
          pivot.parent.add(child);
        }
        pivot.removeFromParent();
      }
      for (const material of created) material.dispose();
    };
  }, [clone, ghost]);
  useFrame(() => {
    for (const { pivot, radius } of wheels.current)
      pivot.rotation.set(0, (distance / radius) * (yaw === 0 ? 1 : -1), 0);
  });
  const { min, center } = model.bounds;
  return (
    <group position={[distance - model.extents.x / 2, 0, lane]}>
      <group rotation-y={yaw}>
        <group rotation-x={-Math.PI / 2}>
          <primitive object={clone} position={[-center[0], -center[1], -min[2]]} />
        </group>
      </group>
    </group>
  );
}

/** A deterministic launch puff is a visual cue, not an exhaust-flow simulation. */
export function LaunchPuff({ time }: { time: number }) {
  const material = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(
    () =>
      Float32Array.from({ length: 32 * 3 }, (_, i) => {
        const n = Math.floor(i / 3);
        const axis = i % 3;
        return axis === 0
          ? -0.22 - (n / 32) * 0.15
          : axis === 1
            ? 0.025 + Math.sin(n * 2.4) * 0.012
            : -0.09 + Math.cos(n * 2.4) * 0.015;
      }),
    [],
  );
  useEffect(() => {
    if (material.current) material.current.opacity = Math.max(0, 1 - time / 0.12) * 0.4;
  }, [time]);
  return (
    <points visible={time > 0 && time < 0.12}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={material} size={0.007} color="#d2d8df" transparent depthWrite={false} />
    </points>
  );
}
