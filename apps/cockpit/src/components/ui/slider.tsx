"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type SliderProps = Omit<
  ComponentProps<typeof SliderPrimitive.Root>,
  "value" | "defaultValue" | "onValueChange" | "onValueCommitted"
> & {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  "aria-label"?: string;
};

const toArray = (value: number | readonly number[]) =>
  typeof value === "number" ? [value] : [...value];

/** Single-thumb slider on the shared tokens. Every use here is a continuous scalar input. */
export function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  "aria-label": ariaLabel,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none items-center select-none", className)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(toArray(next))}
      onValueCommitted={(next) => onValueCommit?.(toArray(next))}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full items-center py-2">
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Indicator className="absolute h-full bg-brand/80" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={ariaLabel}
          className="block size-3 rounded-full border border-brand bg-background shadow-sm transition-[box-shadow] outline-none hover:ring-2 hover:ring-brand/25 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}
