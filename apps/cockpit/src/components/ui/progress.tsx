"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Progress({ className, value, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} {...props}>
      <ProgressPrimitive.Track
        className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full bg-primary transition-[width]"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
