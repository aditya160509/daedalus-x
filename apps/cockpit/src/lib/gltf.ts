import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface PartNode {
  uuid: string;
  name: string;
  label: string;
  group: string;
  depth: number;
  meshCount: number;
  triangles: number;
  /** World-space AABB of this part in display units (glTF metres). */
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  centroid: [number, number, number];
}

export interface LoadedModel {
  fileName: string;
  sha256: string;
  scene: THREE.Object3D;
  parts: PartNode[];
  /** Axis-aligned extents of the display mesh in file units (glTF uses metres). */
  extents: { x: number; y: number; z: number };
  /** World-space bounds of the display mesh; used for framing and dimension lines. */
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
  };
  triangles: number;
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function splitName(name: string): [string | null, string] {
  const slash = name.lastIndexOf("/");
  return slash > 0 ? [name.slice(0, slash), name.slice(slash + 1)] : [null, name];
}

export async function loadGlb(file: File): Promise<LoadedModel> {
  const buf = await file.arrayBuffer();
  const [hash, gltf] = await Promise.all([sha256Hex(buf), new GLTFLoader().parseAsync(buf, "")]);
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const parts: PartNode[] = [];
  let total = 0;
  const walk = (o: THREE.Object3D, depth: number, inheritedGroup: string | null) => {
    let meshes = 0;
    let tris = 0;
    o.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        meshes++;
        const g: THREE.BufferGeometry = c.geometry;
        tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      }
    });
    const [prefix, label] = splitName(o.name);
    const group = prefix ?? inheritedGroup ?? "ungrouped";
    if (depth > 0 && meshes > 0) {
      const box = new THREE.Box3().setFromObject(o);
      const centre = box.getCenter(new THREE.Vector3());
      parts.push({
        uuid: o.uuid,
        name: o.name || (o instanceof THREE.Mesh ? "Unnamed mesh" : "Unnamed group"),
        label: label || "Unnamed part",
        group,
        depth: depth - 1,
        meshCount: meshes,
        triangles: Math.round(tris),
        bboxMin: box.min.toArray(),
        bboxMax: box.max.toArray(),
        centroid: centre.toArray(),
      });
    }
    if (depth === 0) total = Math.round(tris);
    if (depth < 4) for (const child of o.children) walk(child, depth + 1, prefix ?? inheritedGroup);
  };
  walk(scene, 0, null);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  return {
    fileName: file.name,
    sha256: hash,
    scene,
    parts,
    extents: { x: size.x, y: size.y, z: size.z },
    bounds: { min: box.min.toArray(), max: box.max.toArray(), center: centre.toArray() },
    triangles: total,
  };
}

/** Fetch a server-side GLB and load it through the same hashing/part pipeline as a local file. */
export async function loadGlbUrl(url: string, name: string): Promise<LoadedModel> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GLB request failed: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  return loadGlb(new File([blob], name, { type: "model/gltf-binary" }));
}
