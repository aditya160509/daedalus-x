"use client";

import type { ComponentProps, ReactElement } from "react";
import { Dialog as Primitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Primitive.Root;
export const SheetTitle = Primitive.Title;
export const SheetDescription = Primitive.Description;

/** `asChild` renders the single child element as the trigger, Radix-style. */
export function SheetTrigger({
  asChild,
  children,
  ...props
}: ComponentProps<typeof Primitive.Trigger> & { asChild?: boolean }) {
  if (asChild) {
    return (
      <Primitive.Trigger data-slot="sheet-trigger" render={children as ReactElement} {...props} />
    );
  }
  return (
    <Primitive.Trigger data-slot="sheet-trigger" {...props}>
      {children}
    </Primitive.Trigger>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "p-4 pr-10 [&>h2]:text-lg [&>h2]:font-semibold [&>p]:mt-2 [&>p]:text-sm [&>p]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Popup>) {
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="fixed inset-0 z-50 bg-background/80" />
      <Primitive.Popup
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full border-l bg-card shadow-lg outline-none sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close
          aria-label="Close jobs drawer"
          className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X className="size-4" />
        </Primitive.Close>
      </Primitive.Popup>
    </Primitive.Portal>
  );
}
