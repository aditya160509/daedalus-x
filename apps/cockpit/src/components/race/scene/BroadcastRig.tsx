"use client";

// Camera/light setup adapted from pmndrs/racing-game, MIT (see THIRD_PARTY.md).
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

export type ReplayCamera = "auto" | "side" | "chase" | "onboard" | "top" | "finish";

export function BroadcastCamera({
  distance,
  trackM,
  mode,
  rearDistance,
}: {
  distance: number;
  trackM: number;
  mode: ReplayCamera;
  rearDistance: number;
}) {
  const { camera } = useThree();
  const previous = useRef("");
  const [desired] = useState(() => new THREE.Vector3());
  const [target] = useState(() => new THREE.Vector3());
  const active =
    mode === "auto"
      ? distance < 1
        ? "chase"
        : distance < trackM * 0.72
          ? "side"
          : distance < trackM - 1
            ? "top"
            : "finish"
      : mode;
  useFrame((_, delta) => {
    target.set(distance - 0.08, 0.025, 0);
    if (active === "chase") desired.set(distance - 0.62, 0.22, 0.2);
    else if (active === "onboard") {
      desired.set(distance - 0.13, 0.065, -0.09);
      target.set(distance + 1.2, 0.03, -0.09);
    } else if (active === "top") desired.set(distance - 0.05, 0.95, 0.001);
    else if (active === "finish") {
      const behind = Math.max(0, trackM - Math.min(distance, rearDistance));
      const centre = trackM - behind / 2;
      desired.set(centre + 0.04, 0.19 + behind * 0.12, 0.65 + behind * 0.7);
      target.set(centre - 0.04, 0.02, 0);
    } else desired.set(distance - 0.05, 0.19, 0.85);
    if (previous.current !== active) camera.position.copy(desired);
    else camera.position.lerp(desired, 1 - Math.exp(-12 * Math.min(delta, 0.1)));
    previous.current = active;
    camera.lookAt(target);
  });
  return null;
}

export function BroadcastLights({ low }: { low: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#dce7f5", "#161b23", 1.2]} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={3}
        castShadow={!low}
        shadow-bias={-0.001}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2}
        shadow-camera-right={22}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[12, 2, -3]} intensity={1.4} color="#b7d3e6" />
    </>
  );
}
