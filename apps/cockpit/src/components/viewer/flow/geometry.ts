"use client";
import { useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { FlowMesh } from "@/lib/api";
import type { Probe } from "./types";

export function useFlowGeometry(mesh: FlowMesh, colors?: Float32Array) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    g.setAttribute("fieldValue", new THREE.BufferAttribute(mesh.scalar, 1));
    if (colors) g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [mesh, colors]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}
export function probe(e: ThreeEvent<PointerEvent>, mesh: FlowMesh, layer: string): Probe | null {
  if (!e.face) return null;
  e.stopPropagation();
  const { a, b, c } = e.face;
  return {
    layer,
    value: (mesh.scalar[a] + mesh.scalar[b] + mesh.scalar[c]) / 3,
    name: mesh.name,
    x: e.clientX,
    y: e.clientY,
  };
}
