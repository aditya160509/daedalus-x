"use client";

import { Line } from "@react-three/drei";
import { SceneLabel } from "@/components/scene/SceneLabel";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { LoadedModel } from "@/lib/gltf";
import { carForwardYaw, type LabelledCentroid } from "./raceMath";
import { positionAt, type RaceTrace } from "./useRaceCar";

export type ReplayCamera = "side" | "chase" | "top";

const PRIMARY_LANE = -0.09;
const GHOST_LANE = 0.09;
const TRACK_HALF_WIDTH = 0.19;

const PRIMARY_BODY = "#c8d2da";
const GHOST_BODY = "#5d6f7d";

function blobTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(0,0,0,0.55)");
    gradient.addColorStop(0.55, "rgba(0,0,0,0.28)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Ground shadow that travels with a car; cheaper and steadier than a contact-shadow pass. */
function BlobShadow() {
  const texture = useMemo(() => blobTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.0008, 0]} scale={[0.19, 0.11, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/**
 * One car at its true GLB scale. The display mesh is cloned so two cars can carry different
 * materials; the clone shares geometry with the loaded model.
 */
function ReplayCar({
  model,
  trace,
  cursor,
  lane,
  body,
}: {
  model: LoadedModel;
  trace: RaceTrace;
  cursor: number;
  lane: number;
  body: string;
}) {
  const clone = useMemo(() => model.scene.clone(true), [model.scene]);
  const parts = useMemo<LabelledCentroid[]>(
    () =>
      model.parts.map((part) => ({
        label: part.label,
        centroid: part.centroid,
      })),
    [model.parts],
  );
  const yaw = useMemo(() => carForwardYaw(parts), [parts]);

  useLayoutEffect(() => {
    const created: THREE.Material[] = [];
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = new THREE.MeshStandardMaterial({
        color: body,
        metalness: 0.45,
        roughness: 0.38,
      });
      object.material = material;
      created.push(material);
    });
    return () => {
      for (const material of created) material.dispose();
    };
  }, [clone, body]);

  const x = positionAt(cursor, trace) ?? 0;
  const { min, center } = model.bounds;
  return (
    <group position={[x, 0, lane]}>
      <group rotation-y={yaw}>
        <primitive
          object={clone}
          position={[-center[0], -min[1], -center[2]]}
          frustumCulled={false}
        />
      </group>
      <BlobShadow />
    </group>
  );
}

function Gate({
  x,
  label,
  color,
  start,
}: {
  x: number;
  label: string;
  color: string;
  start: boolean;
}) {
  return (
    <group position={[x, 0, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.085, side * (TRACK_HALF_WIDTH + 0.02)]}>
          <boxGeometry args={[0.006, 0.17, 0.006]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.006, 0.006, TRACK_HALF_WIDTH * 2 + 0.046]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <SceneLabel size={0.035} color="#ececee" position={[0, 0.2, 0]}>
        {(start ? "start" : label).toUpperCase()}
      </SceneLabel>
    </group>
  );
}

function Track({ trackM }: { trackM: number }) {
  const markers = useMemo(() => {
    const list: number[] = [];
    for (let x = 5; x < trackM; x += 5) list.push(x);
    return list;
  }, [trackM]);
  const centre = trackM / 2;
  const edge = (z: number) => (
    <Line
      points={[
        [0, 0.0012, z],
        [trackM, 0.0012, z],
      ]}
      color="#2b3037"
      lineWidth={1}
    />
  );
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[centre, -0.001, 0]}>
        <planeGeometry args={[trackM + 1.2, TRACK_HALF_WIDTH * 2 + 0.16]} />
        <meshStandardMaterial color="#0c0e11" roughness={0.95} metalness={0.05} />
      </mesh>
      {edge(-TRACK_HALF_WIDTH)}
      {edge(TRACK_HALF_WIDTH)}
      <Line
        points={[
          [0, 0.0013, 0],
          [trackM, 0.0013, 0],
        ]}
        color="#3a4149"
        lineWidth={1}
        dashed
        dashSize={0.14}
        gapSize={0.12}
      />
      {markers.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.0014, 0]}>
            <boxGeometry args={[0.004, 0.0006, TRACK_HALF_WIDTH * 2]} />
            <meshBasicMaterial color="#4a525c" />
          </mesh>
          <SceneLabel size={0.028} color="#8a8a93" position={[0, 0.012, -TRACK_HALF_WIDTH - 0.05]}>
            {`${x} m`}
          </SceneLabel>
        </group>
      ))}
      <Gate x={0} label="start" color="#3dd6f0" start />
      <Gate x={trackM} label={`finish · ${trackM.toFixed(0)} m`} color="#e7ebef" start={false} />
    </group>
  );
}

const DESIRED = new THREE.Vector3();
const LOOK_AT = new THREE.Vector3();

function FollowCamera({ x, mode }: { x: number; mode: ReplayCamera }) {
  const { camera } = useThree();
  const [target] = useState(() => new THREE.Vector3(x, 0.03, 0));
  const [look] = useState(() => new THREE.Vector3(x, 0.03, 0));
  useFrame((_, delta) => {
    const step = 1 - Math.exp(-6 * Math.min(delta, 0.1));
    if (mode === "side") DESIRED.set(x + 0.15, 0.16, 0.8);
    else if (mode === "chase") DESIRED.set(x - 0.5, 0.16, 0.1);
    else DESIRED.set(x, 0.62, 0.001);
    target.lerp(DESIRED, step);
    look.lerp(LOOK_AT.set(x + (mode === "chase" ? 0.08 : 0), 0.035, 0), step);
    camera.position.copy(target);
    camera.lookAt(look);
  });
  return null;
}

function SceneContents({
  trackM,
  model,
  ghostModel,
  primary,
  ghost,
  cursor,
  camera,
}: {
  trackM: number;
  model: LoadedModel;
  ghostModel: LoadedModel | null;
  primary: RaceTrace;
  ghost: RaceTrace | null;
  cursor: number;
  camera: ReplayCamera;
}) {
  const x = positionAt(cursor, primary) ?? 0;
  return (
    <>
      <color attach="background" args={["#0b0b0c"]} />
      <fog attach="fog" args={["#0b0b0c", 1.2, 3.2]} />
      <hemisphereLight args={["#9fb4c8", "#0b0b0c", 1.1]} />
      <directionalLight position={[1.2, 1.4, 0.8]} intensity={2.1} color="#ffffff" />
      <directionalLight position={[-1, 0.6, -0.8]} intensity={0.7} color="#7fb4d8" />
      <Track trackM={trackM} />
      <ReplayCar
        model={model}
        trace={primary}
        cursor={cursor}
        lane={PRIMARY_LANE}
        body={PRIMARY_BODY}
      />
      {ghost && ghostModel && (
        <ReplayCar
          model={ghostModel}
          trace={ghost}
          cursor={cursor}
          lane={GHOST_LANE}
          body={GHOST_BODY}
        />
      )}
      <FollowCamera x={x} mode={camera} />
    </>
  );
}

/** The 3D replay stage: true-scale cars on a 20 m lane with a following camera. */
export function RaceTrackScene({
  trackM,
  model,
  ghostModel,
  primary,
  ghost,
  cursor,
  camera,
}: {
  trackM: number;
  model: LoadedModel;
  ghostModel: LoadedModel | null;
  primary: RaceTrace;
  ghost: RaceTrace | null;
  cursor: number;
  camera: ReplayCamera;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 35, near: 0.01, far: 100, position: [0.2, 0.15, 0.6] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ cursor: "grab" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <SceneContents
        trackM={trackM}
        model={model}
        ghostModel={ghostModel}
        primary={primary}
        ghost={ghost}
        cursor={cursor}
        camera={camera}
      />
    </Canvas>
  );
}
