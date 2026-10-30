import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface PartNode {
  uuid: string;
  name: string;
  depth: number;
  meshCount: number;
  triangles: number;
}

export interface LoadedModel {
  fileName: string;
  sha256: string;
  scene: THREE.Object3D;
  parts: PartNode[];
  /** Axis-aligned extents of the display mesh in file units (glTF uses metres). */
  extents: { x: number; y: number; z: number };
  triangles: number;
}

export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loadGlb(file: File): Promise<LoadedModel> {
  const buf = await file.arrayBuffer();
  const [hash, gltf] = await Promise.all([sha256Hex(buf), new GLTFLoader().parseAsync(buf, "")]);
  const scene = gltf.scene;
  const parts: PartNode[] = [];
  let total = 0;
  const walk = (o: THREE.Object3D, depth: number) => {
    let meshes = 0;
    let tris = 0;
    o.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        meshes++;
        const g = c.geometry as THREE.BufferGeometry;
        tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      }
    });
    if (depth > 0 && meshes > 0) {
      parts.push({
        uuid: o.uuid,
        name: o.name || (o instanceof THREE.Mesh ? "Unnamed mesh" : "Unnamed group"),
        depth: depth - 1,
        meshCount: meshes,
        triangles: Math.round(tris),
      });
    }
    if (depth === 0) total = Math.round(tris);
    if (depth < 4) for (const child of o.children) walk(child, depth + 1);
  };
  walk(scene, 0);
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  return {
    fileName: file.name,
    sha256: hash,
    scene,
    parts,
    extents: { x: size.x, y: size.y, z: size.z },
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
