"use client";

// GPU particle advection for the Wind Tunnel. The technique follows mapbox/webgl-wind (ISC):
// particle state lives in a float texture, a fragment pass advects it with RK2, and a point
// shader reads the result. Ported from 2D to a WebGL2 3D velocity texture here.
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Gauge, Pause, Play, Wind } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import {
  VelocityMeta as VelocityMetaSchema,
  VizMeta as VizMetaSchema,
  type VelocityMeta,
  type VizMeta,
  velocityMetaUrl,
  velocityTextureUrl,
  vizBinUrl,
  vizMetaUrl,
} from "@/lib/api";
import { colorize } from "@/lib/colormap";
import { cn } from "@/lib/utils";
import { readF32, readU32 } from "@/lib/vizBinary";

type Surface = { geometry: THREE.BufferGeometry; bounds: THREE.Box3 };
type TunnelData = {
  viz: VizMeta;
  bin: ArrayBuffer;
  surface: Surface;
  velocity: VelocityMeta;
  texture: THREE.Data3DTexture;
};

type Preset = "side" | "top" | "rear" | "chase";
const PRESETS: { id: Preset; label: string }[] = [
  { id: "side", label: "Side" },
  { id: "top", label: "Top" },
  { id: "rear", label: "Wake" },
  { id: "chase", label: "Chase" },
];
const DENSITIES = [
  { size: 128, label: "16k" },
  { size: 256, label: "65k" },
  { size: 512, label: "262k" },
] as const;

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { cache: "no-cache", signal });
  if (!response.ok) throw new Error(`${url}: ${response.status} ${await response.text()}`);
  return response.json();
}

function surfaceGeometry(viz: VizMeta, bin: ArrayBuffer): Surface {
  const layer = viz.layers.surface;
  const geometry = new THREE.BufferGeometry();
  const positions = readF32(bin, layer.positions);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
  geometry.setIndex(new THREE.BufferAttribute(readU32(bin, layer.indices).slice(), 1));
  const cp = readF32(bin, layer.scalar);
  const extent = Math.max(Math.abs(layer.range[0]), Math.abs(layer.range[1]), 1e-6);
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(colorize(cp, [-extent, extent], "coolwarm"), 3),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return { geometry, bounds: geometry.boundingBox ?? new THREE.Box3() };
}

function velocityTexture(meta: VelocityMeta, data: ArrayBuffer): THREE.Data3DTexture {
  const expected = meta.dims[0] * meta.dims[1] * meta.dims[2] * 4;
  if (data.byteLength !== expected * Float32Array.BYTES_PER_ELEMENT) {
    throw new Error(`velocity texture is ${data.byteLength} bytes, expected ${expected * 4}`);
  }
  const texture = new THREE.Data3DTexture(
    new Float32Array(data),
    meta.dims[0],
    meta.dims[1],
    meta.dims[2],
  );
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.FloatType;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/** Load the compact surface layer and the velocity texture for one run. */
export function FlowTunnel3D({
  runId,
  acceptance,
  speed,
}: {
  runId: string;
  acceptance: string;
  speed: number;
}) {
  const [data, setData] = useState<TunnelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [density, setDensity] = useState(256);
  const [flow, setFlow] = useState(1);
  const [preset, setPreset] = useState<Preset>("side");
  const [surfaceOn, setSurfaceOn] = useState(true);
  const [dropped, setDropped] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [vizRaw, velocityRaw, bin, texture] = await Promise.all([
          fetchJson(vizMetaUrl(runId), controller.signal),
          fetchJson(velocityMetaUrl(runId), controller.signal),
          fetch(vizBinUrl(runId), { cache: "no-cache", signal: controller.signal }).then((r) => {
            if (!r.ok) throw new Error(`viz.bin: ${r.status}`);
            return r.arrayBuffer();
          }),
          fetch(velocityTextureUrl(runId), { cache: "no-cache", signal: controller.signal }).then(
            (r) => {
              if (!r.ok) throw new Error(`velocity.bin: ${r.status}`);
              return r.arrayBuffer();
            },
          ),
        ]);
        const viz = VizMetaSchema.parse(vizRaw);
        const meta = VelocityMetaSchema.parse(velocityRaw);
        const next: TunnelData = {
          viz,
          bin,
          surface: surfaceGeometry(viz, bin),
          velocity: meta,
          texture: velocityTexture(meta, texture),
        };
        if (controller.signal.aborted) {
          next.surface.geometry.dispose();
          next.texture.dispose();
          return;
        }
        setData(next);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    })();
    return () => controller.abort();
  }, [runId]);

  useEffect(() => {
    const current = data;
    return () => {
      current?.surface.geometry.dispose();
      current?.texture.dispose();
    };
  }, [data]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-lg border border-border/60 bg-[#07080c]">
      {data ? (
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ fov: 32, near: 0.002, far: 20 }}
        >
          <TunnelScene
            data={data}
            density={density}
            flow={flow}
            paused={paused}
            preset={preset}
            surfaceOn={surfaceOn}
            onSlow={() => {
              if (density > 128 && !dropped) {
                setDensity(128);
                setDropped(true);
              }
            }}
          />
        </Canvas>
      ) : error ? (
        <div className="grid h-full place-items-center p-6 text-center text-sm text-destructive">
          Could not load the flow particles.
          <span className="mt-1 block text-xs text-muted-foreground">{error}</span>
        </div>
      ) : (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Wind className="size-4 animate-pulse" /> Loading moving air…
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 p-3 text-2xs text-muted-foreground">
        <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 backdrop-blur">
          {runId} · simulated · {acceptance.replaceAll("_", " ")}
        </span>
        <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 backdrop-blur">
          U∞ {speed} m/s
        </span>
        {dropped && (
          <span className="rounded-full border border-risk/40 bg-background/70 px-2 py-0.5 text-risk backdrop-blur">
            particle count reduced to hold frame rate
          </span>
        )}
      </div>

      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-background/80 p-1.5 text-xs backdrop-blur">
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title={paused ? "Play" : "Pause"}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </button>
          <span className="mx-1 h-5 w-px bg-border" />
          <label className="flex items-center gap-1.5 px-1">
            <span className="text-muted-foreground">Particles</span>
            <select
              value={density}
              onChange={(event) => setDensity(Number(event.target.value))}
              className="rounded-md border border-border/60 bg-background px-1 py-0.5 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {DENSITIES.map((d) => (
                <option key={d.size} value={d.size}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 px-1">
            <Gauge className="size-3.5 text-muted-foreground" />
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.25}
              value={flow}
              onChange={(event) => setFlow(Number(event.target.value))}
              className="w-20 accent-foreground"
              aria-label="Flow display speed"
            />
          </label>
          <label className="flex items-center gap-1.5 px-1">
            <input
              type="checkbox"
              checked={surfaceOn}
              onChange={(event) => setSurfaceOn(event.target.checked)}
              className="accent-foreground"
            />
            <span className="text-muted-foreground">Surface Cp</span>
          </label>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 p-1.5 text-xs backdrop-blur">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              aria-pressed={preset === p.id}
              className={cn(
                "rounded-md px-2 py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                preset === p.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TunnelScene({
  data,
  density,
  flow,
  paused,
  preset,
  surfaceOn,
  onSlow,
}: {
  data: TunnelData;
  density: number;
  flow: number;
  paused: boolean;
  preset: Preset;
  surfaceOn: boolean;
  onSlow: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#07080c"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[0.6, 1.0, 0.8]} intensity={2.4} />
      <directionalLight position={[-0.8, 0.4, -0.6]} intensity={0.9} />
      {/* OpenFOAM is z-up; rotate the whole engineering scene to three.js y-up. */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {surfaceOn && (
          <mesh geometry={data.surface.geometry}>
            <meshStandardMaterial
              vertexColors
              roughness={0.42}
              metalness={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        <TunnelFloor velocity={data.velocity} bounds={data.surface.bounds} flow={flow} />
        <ParticleField data={data} density={density} flow={flow} paused={paused} onSlow={onSlow} />
      </group>
      <CameraRig bounds={data.surface.bounds} preset={preset} />
    </>
  );
}

function CameraRig({ bounds, preset }: { bounds: THREE.Box3; preset: Preset }) {
  const { camera } = useThree();
  const controls = useRef<Controls>(null);
  const center = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  const radius = useMemo(
    () => Math.max(bounds.getSize(new THREE.Vector3()).length(), 0.02),
    [bounds],
  );
  const target = useMemo(() => new THREE.Vector3(center.x, center.z, -center.y), [center]);
  useEffect(() => {
    const d = radius * 1.35;
    const positions: Record<Preset, [number, number, number]> = {
      side: [target.x, target.y + radius * 0.25, target.z + d],
      top: [target.x, target.y + d, target.z + 0.001],
      rear: [target.x + d * 0.95, target.y + radius * 0.35, target.z + radius * 0.3],
      chase: [target.x + d * 0.55, target.y + radius * 0.22, target.z + radius * 0.2],
    };
    camera.position.set(...positions[preset]);
    camera.lookAt(target);
    controls.current?.target.copy(target);
    controls.current?.update();
  }, [camera, preset, radius, target]);
  return (
    <OrbitControls
      ref={controls}
      target={target}
      enablePan
      enableDamping
      dampingFactor={0.12}
      minDistance={radius * 0.2}
      maxDistance={radius * 6}
      makeDefault
    />
  );
}

function TunnelFloor({
  velocity,
  bounds,
  flow,
}: {
  velocity: VelocityMeta;
  bounds: THREE.Box3;
  flow: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#0b0d12";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#1c2430";
      context.lineWidth = 2;
      for (let x = 0; x < canvas.width; x += 8) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 18, canvas.height);
        context.stroke();
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 1);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, delta) => {
    // oxlint-disable-next-line react/immutability -- three.js textures are imperative GPU state
    texture.offset.x = (texture.offset.x + delta * 0.12 * flow) % 1;
  });
  const size = useMemo(() => {
    const span = bounds.getSize(new THREE.Vector3());
    return { x: Math.max(span.x * 2.4, 0.4), y: Math.max(span.y * 2.4, 0.2) };
  }, [bounds]);
  const centre = useMemo(() => bounds.getCenter(new THREE.Vector3()), [bounds]);
  return (
    <mesh position={[centre.x, centre.y, velocity.origin_m[2]]}>
      <planeGeometry args={[size.x, size.y]} />
      <meshStandardMaterial map={texture} color="#141922" roughness={0.95} metalness={0} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ shaders */

const QUAD_VERTEX = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const ADVECT_FRAGMENT = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  uniform sampler2D uPositions;
  uniform sampler3D uVelocity;
  uniform vec3 uOrigin;
  uniform vec3 uSpacing;
  uniform vec3 uDims;
  uniform float uDt;
  uniform float uSpeed;
  uniform float uTime;
  uniform float uLife;
  uniform float uMaxLife;
  in vec2 vUv;
  out vec4 fragColor;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec4 p = texture(uPositions, vUv);
    vec3 pos = p.xyz;
    float life = p.w;
    vec3 span = uSpacing * (uDims - 1.0);
    vec3 uvw = (pos - uOrigin) / span;
    bool outside = any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)));
    vec4 vel = texture(uVelocity, clamp(uvw, 0.0, 1.0));
    if (outside || vel.w < 0.5 || life > uMaxLife) {
      float t = uTime * 1.7;
      float r1 = hash(vUv + t);
      float r2 = hash(vUv * 1.31 + t + 7.0);
      float r3 = hash(vUv * 2.17 + t + 13.0);
      // Respawning across the whole domain keeps the field even; an inlet-only spawn
      // leaves a visible sheet and starves the wake.
      pos = uOrigin + vec3(r1 * span.x, r2 * span.y, r3 * span.z);
      pos.z = max(pos.z, uOrigin.z + 0.001);
      life = 0.0;
    } else {
      vec3 v1 = vel.xyz * uSpeed;
      vec3 mid = pos + 0.5 * uDt * v1;
      vec3 uvw2 = (mid - uOrigin) / span;
      vec3 v2 = texture(uVelocity, clamp(uvw2, 0.0, 1.0)).xyz * uSpeed;
      pos += uDt * v2;
      life += uLife;
    }
    fragColor = vec4(pos, life);
  }
`;

const PARTICLE_VERTEX = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  uniform sampler2D uPositions;
  uniform sampler3D uVelocity;
  uniform vec3 uOrigin;
  uniform vec3 uSpacing;
  uniform vec3 uDims;
  uniform float uPixelRatio;
  in vec2 aUv;
  out float vSpeed;

  void main() {
    vec4 p = texture(uPositions, aUv);
    vec3 pos = p.xyz;
    vec3 span = uSpacing * (uDims - 1.0);
    vec3 uvw = (pos - uOrigin) / span;
    vec3 vel = texture(uVelocity, clamp(uvw, 0.0, 1.0)).xyz;
    vSpeed = length(vel);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uPixelRatio * (0.9 + 0.9 * vSpeed) * (0.42 / max(0.04, -mv.z)), 1.6, 3.6);
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  precision highp float;
  in float vSpeed;
  out vec4 fragColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, d);
    // Turbo-style speed map: blue (slow wake) -> cyan -> green -> yellow -> red (fast).
    float s = clamp(vSpeed / 1.3, 0.0, 1.0);
    vec3 c0 = vec3(0.19, 0.07, 0.23);
    vec3 c1 = vec3(0.16, 0.47, 0.98);
    vec3 c2 = vec3(0.10, 0.90, 0.70);
    vec3 c3 = vec3(0.95, 0.85, 0.20);
    vec3 c4 = vec3(0.92, 0.22, 0.10);
    vec3 colour = s < 0.25 ? mix(c0, c1, s / 0.25)
      : s < 0.5 ? mix(c1, c2, (s - 0.25) / 0.25)
      : s < 0.75 ? mix(c2, c3, (s - 0.5) / 0.25)
      : mix(c3, c4, (s - 0.75) / 0.25);
    // Undisturbed free stream stays faint so the air bent by the car stands out.
    float disturbed = clamp(abs(vSpeed - 1.0) * 3.0, 0.0, 1.0);
    fragColor = vec4(colour, alpha * (0.35 + 0.65 * disturbed));
  }
`;

type Simulation = {
  size: number;
  targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  depthCamera: THREE.OrthographicCamera;
  seedScene: THREE.Scene;
  advectScene: THREE.Scene;
  advect: THREE.Mesh;
  seed: THREE.Mesh;
  points: THREE.Points;
  initialTexture: THREE.DataTexture;
  advectMaterial: THREE.ShaderMaterial;
  seedMaterial: THREE.ShaderMaterial;
  pointMaterial: THREE.ShaderMaterial;
};

function makeTarget(size: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(size, size, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function makeSimulation(data: TunnelData, density: number): Simulation {
  const size = density;
  const count = size * size;
  const meta = data.velocity;
  const span = new THREE.Vector3(
    meta.spacing_m[0] * (meta.dims[0] - 1),
    meta.spacing_m[1] * (meta.dims[1] - 1),
    meta.spacing_m[2] * (meta.dims[2] - 1),
  );
  const origin = new THREE.Vector3(...meta.origin_m);
  const uniformGrid = {
    uOrigin: { value: origin },
    uSpacing: { value: new THREE.Vector3(...meta.spacing_m) },
    uDims: { value: new THREE.Vector3(...meta.dims) },
    uVelocity: { value: data.texture },
  };

  const initial = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    initial[i * 4] = origin.x + Math.random() * span.x;
    initial[i * 4 + 1] = origin.y + Math.random() * span.y;
    initial[i * 4 + 2] = origin.z + Math.random() * span.z;
    initial[i * 4 + 3] = Math.random() * 3;
  }
  const initialTexture = new THREE.DataTexture(
    initial,
    size,
    size,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  initialTexture.minFilter = THREE.NearestFilter;
  initialTexture.magFilter = THREE.NearestFilter;
  initialTexture.needsUpdate = true;

  const seedMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { uInit: { value: initialTexture } },
    vertexShader: QUAD_VERTEX,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uInit;
      in vec2 vUv;
      out vec4 fragColor;
      void main() { fragColor = texture(uInit, vUv); }
    `,
    depthTest: false,
    depthWrite: false,
  });
  const seed = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), seedMaterial);

  const advectMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...uniformGrid,
      uPositions: { value: initialTexture },
      uDt: { value: 0 },
      uSpeed: { value: meta.U_m_s },
      uTime: { value: 0 },
      uLife: { value: 0 },
      uMaxLife: { value: 3 },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: ADVECT_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  const advect = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), advectMaterial);

  const uvs = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    uvs[i * 2] = ((i % size) + 0.5) / size;
    uvs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  pointGeometry.setAttribute("aUv", new THREE.BufferAttribute(uvs, 2));
  const pointMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      ...uniformGrid,
      uPositions: { value: initialTexture },
      uPixelRatio: {
        value: Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2),
      },
    },
    vertexShader: PARTICLE_VERTEX,
    fragmentShader: PARTICLE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pointGeometry, pointMaterial);
  points.frustumCulled = false;

  const seedScene = new THREE.Scene();
  seedScene.add(seed);
  const advectScene = new THREE.Scene();
  advectScene.add(advect);
  return {
    size,
    targets: [makeTarget(size), makeTarget(size)],
    depthCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    seedScene,
    advectScene,
    advect,
    seed,
    points,
    initialTexture,
    advectMaterial,
    seedMaterial,
    pointMaterial,
  };
}

function ParticleField({
  data,
  density,
  flow,
  paused,
  onSlow,
}: {
  data: TunnelData;
  density: number;
  flow: number;
  paused: boolean;
  onSlow: () => void;
}) {
  const { gl } = useThree();
  const sim = useMemo(() => makeSimulation(data, density), [data, density]);
  const read = useRef(0);
  const seeded = useRef(false);
  const perf = useRef({ time: 0, frames: 0, slow: 0 });

  useEffect(() => {
    const current = sim;
    return () => {
      current.targets.forEach((target) => target.dispose());
      current.advect.geometry.dispose();
      current.seed.geometry.dispose();
      current.points.geometry.dispose();
      current.advectMaterial.dispose();
      current.seedMaterial.dispose();
      current.pointMaterial.dispose();
      current.initialTexture.dispose();
    };
  }, [sim]);

  useFrame((_, delta) => {
    if (!seeded.current) {
      gl.setRenderTarget(sim.targets[0]);
      gl.render(sim.seedScene, sim.depthCamera);
      gl.setRenderTarget(null);
      seeded.current = true;
      read.current = 0;
    }
    if (!paused) {
      const write = read.current === 0 ? 1 : 0;
      const step = Math.min(delta, 0.05);
      // oxlint-disable-next-line react/immutability -- ping-pong uniforms are the simulation state
      sim.advectMaterial.uniforms.uPositions.value = sim.targets[read.current].texture;
      sim.advectMaterial.uniforms.uDt.value = step * 0.02 * flow;
      sim.advectMaterial.uniforms.uLife.value = step;
      sim.advectMaterial.uniforms.uTime.value += step;
      gl.setRenderTarget(sim.targets[write]);
      gl.render(sim.advectScene, sim.depthCamera);
      gl.setRenderTarget(null);
      read.current = write;
      sim.pointMaterial.uniforms.uPositions.value = sim.targets[read.current].texture;
    }

    perf.current.time += delta;
    perf.current.frames += 1;
    if (perf.current.time >= 1) {
      const fps = perf.current.frames / perf.current.time;
      perf.current.slow = fps < 50 ? perf.current.slow + 1 : 0;
      if (perf.current.slow >= 2) {
        perf.current.slow = 0;
        onSlow();
      }
      perf.current.time = 0;
      perf.current.frames = 0;
    }
  });

  return <primitive object={sim.points} />;
}
