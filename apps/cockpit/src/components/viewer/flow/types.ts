import type { CameraPreset } from "../CarViewer";
import type { FlowField, FlowMesh } from "../../../lib/api";

export interface FlowLayers {
  surface: "cp" | "oil" | "sensitivity" | "plain" | "off";
  streamlines: boolean;
  wake: boolean;
  centreline: boolean;
  vortices: boolean;
  shell: boolean;
  arrows: boolean;
  animate: boolean;
  banded: boolean;
  density: number;
  slice: number;
  sliceScalar: "Ux/U∞" | "Cp0";
  qLevel: 50 | 200;
}
export const DEFAULT_LAYERS: FlowLayers = {
  surface: "cp",
  streamlines: true,
  wake: false,
  centreline: false,
  vortices: false,
  shell: false,
  arrows: false,
  animate: true,
  banded: true,
  density: 0.6,
  slice: 8,
  sliceScalar: "Ux/U∞",
  qLevel: 50,
};
export interface Probe {
  layer: string;
  value: number;
  name: string;
  x: number;
  y: number;
}
/** ΔCp surface produced by the worker; `mapped` means nearest-vertex correspondence. */
export interface DeltaSurface {
  mesh: FlowMesh;
  range: [number, number];
  mapped: boolean;
  rmsDistance: number;
}
export interface ViewStats {
  fps: number;
  effects: boolean;
  estimatedMiB: number;
  drawCalls: number;
}
export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}
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
export interface SceneProps {
  field: FlowField;
  layers: FlowLayers;
  cpRange: [number, number];
  preset: CameraPreset;
  presetNonce: number;
  onProbe: (p: Probe | null) => void;
  onStats: (stats: ViewStats) => void;
  onError: (message: string) => void;
  marker: { current: number | null };
  reducedMotion: boolean;
  fly: boolean;
  onFlyEnd: () => void;
  record: boolean;
  onRecordEnd: () => void;
  bus: ReturnType<typeof cameraBus>;
  id: string;
  budgetMiB: number;
  delta?: DeltaSurface;
}
