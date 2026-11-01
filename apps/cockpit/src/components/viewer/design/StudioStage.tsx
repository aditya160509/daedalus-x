"use client";

import {
  AccumulativeShadows,
  Environment,
  Grid,
  Lightformer,
  MeshReflectorMaterial,
  RandomizedLight,
} from "@react-three/drei";
import { useMemo } from "react";
import {
  ENGINEERING_BACKGROUND,
  FLOOR_COLOUR,
  FLOOR_MIRROR,
  FLOOR_MIX_STRENGTH,
  FLOOR_RESOLUTION,
  SHADOW_FRAMES,
  SHADOW_LIGHT_AMOUNT,
  SHADOW_OPACITY,
  SHADOW_RESOLUTION,
  SHADOW_SCALE,
  STUDIO_AMBIENT,
  STUDIO_BACKGROUND,
  STUDIO_LIGHTFORMERS,
} from "./studio";
import type { Frame, ViewMode } from "./types";

/**
 * Studio mode: softbox environment, accumulated contact shadow and a low-strength reflective
 * floor. Engineering mode: neutral lights and a measurement grid. No HDR download in either.
 */
export function StudioStage({
  mode,
  frame,
  floorY,
  maxDim,
}: {
  mode: ViewMode;
  frame: Frame;
  floorY: number;
  maxDim: number;
}) {
  const [cx, , cz] = frame.center;
  const cell = useMemo(() => niceStep(maxDim / 10), [maxDim]);

  if (mode === "engineering") {
    return (
      <>
        <hemisphereLight args={["#dfe8f2", "#151a20", 0.9]} />
        <directionalLight position={[5, 8, 5]} intensity={1.6} />
        <directionalLight position={[-6, 3, -4]} intensity={0.6} color="#9ec9ff" />
        <Grid
          position={[cx, floorY - 1e-4, cz]}
          args={[100, 100]}
          cellSize={cell}
          sectionSize={cell * 5}
          cellColor="#1c232c"
          sectionColor="#2b3542"
          fadeDistance={maxDim * 9}
          infiniteGrid
        />
        <color attach="background" args={[ENGINEERING_BACKGROUND]} />
      </>
    );
  }

  return (
    <>
      <color attach="background" args={[STUDIO_BACKGROUND]} />
      <Environment resolution={256}>
        {STUDIO_LIGHTFORMERS.map((light) => (
          <Lightformer
            key={`${light.position.join(",")}-${light.intensity}`}
            form={light.form}
            intensity={light.intensity}
            position={light.position}
            rotation={light.rotation}
            scale={light.scale}
            color={light.colour}
          />
        ))}
      </Environment>
      <hemisphereLight args={["#e8eef4", "#111418", STUDIO_AMBIENT]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, floorY - 0.0006, cz]}>
        <planeGeometry args={[maxDim * 14, maxDim * 14]} />
        <MeshReflectorMaterial
          resolution={FLOOR_RESOLUTION}
          blur={[300, 120]}
          mixBlur={1}
          mixStrength={FLOOR_MIX_STRENGTH}
          roughness={0.95}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color={FLOOR_COLOUR}
          metalness={0.35}
          mirror={FLOOR_MIRROR}
        />
      </mesh>
      <AccumulativeShadows
        temporal
        frames={SHADOW_FRAMES}
        alphaTest={0.75}
        opacity={SHADOW_OPACITY}
        scale={maxDim * SHADOW_SCALE}
        position={[cx, floorY + 0.0002, cz]}
        color="#000000"
        resolution={SHADOW_RESOLUTION}
      >
        <RandomizedLight
          amount={SHADOW_LIGHT_AMOUNT}
          radius={maxDim * 0.9}
          position={[maxDim, maxDim * 2.4, maxDim]}
          bias={0.001}
          size={maxDim * 1.6}
        />
      </AccumulativeShadows>
    </>
  );
}

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 2 ? 1 : f < 5 ? 2 : 5) * p;
}
