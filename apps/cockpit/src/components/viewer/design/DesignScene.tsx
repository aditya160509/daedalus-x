"use client";

import { GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import { CarModel } from "./CarModel";
import { DesignCamera } from "./DesignCamera";
import { Dimensions, MeasureGraphic } from "./Dimensions";
import { SnapshotBridge } from "./SnapshotBridge";
import { StudioStage } from "./StudioStage";
import type { DesignSceneProps } from "./types";

/**
 * Display-mesh design viewer. Dimensions and measurements are labelled approximate because
 * they come from the tessellated GLB, not canonical CAD.
 */
export function DesignScene(props: DesignSceneProps) {
  const [generation, setGeneration] = useState(0);
  return (
    <Canvas
      key={generation}
      dpr={[1, 2]}
      camera={{
        fov: 35,
        near: 0.001,
        far: 100,
        position: [
          props.frame.center[0] + props.frame.radius * 3,
          props.frame.center[1] + props.frame.radius * 2,
          props.frame.center[2] + props.frame.radius * 3,
        ],
      }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      style={{ cursor: props.measureOn ? "crosshair" : "grab" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            setTimeout(() => setGeneration((value) => value + 1), 250);
          },
          { once: true },
        );
      }}
      onPointerMissed={() => {
        if (!props.measureOn) props.onSelect(null);
      }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}

function SceneContents(props: DesignSceneProps) {
  const maxDim = props.frame.radius * 2;
  const floorY = props.model.bounds.min[1];
  return (
    <>
      <StudioStage mode={props.mode} frame={props.frame} floorY={floorY} maxDim={maxDim} />
      <CarModel
        model={props.model}
        mode={props.mode}
        explode={props.explode}
        selected={props.selected}
        measureOn={props.measureOn}
        onSelect={props.onSelect}
        onMeasurePoint={props.onMeasurePoint}
        reducedMotion={props.reducedMotion}
      />
      {props.dimensions && (
        <Dimensions
          min={props.model.bounds.min}
          max={props.model.bounds.max}
          radius={props.frame.radius}
        />
      )}
      <MeasureGraphic measureState={props.measure} />
      <DesignCamera
        preset={props.preset}
        presetNonce={props.presetNonce}
        frame={props.frame}
        bus={props.bus}
        id={props.id}
        turntable={props.turntable}
        reducedMotion={props.reducedMotion}
      />
      <SnapshotBridge register={props.onSnapshot} />
      <GizmoHelper alignment="bottom-left" margin={[64, 64]}>
        <GizmoViewport axisColors={["#f0525a", "#3ccf91", "#5aa8ff"]} labelColor="#090b0e" />
      </GizmoHelper>
    </>
  );
}
