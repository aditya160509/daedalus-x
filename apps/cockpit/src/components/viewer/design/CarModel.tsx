"use client";

import { Edges, Outlines } from "@react-three/drei";
import { createPortal, type ThreeEvent, useFrame } from "@react-three/fiber";
import { damp3 } from "maath/easing";
import { Fragment, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LoadedModel, PartNode } from "@/lib/gltf";
import { explodeOffset, nearestVertex, type Vec3 } from "./designMath";
import { createPartMaterial, partGroup, type MaterialMode } from "./studio";
import type { MeasurePoint } from "./types";
import { SceneLabel } from "@/components/scene/SceneLabel";

interface PartNodeRef {
  part: PartNode;
  node: THREE.Object3D;
  base: THREE.Vector3;
}

/**
 * Applies the studio/engineering material set to the loaded GLB, eases the exploded view with
 * maath damp3, and routes clicks to selection or the measure tool.
 */
export function CarModel({
  model,
  mode,
  explode,
  selected,
  hidden,
  measureOn,
  onSelect,
  onMeasurePoint,
  reducedMotion,
}: {
  model: LoadedModel;
  mode: MaterialMode;
  explode: number;
  selected: string | null;
  hidden?: ReadonlySet<string>;
  measureOn: boolean;
  onSelect: (uuid: string | null) => void;
  onMeasurePoint: (point: MeasurePoint) => void;
  reducedMotion: boolean;
}) {
  const scene = model.scene;
  const nodes = useMemo<PartNodeRef[]>(() => {
    return model.parts
      .filter((part) => part.depth === 0)
      .flatMap((part) => {
        const node = scene.getObjectByProperty("uuid", part.uuid);
        return node ? [{ part, node, base: node.position.clone() }] : [];
      });
  }, [model.parts, scene]);
  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !o.userData.sectionCap) list.push(o);
    });
    return list;
  }, [scene]);
  const carCentre = model.bounds.center;
  const labelSize = Math.max(model.extents.x, model.extents.y, model.extents.z) * 0.035;

  useLayoutEffect(() => {
    const created: THREE.Material[] = [];
    const replaced: THREE.Material[] = [];
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.sectionCap) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) replaced.push(m);
      const material = createPartMaterial(partGroup(o.name), mode);
      o.material = material;
      created.push(material);
    });
    for (const m of replaced) m.dispose();
    return () => {
      for (const m of created) m.dispose();
    };
  }, [scene, mode]);

  // The selected part is outlined with an inverted-hull shell, so the highlight never changes its material.
  const selectedMeshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    if (!selected) return list;
    scene.getObjectByProperty("uuid", selected)?.traverse((o) => {
      if (o instanceof THREE.Mesh) list.push(o);
    });
    return list;
  }, [scene, selected]);

  // Visibility is a scene-graph flag, so hiding a parent also hides its children.
  useLayoutEffect(() => {
    for (const part of model.parts) {
      const node = scene.getObjectByProperty("uuid", part.uuid);
      if (node) node.visible = !hidden?.has(part.uuid);
    }
  }, [model.parts, scene, hidden]);

  useFrame((_, delta) => {
    for (const { part, node, base } of nodes) {
      const offset = explodeOffset(part.centroid, carCentre, explode);
      const target: Vec3 = [base.x + offset[0], base.y + offset[1], base.z + offset[2]];
      if (reducedMotion) node.position.set(...target);
      else damp3(node.position, target, 0.18, Math.min(delta, 0.1));
    }
  });

  const partAt = (object: THREE.Object3D): string => {
    let current: THREE.Object3D | null = object;
    while (current && current !== scene) {
      if (nodes.some((n) => n.node === current)) return current.uuid;
      current = current.parent;
    }
    return object.uuid;
  };

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!(event.object instanceof THREE.Mesh)) return;
    if (measureOn) {
      const snap = nearestVertex(worldVertices(event.object), [
        event.point.x,
        event.point.y,
        event.point.z,
      ]);
      onMeasurePoint({ point: snap.point, meshUuid: event.object.uuid });
      return;
    }
    onSelect(partAt(event.object));
  };

  return (
    <>
      <primitive object={scene} onClick={onClick} />
      {selectedMeshes.map((mesh) => (
        <Fragment key={mesh.uuid}>
          {createPortal(
            <Outlines screenspace thickness={2} color="#22d3ee" renderOrder={5} />,
            mesh,
          )}
        </Fragment>
      ))}
      {mode === "engineering" && meshes.map((mesh) => <PartEdges key={mesh.uuid} mesh={mesh} />)}
      <ExplodeLabels nodes={nodes} explode={explode} labelSize={labelSize} />
    </>
  );
}

/** World-space vertices of a display mesh, including the current exploded offset. */
function worldVertices(mesh: THREE.Mesh): Float32Array {
  const position = mesh.geometry.getAttribute("position");
  const out = new Float32Array(position.count * 3);
  const vertex = new THREE.Vector3();
  mesh.updateWorldMatrix(true, false);
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    out[i * 3] = vertex.x;
    out[i * 3 + 1] = vertex.y;
    out[i * 3 + 2] = vertex.z;
  }
  return out;
}

/** Engineering-mode edges. `Edges` needs an explicit geometry because its parent is a rig group. */
function PartEdges({ mesh }: { mesh: THREE.Mesh }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    mesh.updateWorldMatrix(true, false);
    group.current.matrix.copy(mesh.matrixWorld);
    group.current.matrixWorldNeedsUpdate = true;
  });
  return (
    <group ref={group} matrixAutoUpdate={false}>
      <Edges
        geometry={mesh.geometry}
        threshold={20}
        color="#3dd6f0"
        lineWidth={0.7}
        transparent
        opacity={0.55}
      />
    </group>
  );
}

function ExplodeLabels({
  nodes,
  explode,
  labelSize,
}: {
  nodes: PartNodeRef[];
  explode: number;
  labelSize: number;
}) {
  const groups = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    nodes.forEach((entry, index) => {
      const group = groups.current[index];
      if (!group) return;
      group.position.set(
        entry.part.centroid[0] + (entry.node.position.x - entry.base.x),
        entry.part.centroid[1] + (entry.node.position.y - entry.base.y),
        entry.part.centroid[2] + (entry.node.position.z - entry.base.z),
      );
    });
  });
  if (explode <= 0.3) return null;
  return nodes.map((entry, index) => (
    <group
      key={entry.part.uuid}
      ref={(element) => {
        groups.current[index] = element;
      }}
    >
      <SceneLabel size={labelSize} color="#d4d4d8">
        {entry.part.label}
      </SceneLabel>
    </group>
  ));
}
