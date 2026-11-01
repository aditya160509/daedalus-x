"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  NearestFilter,
  Points,
  RGBAFormat,
  ShaderMaterial,
} from "three";
import type { FlowLines } from "@/lib/api";
import { colorize } from "@/lib/colormap";

/*
 * Air particles advected along the streamline polylines. Particle positions are computed in the
 * vertex shader from a float texture of the line vertices, so the CPU only sets a clock uniform.
 * The GPU advection idea follows mapbox/webgl-wind (ISC): particles hop along a field and trails
 * fade behind them. Here the field is the exported streamlines, not a 2D wind grid.
 */
const TRAIL = 8;
const TRAIL_STEP = 0.012;
const LINE_SPEED = 0.09; // fraction of a streamline per second

const VERTEX = /* glsl */ `
  attribute float aBase;
  attribute float aCount;
  attribute float aPhase;
  attribute float aTrail;
  attribute vec3 aColor;
  uniform sampler2D uTex;
  uniform float uWidth;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uTrailStep;
  uniform float uTrailCount;
  uniform float uSize;
  uniform float uPixel;
  varying float vAlpha;
  varying vec3 vColor;

  vec3 vertexAt(float index) {
    float x = mod(index, uWidth);
    float y = floor(index / uWidth);
    return texelFetch(uTex, ivec2(int(x), int(y)), 0).xyz;
  }

  void main() {
    float life = fract(aPhase + uTime * uSpeed);
    float raw = life - aTrail * uTrailStep;
    float p = fract(raw);
    float seg = p * (aCount - 1.0);
    float i0 = floor(seg);
    vec3 a = vertexAt(aBase + i0);
    vec3 b = vertexAt(aBase + min(i0 + 1.0, aCount - 1.0));
    vec3 pos = mix(a, b, seg - i0);
    // Fade the head in after the wrap and out before it, and the trail with its age.
    float fade = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.9, 1.0, life));
    vAlpha = fade * (1.0 - aTrail / uTrailCount) * step(0.0, raw);
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixel * (1.0 - 0.5 * aTrail / uTrailCount);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5 || vAlpha <= 0.0) discard;
    gl_FragColor = vec4(vColor, vAlpha * uOpacity * (1.0 - 2.0 * d));
  }
`;

/** Deterministic PRNG, so the same run always shows the same particle phases. */
function mulberry(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(lines: FlowLines, count: number) {
  const points = lines.positions.length / 3;
  const width = Math.min(points, 4096);
  const height = Math.max(1, Math.ceil(points / width));
  const texels = new Float32Array(width * height * 4);
  for (let i = 0; i < points; i++) {
    texels[i * 4] = lines.positions[i * 3];
    texels[i * 4 + 1] = lines.positions[i * 3 + 1];
    texels[i * 4 + 2] = lines.positions[i * 3 + 2];
    texels[i * 4 + 3] = lines.scalar[i] ?? 0;
  }
  const texture = new DataTexture(texels, width, height, RGBAFormat, FloatType);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;

  const valid: number[] = [];
  for (let l = 0; l + 1 < lines.offsets.length; l++) {
    if (lines.offsets[l + 1] - lines.offsets[l] >= 2) valid.push(l);
  }
  const random = mulberry(valid.length * 9176 + count);
  const vertexCount = count * TRAIL;
  const base = new Float32Array(vertexCount);
  const length = new Float32Array(vertexCount);
  const phase = new Float32Array(vertexCount);
  const trail = new Float32Array(vertexCount);
  const particleScalar = new Float32Array(count);
  const particleBase = new Float32Array(count);
  const particleCount = new Float32Array(count);
  const particlePhase = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const line = valid[k % valid.length];
    particleBase[k] = lines.offsets[line];
    particleCount[k] = lines.offsets[line + 1] - lines.offsets[line];
    particlePhase[k] = random();
    particleScalar[k] = lines.scalar[lines.offsets[line]] ?? 0;
  }
  const colours = colorize(particleScalar, lines.range, "turbo");
  const color = new Float32Array(vertexCount * 3);
  const position = new Float32Array(vertexCount * 3);
  for (let k = 0; k < count; k++) {
    for (let t = 0; t < TRAIL; t++) {
      const v = k * TRAIL + t;
      base[v] = particleBase[k];
      length[v] = particleCount[k];
      phase[v] = particlePhase[k];
      trail[v] = t;
      color[v * 3] = colours[k * 3];
      color[v * 3 + 1] = colours[k * 3 + 1];
      color[v * 3 + 2] = colours[k * 3 + 2];
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("aBase", new BufferAttribute(base, 1));
  geometry.setAttribute("aCount", new BufferAttribute(length, 1));
  geometry.setAttribute("aPhase", new BufferAttribute(phase, 1));
  geometry.setAttribute("aTrail", new BufferAttribute(trail, 1));
  geometry.setAttribute("aColor", new BufferAttribute(color, 3));
  return { texture, width, geometry };
}

/** Animated air particles over the streamlines. A still frame when animation is off. */
export default function AirParticles({
  lines,
  animate,
  density,
}: {
  lines: FlowLines;
  animate: boolean;
  density: number;
}) {
  const count = Math.round(500 + 2500 * Math.min(1, Math.max(0, density)));
  const built = useMemo(() => build(lines, count), [lines, count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTex: { value: built.texture },
          uWidth: { value: built.width },
          uTime: { value: 0 },
          uSpeed: { value: LINE_SPEED },
          uTrailStep: { value: TRAIL_STEP },
          uTrailCount: { value: TRAIL },
          uSize: { value: 3 },
          uPixel: { value: 1 },
          uOpacity: { value: 0.9 },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [built],
  );
  const points = useRef<Points>(null);
  const clock = useRef(0);
  useFrame((state, delta) => {
    if (animate) clock.current += Math.min(delta, 0.1);
    const uniforms = points.current?.material;
    if (uniforms instanceof ShaderMaterial) {
      uniforms.uniforms.uTime.value = clock.current;
      uniforms.uniforms.uPixel.value = state.gl.getPixelRatio();
    }
  });
  useEffect(
    () => () => {
      built.geometry.dispose();
      built.texture.dispose();
      material.dispose();
    },
    [built, material],
  );
  return (
    <points ref={points} geometry={built.geometry} material={material} frustumCulled={false} />
  );
}
