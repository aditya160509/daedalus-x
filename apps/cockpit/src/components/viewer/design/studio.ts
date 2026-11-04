import * as THREE from "three";

/** Team paint. Change here, not in components. */
const TEAM_COLOUR = "#18b8c9";
const BODY_CLEARCOAT = 1;
const BODY_CLEARCOAT_ROUGHNESS = 0.08;
const BODY_METALNESS = 0.1;
const BODY_ROUGHNESS = 0.28;
const WING_ROUGHNESS = 0.55;
const WING_METALNESS = 0.15;
const TYRE_ROUGHNESS = 0.9;
const TYRE_METALNESS = 0.02;
const CARTRIDGE_METALNESS = 0.85;
const CARTRIDGE_ROUGHNESS = 0.32;
export const TURNTABLE_DEG_PER_S = 6;
export const SNAPSHOT_SCALE = 2;

export const STUDIO_BACKGROUND = "#0b0b0c";
export const ENGINEERING_BACKGROUND = "#0b0e12";
export const STUDIO_AMBIENT = 0.35;
export const SHADOW_FRAMES = 60;
export const SHADOW_OPACITY = 0.72;
export const SHADOW_RESOLUTION = 512;
export const SHADOW_SCALE = 7;
export const SHADOW_LIGHT_AMOUNT = 8;
export const FLOOR_MIRROR = 0.3;
export const FLOOR_MIX_STRENGTH = 5;
export const FLOOR_RESOLUTION = 512;
export const FLOOR_COLOUR = "#0f1216";

export interface LightformerSpec {
  form: "rect" | "circle" | "ring";
  intensity: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  colour: string;
}

/** Three softboxes plus a cool rim: top key, left fill, rear rim, right kicker. */
export const STUDIO_LIGHTFORMERS: readonly LightformerSpec[] = [
  {
    form: "rect",
    intensity: 3.2,
    position: [0, 3, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: [5, 2.2, 1],
    colour: "#ffffff",
  },
  {
    form: "rect",
    intensity: 1.3,
    position: [-3, 1.1, 1.4],
    rotation: [0, Math.PI / 2, 0],
    scale: [2.6, 1.8, 1],
    colour: "#e8f6ff",
  },
  {
    form: "rect",
    intensity: 1.6,
    position: [0, 1.2, -3.4],
    rotation: [0, 0, 0],
    scale: [3.4, 1.2, 1],
    colour: "#9ec9ff",
  },
  {
    form: "rect",
    intensity: 0.8,
    position: [3, 0.8, 0.8],
    rotation: [0, -Math.PI / 2, 0],
    scale: [2, 1.2, 1],
    colour: "#ffffff",
  },
];

const ENGINEERING_COLOURS: Record<string, string> = {
  body: "#8b949e",
  front_wing: "#5b8cff",
  rear_wing: "#b18cff",
  wheels: "#6b7280",
  cartridge: "#f5a524",
  ungrouped: "#9ca3af",
};

export type MaterialMode = "studio" | "engineering";

export function partGroup(name: string): string {
  const slash = name.lastIndexOf("/");
  if (slash > 0) return name.slice(0, slash);
  return "ungrouped";
}

/**
 * One material per mesh so selection can highlight a single part without tinting its group.
 * Studio uses physically based paint; engineering uses a neutral group colour.
 */
export function createPartMaterial(group: string, mode: MaterialMode): THREE.MeshStandardMaterial {
  if (mode === "engineering") {
    return new THREE.MeshStandardMaterial({
      color: ENGINEERING_COLOURS[group] ?? ENGINEERING_COLOURS.ungrouped,
      roughness: 0.62,
      metalness: 0.08,
    });
  }
  if (group === "wheels") {
    return new THREE.MeshPhysicalMaterial({
      color: "#121316",
      roughness: TYRE_ROUGHNESS,
      metalness: TYRE_METALNESS,
      clearcoat: 0,
    });
  }
  if (group === "cartridge") {
    return new THREE.MeshPhysicalMaterial({
      color: "#a8b0ba",
      roughness: CARTRIDGE_ROUGHNESS,
      metalness: CARTRIDGE_METALNESS,
      clearcoat: 0.15,
      clearcoatRoughness: 0.3,
    });
  }
  if (group === "front_wing" || group === "rear_wing") {
    return new THREE.MeshPhysicalMaterial({
      color: "#23272d",
      roughness: WING_ROUGHNESS,
      metalness: WING_METALNESS,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: TEAM_COLOUR,
    roughness: BODY_ROUGHNESS,
    metalness: BODY_METALNESS,
    clearcoat: BODY_CLEARCOAT,
    clearcoatRoughness: BODY_CLEARCOAT_ROUGHNESS,
  });
}
