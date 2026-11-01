"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { FlowMesh } from "../../../lib/api";
import { colorize } from "../../../lib/colormap";
import { useFlowGeometry } from "./geometry";

export function VortexCores({ mesh, level }: { mesh: FlowMesh; level: number }) {
  const colors = useMemo(() => colorize(mesh.scalar, mesh.range, "turbo"), [mesh]);
  const geometry = useFlowGeometry(mesh, colors);
  const q = mesh.scalars?.Q_level;
  useEffect(() => {
    if (q) geometry.setAttribute("qLevel", new THREE.BufferAttribute(q, 1));
  }, [geometry, q]);
  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    if (q) {
      m.customProgramCacheKey = () => "daedalus-q-level";
      m.onBeforeCompile = (shader) => {
        shader.uniforms.selectedQ = { value: level };
        shader.vertexShader =
          "attribute float qLevel; varying float vQ;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvQ=qLevel;",
          );
        shader.fragmentShader =
          "uniform float selectedQ; varying float vQ;\n" +
          shader.fragmentShader.replace(
            "void main() {",
            "void main() {\nif(abs(vQ-selectedQ)>5.) discard;",
          );
      };
    }
    return m;
  }, [q, level]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} raycast={() => null} />;
}
