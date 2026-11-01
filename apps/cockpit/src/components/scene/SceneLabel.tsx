"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

const PX = 64; // canvas text height in pixels; the sprite is scaled to `size` world units

/**
 * A 3D-anchored text label drawn into a canvas texture on a sprite. Plain three.js: no troika
 * (breaks on three 0.187 materials) and no drei Html (extra React roots that race on unmount).
 */
export function SceneLabel({
  children,
  color,
  position,
  size = 0.012,
}: {
  children: string;
  /** Text height in world units (metres). */
  size?: number;
  color: string;
  position?: [number, number, number];
}) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const font = `500 ${PX}px ui-monospace, "JetBrains Mono", monospace`;
    let width = PX * 4;
    if (ctx) {
      ctx.font = font;
      width = Math.ceil(ctx.measureText(children).width) + PX * 0.6;
    }
    canvas.width = width;
    canvas.height = Math.ceil(PX * 1.5);
    if (ctx) {
      ctx.fillStyle = "rgba(10,10,12,0.78)";
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, PX * 0.25);
      ctx.fill();
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = "middle";
      ctx.fillText(children, PX * 0.3, canvas.height / 2);
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    return { texture: tex, aspect: canvas.width / canvas.height };
  }, [children, color]);

  useEffect(() => () => texture.dispose(), [texture]);

  const h = size * 1.3;
  return (
    <sprite position={position} scale={[h * aspect, h, 1]} renderOrder={20}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
