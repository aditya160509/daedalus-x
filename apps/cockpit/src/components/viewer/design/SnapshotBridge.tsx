"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { SNAPSHOT_SCALE } from "./studio";

/**
 * Registers a PNG capture that renders one frame at 2× the current drawing buffer, then restores
 * the renderer. `preserveDrawingBuffer` on the Canvas keeps `toDataURL` reliable.
 */
export function SnapshotBridge({
  register,
}: {
  register: ((capture: (() => string | null) | null) => void) | undefined;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (!register) return undefined;
    register(() => {
      const size = gl.getSize(new THREE.Vector2());
      if (!(size.x > 0 && size.y > 0)) return null;
      try {
        gl.setSize(size.x * SNAPSHOT_SCALE, size.y * SNAPSHOT_SCALE, false);
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      } finally {
        gl.setSize(size.x, size.y, false);
        gl.render(scene, camera);
      }
    });
    return () => register(null);
    // Rebind when the renderer, scene or registration target changes.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [camera, gl, register, scene]);

  return null;
}
