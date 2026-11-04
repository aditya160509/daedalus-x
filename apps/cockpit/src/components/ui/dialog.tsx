"use client";

import type { ComponentProps, ReactElement } from "react";
import { Dialog as Primitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = Primitive.Root;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;

/** `asChild` renders the single child element as the trigger, Radix-style. */
export function DialogTrigger({
  asChild,
  children,
  ...props
}: ComponentProps<typeof Primitive.Trigger> & { asChild?: boolean }) {
  if (asChild) {
    return (
      <Primitive.Trigger data-slot="dialog-trigger" render={children as ReactElement} {...props} />
    );
  }
  return (
    <Primitive.Trigger data-slot="dialog-trigger" {...props}>
      {children}
    </Primitive.Trigger>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mb-3 space-y-2 [&>h2]:text-lg [&>h2]:font-semibold [&>p]:text-sm [&>p]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Popup>) {
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="fixed inset-0 z-50 bg-background/80" />
      <Primitive.Popup
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-6 shadow-lg outline-none",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close
          aria-label="Close dialog"
          className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X className="size-4" />
        </Primitive.Close>
      </Primitive.Popup>
    </Primitive.Portal>
  );
}
