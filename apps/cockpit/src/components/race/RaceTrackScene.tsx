"use client";

import { PerformanceMonitor, Stats } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA } from "@react-three/postprocessing";
import { useImperativeHandle, useState, type RefObject } from "react";
import * as THREE from "three";
import type { LoadedModel } from "@/lib/gltf";
import { positionAt, type RaceTrace } from "./useRaceCar";
import { BroadcastCamera, BroadcastLights, type ReplayCamera } from "./scene/BroadcastRig";
import { ReplayCar, LaunchPuff } from "./scene/ReplayCar";
import { Track } from "./scene/Track";
export type { ReplayCamera } from "./scene/BroadcastRig";

function StillCapture({ capture }: { capture: RefObject<(() => void) | null> }) {
  const { gl, scene, camera } = useThree();
  useImperativeHandle(
    capture,
    () => () => {
      gl.render(scene, camera);
      gl.domElement.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "daedalus-predicted-photo-finish.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      });
    },
    [gl, scene, camera],
  );
  return null;
}

/** True engineering scale, with adaptive reflections/effects rather than a fixed heavy preset. */
export function RaceTrackScene({
  trackM,
  model,
  ghostModel,
  primary,
  ghost,
  cursor,
  camera,
  capture,
  stats,
}: {
  trackM: number;
  model: LoadedModel;
  ghostModel: LoadedModel | null;
  primary: RaceTrace;
  ghost: RaceTrace | null;
  cursor: number;
  camera: ReplayCamera;
  capture: RefObject<(() => void) | null>;
  stats: boolean;
}) {
  const [low, setLow] = useState(false);
  const x = Math.min(trackM, positionAt(cursor, primary) ?? 0);
  const gx = ghost ? Math.min(trackM, positionAt(cursor, ghost) ?? 0) : 0;
  return (
    <Canvas
      dpr={low ? 1 : [1, 1.5]}
      shadows={low ? false : "percentage"}
      camera={{ fov: 38, near: 0.005, far: 80, position: [0, 0.2, 0.85] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <color attach="background" args={["#171c23"]} />
      <fog attach="fog" args={["#171c23", 5, 30]} />
      <PerformanceMonitor
        bounds={() => [45, 58]}
        flipflops={3}
        onDecline={() => setLow(true)}
        onIncline={() => setLow(false)}
        onFallback={() => setLow(true)}
      />
      <BroadcastLights low={low} />
      <Track length={trackM} time={cursor} distance={x} low={low} />
      <ReplayCar model={model} distance={x} lane={-0.09} />
      {ghost && ghostModel && <ReplayCar model={ghostModel} distance={gx} lane={0.09} ghost />}
      <LaunchPuff time={cursor} />
      <BroadcastCamera distance={x} rearDistance={ghost ? gx : x} trackM={trackM} mode={camera} />
      {!low && (
        <EffectComposer multisampling={0}>
          <SMAA />
          <Bloom intensity={0.12} luminanceThreshold={1.8} mipmapBlur />
        </EffectComposer>
      )}
      <StillCapture capture={capture} />
      {stats && <Stats className="race-performance" />}
    </Canvas>
  );
}
