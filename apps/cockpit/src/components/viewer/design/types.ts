import type { CameraPreset } from "../types";
import type { LoadedModel } from "@/lib/gltf";
import type { Vec3 } from "./designMath";

export type ViewMode = "studio" | "engineering";

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

/** Shared orbit state so a comparison pair never drifts out of sync. */
export function cameraBus() {
  const listeners = new Set<(owner: string, pose: CameraPose) => void>();
  return {
    publish: (owner: string, pose: CameraPose) => listeners.forEach((fn) => fn(owner, pose)),
    subscribe: (fn: (owner: string, pose: CameraPose) => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
export type CameraBus = ReturnType<typeof cameraBus>;

/** A snapped click. `point` is world space, in display-mesh metres. */
export interface MeasurePoint {
  point: Vec3;
  meshUuid: string;
}

export interface MeasureState {
  a: MeasurePoint;
  b: MeasurePoint | null;
}

export interface Frame {
  center: Vec3;
  /** Half the largest bounding-box dimension. */
  radius: number;
}

export interface DesignSceneProps {
  id: string;
  model: LoadedModel;
  frame: Frame;
  mode: ViewMode;
  selected: string | null;
  onSelect: (uuid: string | null) => void;
  /** Section plane position along X (0 to 1), or null when no section is cut. */
  section?: number | null;
  /** Part uuids hidden from the model tree's eye toggles. */
  hidden?: ReadonlySet<string>;
  preset: CameraPreset;
  presetNonce: number;
  explode: number;
  turntable: boolean;
  dimensions: boolean;
  measureOn: boolean;
  measure: MeasureState | null;
  onMeasurePoint: (point: MeasurePoint) => void;
  /** Colour-mapped CAD deviation points for the revision surface, when compare-deviation is on. */
  deviation?: import("./deviation").DeviationRender | null;
  /** Registers the 2× PNG capture function; compare canvases leave this undefined. */
  onSnapshot?: (capture: (() => string | null) | null) => void;
  bus: CameraBus;
  reducedMotion: boolean;
}
