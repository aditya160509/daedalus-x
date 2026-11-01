"use client";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import { FlyThrough } from "./FlyThrough";
import type { SceneProps } from "./types";

const DIRECTIONS = {
  iso: [-1, 0.55, 0.9],
  front: [-1, 0.08, 0.001],
  side: [0.001, 0.08, 1],
  top: [0.001, 1, 0.001],
} as const;
export function CameraControls({
  field,
  preset,
  presetNonce,
  id,
  bus,
  fly,
  onFlyEnd,
}: Pick<SceneProps, "field" | "preset" | "presetNonce" | "id" | "bus" | "fly" | "onFlyEnd">) {
  const controls = useRef<Controls>(null);
  const applying = useRef(false);
  const camera = useThree((s) => s.camera);
  const length = field.meta.car.length_m,
    height = field.meta.car.height_m;
  const publish = () => {
    if (!applying.current && controls.current)
      bus.publish(id, {
        position: camera.position.toArray(),
        target: controls.current.target.toArray(),
      });
  };
  useEffect(() => {
    const center = new THREE.Vector3(length * 0.5, height * 0.4, 0);
    camera.position.copy(
      new THREE.Vector3(...DIRECTIONS[preset])
        .normalize()
        .multiplyScalar(length * 2)
        .add(center),
    );
    controls.current?.target.copy(center);
    controls.current?.update();
    // A repeated preset click intentionally resets the same camera pose.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [camera, length, height, preset, presetNonce]);
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
  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enabled={!fly}
        onChange={publish}
      />
      <FlyThrough
        playing={fly}
        length={length}
        height={height}
        controls={controls}
        onEnd={onFlyEnd}
        publish={publish}
      />
    </>
  );
}
