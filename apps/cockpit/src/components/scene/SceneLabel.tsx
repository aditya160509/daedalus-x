"use client";

import { Html } from "@react-three/drei";

/**
 * A 3D-anchored text label drawn as a DOM span (drei Html), so it never touches troika SDF text,
 * which breaks on three 0.187 materials. Stays legible on a dark plate and tracks its point.
 */
export function SceneLabel({
  children,
  color,
  position,
}: {
  children: string;
  /** Kept for call-site compatibility; labels use a fixed screen size. */
  size?: number;
  color: string;
  position?: [number, number, number];
}) {
  return (
    <group position={position}>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span
          className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap"
          style={{ color }}
        >
          {children}
        </span>
      </Html>
    </group>
  );
}
