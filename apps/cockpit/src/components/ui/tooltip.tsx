"use client";

import type { ComponentProps, ReactElement } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

/** `delayDuration` keeps the Radix name used across the app; Base UI calls it `delay`. */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: Omit<ComponentProps<typeof TooltipPrimitive.Provider>, "delay"> & { delayDuration?: number }) {
  return (
    <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delayDuration} {...props} />
  );
}

function Tooltip({ ...props }: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

/** `asChild` renders the single child element as the trigger, Radix-style. */
function TooltipTrigger({
  asChild,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Trigger> & { asChild?: boolean }) {
  if (asChild) {
    return (
      <TooltipPrimitive.Trigger
        data-slot="tooltip-trigger"
        render={children as ReactElement}
        {...props}
      />
    );
  }
  return (
    <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 0,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<ComponentProps<typeof TooltipPrimitive.Positioner>, "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 w-fit animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
