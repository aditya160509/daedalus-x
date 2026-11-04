"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Key } from "./Key";

/** Dispatched by the command palette action. */
export const OPEN_SHORTCUTS = "daedalus:open-shortcuts";

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "Global",
    items: [
      { keys: ["⌘", "K"], label: "Search workspaces, designs and runs" },
      { keys: ["1", "–", "4"], label: "Switch workspace" },
      { keys: ["E"], label: "Evidence drawer" },
      { keys: ["?"], label: "This shortcut sheet" },
    ],
  },
  {
    title: "Race",
    items: [
      { keys: ["Space"], label: "Play or pause the replay" },
      { keys: ["R"], label: "Trigger the reaction trainer" },
    ],
  },
];

/** `?` shortcut sheet. Only shortcuts that are actually wired are listed. */
export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <div className="border-b px-5 py-4">
          <DialogHeader className="mb-0">
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Active when focus is not in a text field or a dialog.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="grid gap-6 p-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {group.title}
              </h3>
              <dl className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 text-[13px]"
                  >
                    <dt className="text-text-2">{item.label}</dt>
                    <dd className="flex shrink-0 gap-1">
                      {item.keys.map((key) => (
                        <Key key={key}>{key}</Key>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
