"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { FlowMesh } from "@/lib/api";
import { probe, useFlowGeometry } from "./geometry";
import type { Probe } from "./types";

const MAP = /* glsl */ `
vec3 coolwarm(float t) {
  vec3 a=vec3(.23,.299,.754), b=vec3(.552,.69,.996), c=vec3(.865), d=vec3(.958,.604,.482), e=vec3(.706,.016,.15);
  if(t<.25) return mix(a,b,t*4.);
  if(t<.5) return mix(b,c,(t-.25)*4.);
  if(t<.75) return mix(c,d,(t-.5)*4.);
  return mix(d,e,(t-.75)*4.);
}`;

export function PressureSkin({
  mesh,
  range,
  banded,
  plain = false,
  dark = false,
  label = "surface",
  onProbe,
}: {
  mesh: FlowMesh;
  range: [number, number];
  banded: boolean;
  plain?: boolean;
  dark?: boolean;
  label?: string;
  onProbe: (p: Probe | null) => void;
}) {
  const geometry = useFlowGeometry(mesh);
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      clearcoat: 0.3,
      roughness: 0.45,
      metalness: 0.04,
      envMapIntensity: 0.35,
    });
    m.customProgramCacheKey = () => "daedalus-contours-v1";
    m.onBeforeCompile = (shader) => {
      shader.uniforms.fieldLow = { value: range[0] };
      shader.uniforms.fieldSpan = { value: range[1] - range[0] || 1 };
      shader.uniforms.banded = { value: banded ? 1 : 0 };
      shader.uniforms.plain = { value: plain ? 1 : 0 };
      shader.uniforms.plainValue = { value: dark ? 0.11 : 0.42 };
      shader.vertexShader =
        "attribute float fieldValue; varying float vField;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvField=fieldValue;",
        );
      shader.fragmentShader =
        `varying float vField; uniform float fieldLow,fieldSpan,banded,plain,plainValue;\n${MAP}\n` +
        shader.fragmentShader
          .replace(
            "#include <color_fragment>",
            `
        #include <color_fragment>
        float t=clamp((vField-fieldLow)/fieldSpan,0.,1.);
        float quant=min(15.,floor(t*16.))/15.;
        vec3 contour=coolwarm(mix(t,quant,banded));
        float edge=min(fract(t*16.),1.-fract(t*16.));
        float line=smoothstep(0.,max(fwidth(t)*16.*1.1,.008),edge);
        contour*=mix(1.,mix(.30,1.,line),banded);
        diffuseColor.rgb=mix(contour,vec3(plainValue),plain);
      `,
          )
          .replace(
            "#include <dithering_fragment>",
            "#include <dithering_fragment>\ngl_FragColor.rgb=min(gl_FragColor.rgb,vec3(.82));",
          );
    };
    return m;
  }, [range, banded, plain, dark]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh
      geometry={geometry}
      material={material}
      onPointerMove={(e) => onProbe(probe(e, mesh, label))}
      onPointerOut={() => onProbe(null)}
    />
  );
}
