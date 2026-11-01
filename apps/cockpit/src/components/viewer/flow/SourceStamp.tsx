"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { FlowField } from "@/lib/api";

/** HTML overlays are absent from captureStream, so a recorded frame carries its own provenance. */
export function SourceStamp({ field, label }: { field: FlowField; label: string }) {
  const ref = useRef<THREE.Sprite>(null);
  const camera = useThree((s) => s.camera);
  const material = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create recording provenance label");
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = "#bfc0c2";
    ctx.font = "26px sans-serif";
    ctx.fillText(`Daedalus X · ${label.slice(0, 48)} · simulated`, 20, 45);
    ctx.font = "32px sans-serif";
    ctx.fillText(
      `${field.meta.acceptance} · U∞ ${field.meta.U_m_s} m/s · iteration ${field.meta.iterations ?? "unknown"}`,
      20,
      96,
    );
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({
      map,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
  }, [field, label]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );
  useFrame(() => {
    const sprite = ref.current;
    if (!sprite || !(camera instanceof THREE.PerspectiveCamera)) return;
    sprite.position.set(0, -0.78, 0).unproject(camera);
    const distance = sprite.position.distanceTo(camera.position);
    const worldHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const width = worldHeight * camera.aspect * 0.75;
    sprite.scale.set(width, width / 8, 1);
  });
  return <sprite ref={ref} material={material} renderOrder={1000} frustumCulled={false} />;
}
