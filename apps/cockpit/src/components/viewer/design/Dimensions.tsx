"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { dimensionLines, measure, type Vec3 } from "./designMath";
import type { MeasureState } from "./types";

const DIMENSION_COLOUR = "#3dd6f0";
const MEASURE_COLOUR = "#f5a524";

/** Length, width and height dimension lines outside the display-mesh bounding box. */
export function Dimensions({ min, max, radius }: { min: Vec3; max: Vec3; radius: number }) {
  const lines = useMemo(() => dimensionLines(min, max), [min, max]);
  const arrow = radius * 0.09;
  return (
    <>
      {lines.map((line) => {
        const middle: Vec3 = [
          (line.start[0] + line.end[0]) / 2,
          (line.start[1] + line.end[1]) / 2,
          (line.start[2] + line.end[2]) / 2,
        ];
        return (
          <group key={line.key}>
            <Line
              points={[line.start, line.end]}
              color={DIMENSION_COLOUR}
              lineWidth={1.2}
              transparent
              opacity={0.75}
            />
            <Arrowhead at={line.start} towards={line.end} size={arrow} />
            <Arrowhead at={line.end} towards={line.start} size={arrow} />
            <group position={middle}>
              <Html center style={{ pointerEvents: "none" }} zIndexRange={[15, 0]}>
                <span className="rounded-sm border border-brand/30 bg-card/85 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-brand backdrop-blur">
                  {(line.value * 1000).toFixed(1)} mm
                </span>
              </Html>
            </group>
          </group>
        );
      })}
    </>
  );
}

/** Two-point measure line. Points are snapped display vertices, so the readout is approximate. */
export function MeasureGraphic({ measureState }: { measureState: MeasureState | null }) {
  if (!measureState) return null;
  const a = measureState.a.point;
  const b = measureState.b?.point;
  return (
    <>
      <Marker at={a} colour={MEASURE_COLOUR} />
      {b && (
        <>
          <Marker at={b} colour={MEASURE_COLOUR} />
          <Line
            points={[a, b]}
            color={MEASURE_COLOUR}
            lineWidth={1.6}
            dashed
            dashSize={0.004}
            gapSize={0.002}
          />
          <Html
            position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]}
            center
            style={{ pointerEvents: "none" }}
            zIndexRange={[25, 0]}
          >
            <span className="rounded-sm border border-risk/40 bg-card/90 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-risk backdrop-blur">
              {(measure(a, b).distance * 1000).toFixed(1)} mm
            </span>
          </Html>
        </>
      )}
    </>
  );
}

function Marker({ at, colour }: { at: Vec3; colour: string }) {
  return (
    <mesh position={at}>
      <sphereGeometry args={[0.0016, 12, 12]} />
      <meshBasicMaterial color={colour} toneMapped={false} />
    </mesh>
  );
}

function Arrowhead({ at, towards, size }: { at: Vec3; towards: Vec3; size: number }) {
  const quaternion = useMemo(() => {
    const direction = new THREE.Vector3(towards[0] - at[0], towards[1] - at[1], towards[2] - at[2]);
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
  }, [at, towards]);
  return (
    <mesh position={at} quaternion={quaternion}>
      <coneGeometry args={[size * 0.35, size, 8]} />
      <meshBasicMaterial color={DIMENSION_COLOUR} toneMapped={false} />
    </mesh>
  );
}
