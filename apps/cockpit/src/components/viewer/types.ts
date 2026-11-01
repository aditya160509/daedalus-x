export type CameraPreset = "iso" | "front" | "side" | "top";

export const CAMERA_PRESETS: ReadonlyArray<{ value: CameraPreset; label: string }> = [
  { value: "iso", label: "Iso" },
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "top", label: "Top" },
];
