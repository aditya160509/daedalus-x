"use client";

import {
  Bounds,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  useBounds,
} from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export type CameraPreset = "iso" | "front" | "side" | "top";

const PRESET_DIR: Record<CameraPreset, [number, number, number]> = {
  iso: [1, 0.6, 1],
  front: [1, 0.05, 0],
  side: [0, 0.05, 1],
  top: [0.001, 1, 0],
};

const HIGHLIGHT = new THREE.Color("#22d3ee");

/**
 * Display-only viewer for an imported GLB scene. Dimensions shown elsewhere come from this
 * display mesh and are labelled as approximate; exact checks use canonical CAD.
 */
export function CarViewer({
  scene,
  selected,
  onSelect,
  preset,
  presetNonce,
}: {
  scene: THREE.Object3D;
  selected: string | null;
  onSelect: (uuid: string | null) => void;
  preset: CameraPreset;
  presetNonce: number;
}) {
  useSelectionHighlight(scene, selected);
  const size = useMemo(
    () => new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()),
    [scene],
  );
  const floorY = useMemo(() => new THREE.Box3().setFromObject(scene).min.y, [scene]);
  const cell = niceStep(Math.max(size.x, size.z) / 10);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 35, near: 0.001, far: 1000, position: [2, 1.2, 2] }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#0b0e12"]} />
      <hemisphereLight args={["#dfe8f2", "#151a20", 0.9]} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} />
      <directionalLight position={[-6, 3, -4]} intensity={0.6} color="#9ec9ff" />
      <Bounds fit clip observe margin={1.25}>
        <primitive
          object={scene}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSelect(e.object.uuid);
          }}
        />
        <CameraPresets preset={preset} nonce={presetNonce} />
      </Bounds>
      <Grid
        position={[0, floorY - 1e-4, 0]}
        args={[100, 100]}
        cellSize={cell}
        sectionSize={cell * 5}
        cellColor="#1c232c"
        sectionColor="#2b3542"
        fadeDistance={Math.max(size.x, size.z) * 6}
        infiniteGrid
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
      <GizmoHelper alignment="bottom-left" margin={[64, 64]}>
        <GizmoViewport axisColors={["#f0525a", "#3ccf91", "#5aa8ff"]} labelColor="#090b0e" />
      </GizmoHelper>
    </Canvas>
  );
}

function CameraPresets({ preset, nonce }: { preset: CameraPreset; nonce: number }) {
  const bounds = useBounds();
  useEffect(() => {
    const box = bounds.refresh().getSize();
    const dist = box.distance * 1.6;
    const [x, y, z] = PRESET_DIR[preset];
    const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(dist);
    bounds.moveTo(box.center.clone().add(dir)).lookAt({ target: box.center });
    // `nonce` is a deliberate trigger: re-clicking the same preset must re-frame the camera.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [bounds, preset, nonce]);
  return null;
}

function useSelectionHighlight(scene: THREE.Object3D, selected: string | null) {
  useEffect(() => {
    const touched: Array<[THREE.MeshStandardMaterial, THREE.Color, number]> = [];
    if (selected) {
      scene.getObjectByProperty("uuid", selected)?.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m instanceof THREE.MeshStandardMaterial) {
            touched.push([m, m.emissive.clone(), m.emissiveIntensity]);
            m.emissive.copy(HIGHLIGHT);
            m.emissiveIntensity = 0.35;
          }
        }
      });
    }
    return () => {
      for (const [m, color, intensity] of touched) {
        m.emissive.copy(color);
        m.emissiveIntensity = intensity;
      }
    };
  }, [scene, selected]);
}

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 2 ? 1 : f < 5 ? 2 : 5) * p;
}
