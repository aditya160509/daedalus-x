"use client";
import type { FlowMesh } from "@/lib/api";
import { PressureSkin } from "./PressureSkin";
import type { Probe } from "./types";
const RANGE: [number, number] = [-1, 1];
export function SensitivityMap({
  mesh,
  onProbe,
}: {
  mesh: FlowMesh;
  onProbe: (p: Probe | null) => void;
}) {
  return (
    <PressureSkin
      mesh={mesh}
      range={RANGE}
      banded={false}
      label="outward sensitivity"
      onProbe={onProbe}
    />
  );
}
