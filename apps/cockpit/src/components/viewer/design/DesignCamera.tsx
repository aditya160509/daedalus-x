"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import type { CameraPreset } from "../types";
import { TURNTABLE_DEG_PER_S } from "./studio";
import type { CameraBus, Frame } from "./types";

const DIRECTIONS: Record<CameraPreset, [number, number, number]> = {
  iso: [1, 0.55, 1],
  front: [1, 0.08, 0.001],
  side: [0.001, 0.08, 1],
  top: [0.001, 1, 0.001],
};

/**
 * Orbit rig for the design studio. Turntable is the camera orbiting the car at 6°/s
 * (OrbitControls speed 1 is one orbit per 60 s), so the baked contact shadow stays valid.
 */
export function DesignCamera({
  preset,
  presetNonce,
  frame,
  bus,
  id,
  turntable,
  reducedMotion,
}: {
  preset: CameraPreset;
  presetNonce: number;
  frame: Frame;
  bus: CameraBus;
  id: string;
  turntable: boolean;
  reducedMotion: boolean;
}) {
  const controls = useRef<Controls>(null);
  const applying = useRef(false);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const centre = new THREE.Vector3(...frame.center);
    camera.position.copy(
      new THREE.Vector3(...DIRECTIONS[preset])
        .normalize()
        .multiplyScalar(frame.radius * 4.4) // room for dimension lines and the viewport chrome
        .add(centre),
    );
    camera.lookAt(centre);
    controls.current?.target.copy(centre);
    controls.current?.update();
    // A repeated preset click intentionally re-frames the same camera pose.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [camera, frame, preset, presetNonce]);

  useEffect(
    () =>
      bus.subscribe((owner, pose) => {
        if (owner === id) return;
        applying.current = true;
        camera.position.set(...pose.position);
        controls.current?.target.set(...pose.target);
        controls.current?.update();
        camera.lookAt(new THREE.Vector3(...pose.target));
        applying.current = false;
      }),
    [bus, camera, id],
  );

  // OrbitControls' own autoRotate is frame-rate dependent; rotate by delta so it is exactly 6°/s.
  useFrame((_, delta) => {
    if (!turntable || reducedMotion || !controls.current) return;
    const step = THREE.MathUtils.degToRad(TURNTABLE_DEG_PER_S) * Math.min(delta, 0.1);
    controls.current.setAzimuthalAngle(controls.current.getAzimuthalAngle() + step);
  });

  const publish = () => {
    if (!applying.current && controls.current) {
      bus.publish(id, {
        position: camera.position.toArray(),
        target: controls.current.target.toArray(),
      });
    }
  };

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={frame.radius * 0.45}
      maxDistance={frame.radius * 18}
      onChange={publish}
    />
  );
}
