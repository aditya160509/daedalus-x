"use client";

import type { ComponentProps } from "react";
import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Primitive.Root;
export const SheetTrigger = Primitive.Trigger;
export const SheetTitle = Primitive.Title;
export const SheetDescription = Primitive.Description;
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
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-background/80" />
      <Primitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full border-l bg-card shadow-lg sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close
          aria-label="Close jobs drawer"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X className="size-4" />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
