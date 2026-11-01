"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("group/toggle-group flex w-fit items-center rounded-md", className)}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, ...props }: ComponentProps<typeof TogglePrimitive>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex w-auto min-w-0 shrink-0 items-center justify-center gap-2 px-3 text-sm font-medium whitespace-nowrap outline-none focus:z-10 focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-accent data-[pressed]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
