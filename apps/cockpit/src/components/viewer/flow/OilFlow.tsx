"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { FlowLines, FlowPoints } from "../../../lib/api";
import { SmokeStreams } from "./SmokeStreams";

export function OilFlow({
  lines,
  separation,
  density,
  onError,
}: {
  lines: FlowLines;
  separation?: FlowPoints;
  density: number;
  onError: (message: string) => void;
}) {
  return (
    <group>
      <SmokeStreams lines={lines} density={density} animate={false} white onError={onError} />
      {separation && <SeparationPoints points={separation} />}
    </group>
  );
}
function SeparationPoints({ points }: { points: FlowPoints }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(points.positions, 3));
    return g;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry} raycast={() => null}>
      <shaderMaterial
        transparent
        depthWrite={false}
        vertexShader="void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=4.;}"
        fragmentShader="void main(){float a=1.-smoothstep(.4,.5,length(gl_PointCoord-vec2(.5)));if(a<.01)discard;gl_FragColor=vec4(.94,.18,.2,a);}"
      />
    </points>
  );
}
