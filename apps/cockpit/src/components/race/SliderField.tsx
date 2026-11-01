"use client";

import { NumberField } from "@/components/ui/primitives";
import { Slider } from "@/components/ui/slider";

/** Numeric field with the matching slider directly below it. */
export function SliderField({
  id,
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}) {
  const safe = Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
  return (
    <div className="space-y-1.5">
      <NumberField
        id={id}
        label={label}
        unit={unit}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        onCommit={() => onCommit?.(value)}
      />
      <Slider
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={[safe]}
        onValueChange={(next) => {
          const first = next[0];
          if (first !== undefined) onChange(first);
        }}
        onValueCommit={(next) => {
          const first = next[0];
          if (first !== undefined) {
            onChange(first);
            onCommit?.(first);
          }
        }}
        className="px-0.5"
      />
    </div>
  );
}
