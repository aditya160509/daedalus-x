"use client";

import type { CameraPreset } from "../types";
import { DesignScene } from "./DesignScene";
import type { CameraBus, Frame, MeasurePoint, MeasureState, ViewMode } from "./types";
import type { LoadedModel } from "../../../lib/gltf";

/** Side-by-side designs sharing one orbit bus. The left canvas owns turntable, measure and capture. */
export function DesignCompare({
  primary,
  comparison,
  primaryLabel,
  comparisonLabel,
  frame,
  mode,
  selected,
  onSelect,
  preset,
  presetNonce,
  explode,
  turntable,
  dimensions,
  measureOn,
  measure,
  onMeasurePoint,
  onSnapshot,
  bus,
  reducedMotion,
}: {
  primary: LoadedModel;
  comparison: LoadedModel;
  primaryLabel: string;
  comparisonLabel: string;
  frame: Frame;
  mode: ViewMode;
  selected: string | null;
  onSelect: (uuid: string | null) => void;
  preset: CameraPreset;
  presetNonce: number;
  explode: number;
  turntable: boolean;
  dimensions: boolean;
  measureOn: boolean;
  measure: MeasureState | null;
  onMeasurePoint: (point: MeasurePoint) => void;
  onSnapshot: (capture: (() => string | null) | null) => void;
  bus: CameraBus;
  reducedMotion: boolean;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-px bg-border">
      <div className="relative min-h-0">
        <DesignScene
          id="primary"
          model={primary}
          frame={frame}
          mode={mode}
          selected={selected}
          onSelect={onSelect}
          preset={preset}
          presetNonce={presetNonce}
          explode={explode}
          turntable={turntable}
          dimensions={dimensions}
          measureOn={measureOn}
          measure={measure}
          onMeasurePoint={onMeasurePoint}
          onSnapshot={onSnapshot}
          bus={bus}
          reducedMotion={reducedMotion}
        />
        <StageTag label="A" name={primaryLabel} />
      </div>
      <div className="relative min-h-0">
        <DesignScene
          id="comparison"
          model={comparison}
          frame={frame}
          mode={mode}
          selected={null}
          onSelect={() => {}}
          preset={preset}
          presetNonce={presetNonce}
          explode={explode}
          turntable={false}
          dimensions={dimensions}
          measureOn={false}
          measure={null}
          onMeasurePoint={() => {}}
          bus={bus}
          reducedMotion={reducedMotion}
        />
        <StageTag label="B" name={comparisonLabel} />
      </div>
    </div>
  );
}

function StageTag({ label, name }: { label: string; name: string }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border bg-card/85 px-2 py-1 text-[11px] backdrop-blur">
      <span className="flex size-4 items-center justify-center rounded-sm bg-brand/15 font-mono text-[10px] text-brand">
        {label}
      </span>
      <span className="font-mono text-text-2">{name}</span>
    </div>
  );
}
