"use client";

import { Bounds, GizmoHelper, GizmoViewport, OrbitControls, useBounds } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { FlowField, FlowLines, FlowMesh } from "@/lib/api";
import { type ColormapName, colorize } from "@/lib/colormap";
import type { CameraPreset } from "./CarViewer";

export interface FlowLayers {
  surface: "cp" | "plain" | "off";
  streamlines: boolean;
  wake: boolean;
  centreline: boolean;
  animate: boolean;
}

export interface Probe {
  layer: string;
  value: number;
  name: string;
}

// Engineering frame (x downstream, y lateral, z up) -> three.js (y up).
const ENG_TO_THREE = new THREE.Euler(-Math.PI / 2, 0, 0);

const PRESET_DIR: Record<CameraPreset, [number, number, number]> = {
  iso: [-1, 0.55, 0.9],
  front: [-1, 0.08, 0.001],
  side: [0.001, 0.08, 1],
  top: [0.001, 1, 0.001],
};

/** Renders the exported OpenFOAM fields around the car. Display only; numbers come from the API. */
export function FlowViewer({
  field,
  layers,
  cpRange,
  preset,
  presetNonce,
  onProbe,
}: {
  field: FlowField;
  layers: FlowLayers;
  cpRange: [number, number];
  preset: CameraPreset;
  presetNonce: number;
  onProbe: (p: Probe | null) => void;
}) {
  // If the GPU drops the context (driver reset, memory pressure), remount a fresh renderer.
  const [generation, setGeneration] = useState(0);
  return (
    <Canvas
      key={generation}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            setTimeout(() => setGeneration((g) => g + 1), 250);
          },
          { once: true },
        );
      }}
      camera={{ fov: 32, near: 0.001, far: 100, position: [-0.3, 0.15, 0.3] }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => onProbe(null)}
    >
      <color attach="background" args={["#08090b"]} />
      <hemisphereLight args={["#e6edf5", "#14181d", 0.8]} />
      <directionalLight position={[-2, 4, 3]} intensity={1.4} />
      <directionalLight position={[3, 2, -3]} intensity={0.5} color="#9ec9ff" />
      <group rotation={ENG_TO_THREE}>
        <Bounds fit clip margin={1.15}>
          {layers.surface !== "off" && (
            <SurfaceMesh
              mesh={field.surface}
              range={cpRange}
              plain={layers.surface === "plain"}
              onProbe={onProbe}
            />
          )}
          <CameraPresets preset={preset} nonce={presetNonce} />
        </Bounds>
        {layers.streamlines && <Streamlines lines={field.streamlines} animate={layers.animate} />}
        {layers.wake && <SliceMesh mesh={field.wake} label="wake" onProbe={onProbe} />}
        {layers.centreline && (
          <SliceMesh mesh={field.centreline} label="centreline" onProbe={onProbe} />
        )}
        <GroundPlane length={field.meta.car.length_m} width={field.meta.car.width_m} />
      </group>
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
      <GizmoHelper alignment="bottom-left" margin={[56, 56]}>
        <GizmoViewport axisColors={["#f0525a", "#3ccf91", "#5aa8ff"]} labelColor="#090b0e" />
      </GizmoHelper>
    </Canvas>
  );
}

function useMeshGeometry(mesh: FlowMesh, colors: Float32Array) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [mesh]);
  useEffect(() => {
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }, [geometry, colors]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function probeValue(e: ThreeEvent<PointerEvent>, scalar: Float32Array): number | null {
  const f = e.face;
  if (!f) return null;
  return (scalar[f.a] + scalar[f.b] + scalar[f.c]) / 3;
}

function SurfaceMesh({
  mesh,
  range,
  plain,
  onProbe,
}: {
  mesh: FlowMesh;
  range: [number, number];
  plain: boolean;
  onProbe: (p: Probe | null) => void;
}) {
  const colors = useMemo(
    () =>
      plain
        ? new Float32Array(mesh.scalar.length * 3).fill(0.62)
        : colorize(mesh.scalar, range, "coolwarm"),
    [mesh, range, plain],
  );
  const geometry = useMeshGeometry(mesh, colors);
  return (
    <mesh
      geometry={geometry}
      onPointerMove={(e) => {
        e.stopPropagation();
        const v = probeValue(e, mesh.scalar);
        if (v != null) onProbe({ layer: "surface", value: v, name: mesh.name });
      }}
      onPointerOut={() => onProbe(null)}
    >
      <meshStandardMaterial vertexColors roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

function SliceMesh({
  mesh,
  label,
  onProbe,
}: {
  mesh: FlowMesh;
  label: string;
  onProbe: (p: Probe | null) => void;
}) {
  const colors = useMemo(() => colorize(mesh.scalar, mesh.range, "turbo"), [mesh]);
  const geometry = useMeshGeometry(mesh, colors);
  return (
    <mesh
      geometry={geometry}
      onPointerMove={(e) => {
        e.stopPropagation();
        const v = probeValue(e, mesh.scalar);
        if (v != null) onProbe({ layer: label, value: v, name: mesh.name });
      }}
      onPointerOut={() => onProbe(null)}
    >
      <meshBasicMaterial
        vertexColors
        side={THREE.DoubleSide}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </mesh>
  );
}

const STREAM_VERT = /* glsl */ `
  attribute vec3 color;
  attribute float arc;
  varying vec3 vColor;
  varying float vArc;
  void main() {
    vColor = color;
    vArc = arc;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const STREAM_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uAnimate;
  varying vec3 vColor;
  varying float vArc;
  void main() {
    // Pulses travel downstream at a speed proportional to arc length per second.
    float phase = fract(vArc * 18.0 - uTime * 0.9);
    float pulse = smoothstep(0.0, 0.08, phase) * (1.0 - smoothstep(0.08, 0.55, phase));
    float a = mix(0.85, 0.22 + 0.9 * pulse, uAnimate);
    gl_FragColor = vec4(vColor * (0.75 + 0.6 * pulse * uAnimate), a);
  }
`;

function Streamlines({ lines, animate }: { lines: FlowLines; animate: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const { positions, offsets, scalar, range } = lines;
    const nLines = offsets.length - 1;
    const segCount = offsets[nLines] - nLines;
    const index = new Uint32Array(Math.max(segCount, 0) * 2);
    const arc = new Float32Array(scalar.length);
    let k = 0;
    for (let l = 0; l < nLines; l++) {
      let s = 0;
      for (let i = offsets[l]; i < offsets[l + 1]; i++) {
        if (i > offsets[l]) {
          const dx = positions[3 * i] - positions[3 * i - 3];
          const dy = positions[3 * i + 1] - positions[3 * i - 2];
          const dz = positions[3 * i + 2] - positions[3 * i - 1];
          s += Math.sqrt(dx * dx + dy * dy + dz * dz);
          index[k++] = i - 1;
          index[k++] = i;
        }
        arc[i] = s;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colorize(scalar, range, "turbo"), 3));
    g.setAttribute("arc", new THREE.BufferAttribute(arc, 1));
    g.setIndex(new THREE.BufferAttribute(index.subarray(0, k), 1));
    return g;
  }, [lines]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uAnimate: { value: 1 } }), []);
  useFrame((_, dt) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uAnimate.value = animate ? 1 : 0;
    if (animate) m.uniforms.uTime.value += dt;
  });
  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <shaderMaterial
        ref={material}
        vertexShader={STREAM_VERT}
        fragmentShader={STREAM_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </lineSegments>
  );
}

function GroundPlane({ length, width }: { length: number; width: number }) {
  // Moving-ground belt of the virtual tunnel, drawn just below z = 0.
  const size: [number, number] = [length * 3.2, width * 2.6];
  return (
    <mesh position={[length * 0.9, 0, -0.0002]} raycast={() => null}>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#111418" roughness={0.95} />
    </mesh>
  );
}

function CameraPresets({ preset, nonce }: { preset: CameraPreset; nonce: number }) {
  const bounds = useBounds();
  useEffect(() => {
    const box = bounds.refresh().getSize();
    const dist = box.distance * 1.4;
    const [x, y, z] = PRESET_DIR[preset];
    const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(dist);
    bounds.moveTo(box.center.clone().add(dir)).lookAt({ target: box.center });
  }, [bounds, preset, nonce]);
  return null;
}

export type { ColormapName };
