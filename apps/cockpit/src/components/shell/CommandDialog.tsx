"use client";

import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { ArrowDown, ArrowUp, Box, RefreshCw, Wind } from "lucide-react";
import { useRouter } from "next/navigation";
import { Key } from "./Key";
import type { PaletteItem } from "./CommandPalette";
import { listCfdRuns, listDesigns } from "@/lib/api";

const ITEM =
  "flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-[13px] text-text-2 data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-foreground";
const GROUP =
  "px-1.5 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground";

/** The ⌘K dialog body; loaded on first open so cmdk stays out of the initial bundle. */
export function CommandDialog({
  items,
  open,
  setOpen,
}: {
  items: PaletteItem[];
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns, enabled: open });
  const runs = useQuery({ queryKey: ["cfd-runs"], queryFn: listCfdRuns, enabled: open });

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
      contentClassName="glass fixed top-[18vh] left-1/2 z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl"
    >
      <Command.Input
        placeholder="Search workspaces, designs, runs…"
        className="h-14 w-full border-b border-white/[0.06] bg-transparent px-5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <Command.List className="max-h-[52vh] overflow-y-auto py-1">
        <Command.Empty className="px-5 py-8 text-center text-sm text-muted-foreground">
          No results.
        </Command.Empty>
        <Command.Group heading="Workspaces" className={GROUP}>
          {items.map((item) => (
            <Command.Item
              key={item.href}
              value={`${item.label} ${item.capability}`}
              onSelect={() => go(item.href)}
              className={ITEM}
            >
              <item.icon size={16} className="text-muted-foreground" />
              {item.label}
              <span className="ml-auto font-mono text-[10px] tracking-wide text-muted-foreground">
                {item.capability}
              </span>
            </Command.Item>
          ))}
        </Command.Group>
        {(designs.data?.length ?? 0) > 0 && (
          <Command.Group heading="Designs" className={GROUP}>
            {designs.data?.map((design) => (
              <Command.Item
                key={design.design_id}
                value={`design ${design.design_id}`}
                onSelect={() => go("/design")}
                className={ITEM}
              >
                <Box size={16} className="text-muted-foreground" />
                <span className="font-mono text-xs">{design.design_id}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {design.source_file}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {(runs.data?.length ?? 0) > 0 && (
          <Command.Group heading="CFD runs" className={GROUP}>
            {runs.data?.map((run) => (
              <Command.Item
                key={run.run_id}
                value={`run ${run.run_id}`}
                onSelect={() => go("/simulate")}
                className={ITEM}
              >
                <Wind size={16} className="text-muted-foreground" />
                <span className="font-mono text-xs">{run.run_id}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        <Command.Group heading="Actions" className={GROUP}>
          <Command.Item
            value="reload refresh"
            onSelect={() => window.location.reload()}
            className={ITEM}
          >
            <RefreshCw size={16} className="text-muted-foreground" />
            Reload cockpit
          </Command.Item>
        </Command.Group>
      </Command.List>
      <footer className="flex items-center gap-4 border-t border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs text-muted-foreground">
        <Hint>
          <Key>
            <ArrowUp size={11} />
          </Key>
          <Key>
            <ArrowDown size={11} />
          </Key>
          Navigate
        </Hint>
        <Hint>
          <Key>Enter</Key>Select
        </Hint>
        <Hint>
          <Key>Esc</Key>Close
        </Hint>
      </footer>
    </Command.Dialog>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-1.5">{children}</span>;
}
