"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";

export function AdvancedFields({
  children,
  description,
  invalidCount = 0,
  disabled = false,
}: {
  children: ReactNode;
  description: string;
  invalidCount?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const expanded = open || invalidCount > 0;
  return (
    <Collapsible.Root
      open={expanded}
      onOpenChange={setOpen}
      disabled={disabled}
      className="rounded-lg border"
    >
      <Collapsible.Trigger
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "h-auto w-full justify-between whitespace-normal px-3 py-2 text-left",
        })}
      >
        <span>
          Advanced
          {invalidCount > 0
            ? ` · ${invalidCount} invalid ${invalidCount === 1 ? "field" : "fields"}`
            : ""}
        </span>
        <ChevronDown aria-hidden className={expanded ? "size-3.5 rotate-180" : "size-3.5"} />
      </Collapsible.Trigger>
      <Collapsible.Panel keepMounted className="space-y-4 border-t p-3 data-[closed]:hidden">
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
