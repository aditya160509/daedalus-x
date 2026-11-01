"use client";

/*
 * Section plane with stencil caps. The clip removes everything on one side of the plane; a
 * stencil pass counts the surfaces behind the cut, and the cap is drawn where that count is odd,
 * so the solid looks cut open rather than hollow. Technique after three.js
 * webgl_clipping_stencil (MIT). Stencil meshes are children of the part meshes, so they follow
 * the exploded view without being clickable.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LoadedModel } from "@/lib/gltf";

const CAP_FLAG = "sectionCap";

function stencilPair(geometry: THREE.BufferGeometry, plane: THREE.Plane): THREE.Group {
  const group = new THREE.Group();
  const base = {
    depthWrite: false,
    depthTest: false,
    colorWrite: false,
    stencilWrite: true,
    stencilFunc: THREE.AlwaysStencilFunc,
  };
  const back = new THREE.MeshBasicMaterial({
    ...base,
    side: THREE.BackSide,
    clippingPlanes: [plane],
    stencilFail: THREE.IncrementWrapStencilOp,
    stencilZFail: THREE.IncrementWrapStencilOp,
    stencilZPass: THREE.IncrementWrapStencilOp,
  });
  const front = new THREE.MeshBasicMaterial({
    ...base,
    side: THREE.FrontSide,
    clippingPlanes: [plane],
    stencilFail: THREE.DecrementWrapStencilOp,
    stencilZFail: THREE.DecrementWrapStencilOp,
    stencilZPass: THREE.DecrementWrapStencilOp,
  });
  for (const material of [back, front]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData[CAP_FLAG] = true;
    mesh.raycast = () => {};
    mesh.renderOrder = 1;
    group.add(mesh);
  }
  return group;
}

/** Clips the model at `position` (0 to 1 along X) and caps the cut. */
export function SectionPlane({
  model,
  position,
  mode,
}: {
  model: LoadedModel;
  position: number;
  mode: string;
}) {
  const scene = model.scene;
  const { min, max } = model.bounds;
  const x = min[0] + (max[0] - min[0]) * position;
  // Keeps x on the plane: n·p + c = 0 with n = (-1, 0, 0) gives c = x.
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), x), [x]);
  const latest = useRef(plane);

  useLayoutEffect(() => {
    latest.current = plane;
  }, [plane]);

  // Stencil groups depend on the mesh set and the material mode only, so dragging the plane is cheap.
  useLayoutEffect(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !o.userData[CAP_FLAG]) meshes.push(o);
    });
    const groups = meshes.map((mesh) => {
      const pair = stencilPair(mesh.geometry, latest.current);
      mesh.add(pair);
      return pair;
    });
    return () => {
      for (const group of groups) {
        group.parent?.remove(group);
        group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            const material = o.material;
            if (!Array.isArray(material)) material.dispose();
          }
        });
      }
    };
  }, [scene, mode]);

  // Clipping is a material property, so moving the plane only reassigns it.
  useLayoutEffect(() => {
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData[CAP_FLAG]) return;
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        material.clippingPlanes = [plane];
      }
      o.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData[CAP_FLAG]) {
          const material = child.material;
          if (!Array.isArray(material)) material.clippingPlanes = [plane];
        }
      });
    });
    // A mode switch replaces every material, so the clip is re-applied; the plane is the other input.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [scene, mode, plane]);

  const centreY = (min[1] + max[1]) / 2;
  const centreZ = (min[2] + max[2]) / 2;
  return (
    <mesh
      position={[x, centreY, centreZ]}
      rotation={[0, Math.PI / 2, 0]}
      scale={[max[2] - min[2] + 1, max[1] - min[1] + 1, 1]}
      renderOrder={2}
      raycast={() => null}
      userData={{ [CAP_FLAG]: true }}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#2b2b31"
        roughness={0.9}
        stencilWrite
        stencilRef={0}
        stencilFunc={THREE.NotEqualStencilFunc}
        stencilFail={THREE.ReplaceStencilOp}
        stencilZFail={THREE.ReplaceStencilOp}
        stencilZPass={THREE.ReplaceStencilOp}
      />
    </mesh>
  );
}
