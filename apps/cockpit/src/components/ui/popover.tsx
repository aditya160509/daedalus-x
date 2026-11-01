"use client";

import type { ComponentProps, ReactElement } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;

/** `asChild` renders the single child element as the trigger, Radix-style. */
export function PopoverTrigger({
  asChild,
  children,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Trigger> & { asChild?: boolean }) {
  if (asChild) {
    return (
      <PopoverPrimitive.Trigger
        data-slot="popover-trigger"
        render={children as ReactElement}
        {...props}
      />
    );
  }
  return (
    <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  );
}

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 8,
  children,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<ComponentProps<typeof PopoverPrimitive.Positioner>, "align" | "sideOffset">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner align={align} sideOffset={sideOffset} className="z-50">
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "w-[min(28rem,calc(100vw-2rem))] rounded-xl border bg-popover text-popover-foreground shadow-float outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
