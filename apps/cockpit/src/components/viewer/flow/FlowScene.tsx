"use client";
import {
  ContactShadows,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Lightformer,
  PerformanceMonitor,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CameraControls } from "./CameraControls";
import { CanvasRecorder } from "./FlyThrough";
import { FlowArrows } from "./FlowArrows";
import { GroundBelt } from "./GroundBelt";
import { OilFlow } from "./OilFlow";
import { PressureSkin } from "./PressureSkin";
import { SensitivityMap } from "./SensitivityMap";
import { SmokeStreams } from "./SmokeStreams";
import { SourceStamp } from "./SourceStamp";
import { VortexCores } from "./VortexCores";
import { SliceMesh, WakeScanner, scalarMesh } from "./WakeScanner";
import type { SceneProps } from "./types";

const ENGINEERING = new THREE.Euler(-Math.PI / 2, 0, 0);
export function FlowScene(props: SceneProps) {
  const [generation, setGeneration] = useState(0);
  return (
    <Canvas
      key={generation}
      dpr={[1, 1.5]}
      camera={{ fov: 32, near: 0.001, far: 100, position: [-0.3, 0.15, 0.3] }}
      gl={{
        antialias: false,
        preserveDrawingBuffer: false,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.info.autoReset = false;
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            setTimeout(() => setGeneration((g) => g + 1), 250);
          },
          { once: true },
        );
      }}
      onPointerMissed={() => props.onProbe(null)}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
function SceneContents(props: SceneProps) {
  const { field, layers, onProbe, reducedMotion, marker, onError } = props;
  const [effects, setEffects] = useState(true);
  const car = field.meta.car;
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const postEnabled =
    effects &&
    (field.meta.bytes * 5 + size.width * size.height * dpr * dpr * 80 + 256 * 256 * 6 * 16) /
      1048576 <=
      props.budgetMiB;
  const centreline = useMemo(
    () => scalarMesh(field.centreline, layers.sliceScalar),
    [field, layers.sliceScalar],
  );
  const animate = layers.animate && !reducedMotion;
  return (
    <>
      <color attach="background" args={["#0b0b0c"]} />
      <hemisphereLight args={["#edf1f3", "#151719", 0.55]} />
      <directionalLight position={[-2, 4, 3]} intensity={1.1} />
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[0, 3, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[5, 2, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[-3, 1, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[3, 2, 1]}
        />
        <Lightformer form="rect" intensity={0.5} position={[2, 0, -3]} scale={[3, 1, 1]} />
      </Environment>
      <group rotation={ENGINEERING}>
        {props.delta ? (
          <PressureSkin
            mesh={props.delta.mesh}
            range={props.delta.range}
            banded={false}
            label="ΔCp"
            onProbe={onProbe}
          />
        ) : (
          layers.surface !== "off" &&
          layers.surface !== "sensitivity" && (
            <PressureSkin
              mesh={field.surface}
              range={props.cpRange}
              banded={layers.banded}
              plain={layers.surface !== "cp"}
              dark={layers.surface === "oil"}
              onProbe={onProbe}
            />
          )
        )}
        {!props.delta && layers.surface === "sensitivity" && field.sensitivity && (
          <SensitivityMap mesh={field.sensitivity} onProbe={onProbe} />
        )}
        {layers.surface === "oil" && field.oilflow && (
          <OilFlow
            lines={field.oilflow}
            separation={field.separation}
            density={layers.density}
            onError={onError}
          />
        )}
        {layers.streamlines && (
          <SmokeStreams
            lines={field.streamlines}
            animate={animate}
            density={layers.density}
            onError={onError}
          />
        )}
        {layers.vortices && field.vortices && (
          <VortexCores mesh={field.vortices} level={layers.qLevel} />
        )}
        {layers.shell && field.wake_shell && (
          <SliceMesh
            mesh={field.wake_shell}
            label="velocity-deficit shell"
            opacity={0.25}
            onProbe={onProbe}
          />
        )}
        {layers.wake && (
          <WakeScanner
            slices={field.xslices}
            legacy={field.wake}
            index={layers.slice}
            scalar={layers.sliceScalar}
            onProbe={onProbe}
          />
        )}
        {layers.arrows && field.xslices?.vectors && (
          <FlowArrows mesh={field.xslices} index={layers.slice} height={car.height_m} />
        )}
        {layers.centreline && (
          <SliceMesh mesh={centreline} label="centreline" opacity={0.8} onProbe={onProbe} />
        )}
        <GroundBelt
          length={car.length_m}
          width={car.width_m}
          speed={field.meta.U_m_s}
          animate={animate}
        />
        <MarkerPlane marker={marker} width={car.width_m * 1.5} height={car.height_m * 1.5} />
      </group>
      <ContactShadows
        position={[car.length_m * 0.5, -0.0006, 0]}
        scale={car.length_m * 3}
        opacity={0.28}
        blur={2}
        far={car.height_m * 3}
        resolution={256}
        frames={1}
      />
      <CameraControls {...props} fly={props.fly && !reducedMotion} />
      <CanvasRecorder
        record={props.record && !reducedMotion}
        onEnd={props.onRecordEnd}
        onError={onError}
      />
      <PerformanceMonitor
        ms={250}
        iterations={8}
        threshold={1}
        bounds={() => [45, 60]}
        onDecline={() => setEffects(false)}
      />
      {postEnabled && (
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.85} intensity={0.6} mipmapBlur />
          <SMAA />
        </EffectComposer>
      )}
      <Metrics {...props} effects={postEnabled} />
      {props.record && <SourceStamp field={field} label={props.id} />}
      <GizmoHelper alignment="bottom-left" margin={[48, 48]}>
        <GizmoViewport axisColors={["#f0525a", "#3ccf91", "#5aa8ff"]} labelColor="#111113" />
      </GizmoHelper>
    </>
  );
}
function MarkerPlane({
  marker,
  width,
  height,
}: {
  marker: { current: number | null };
  width: number;
  height: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.visible = marker.current !== null;
      ref.current.position.x = marker.current ?? 0;
    }
  });
  return (
    <mesh
      ref={ref}
      position={[0, 0, height / 2]}
      rotation={[0, Math.PI / 2, 0]}
      visible={false}
      raycast={() => null}
    >
      <planeGeometry args={[height, width]} />
      <meshBasicMaterial
        color="#3dd6f0"
        opacity={0.15}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
function Metrics({
  onStats,
  field,
  effects,
}: Pick<SceneProps, "onStats" | "field"> & { effects: boolean }) {
  const gl = useThree((s) => s.gl);
  const elapsed = useRef(0),
    frames = useRef(0);
  useFrame((_, dt) => {
    const calls = gl.info.render.calls;
    gl.info.reset();
    elapsed.current += dt;
    frames.current++;
    if (elapsed.current < 1) return;
    // Conservative array multiplier plus render targets; an estimate, not a driver memory query.
    const pixels = gl.domElement.width * gl.domElement.height;
    onStats({
      fps: Math.round(frames.current / elapsed.current),
      effects,
      estimatedMiB:
        (field.meta.bytes * 5 + pixels * (effects ? 80 : 16) + 256 * 256 * 6 * 16) / 1048576,
      drawCalls: calls,
    });
    elapsed.current = 0;
    frames.current = 0;
  });
  return null;
}
