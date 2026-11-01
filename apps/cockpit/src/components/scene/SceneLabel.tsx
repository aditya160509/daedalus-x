"use client";

import { Billboard, Text } from "@react-three/drei";

/** Self-hosted Inter (OFL), so 3D labels render offline with no font request. */
const SCENE_FONT = "/fonts/inter-latin-500-normal.woff";

/**
 * A text label drawn in the 3D scene (troika SDF text). It faces the camera, stays legible through
 * a dark outline, and is sized in scene units so it scales with the model it annotates.
 */
export function SceneLabel({
  children,
  size,
  color,
  position,
}: {
  children: string;
  /** Cap height in scene units (metres for the car and track models). */
  size: number;
  color: string;
  position?: [number, number, number];
}) {
  return (
    <Billboard position={position}>
      <Text
        font={SCENE_FONT}
        fontSize={size}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={size * 0.12}
        outlineColor="#0b0b0c"
        renderOrder={20}
        material-depthTest={false}
        material-transparent
      >
        {children}
      </Text>
    </Billboard>
  );
}
