"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export function GroundBelt({
  length,
  width,
  speed,
  animate,
}: {
  length: number;
  width: number;
  speed: number;
  animate: boolean;
}) {
  const clock = useRef<{ value: number } | null>(null);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#111315",
      roughness: 0.95,
      envMapIntensity: 0.15,
    });
    m.onBeforeCompile = (shader) => {
      const time = { value: 0 };
      clock.current = time;
      shader.uniforms.beltTime = time;
      shader.uniforms.beltSpeed = { value: speed };
      shader.vertexShader =
        "varying vec2 vBelt;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvBelt=position.xy;",
        );
      shader.fragmentShader =
        "uniform float beltTime,beltSpeed; varying vec2 vBelt;\n" +
        shader.fragmentShader.replace(
          "#include <color_fragment>",
          `
        #include <color_fragment>
        float stripe=1.-smoothstep(.004,.014,abs(fract((vBelt.x-beltTime*beltSpeed*.02)/.12)-.5));
        diffuseColor.rgb+=vec3(.022)*stripe;
      `,
        );
    };
    return m;
  }, [speed]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    if (animate && clock.current) clock.current.value += dt;
  });
  return (
    <mesh position={[length * 0.9, 0, -0.0005]} material={material} raycast={() => null}>
      <planeGeometry args={[length * 4, width * 4]} />
    </mesh>
  );
}
