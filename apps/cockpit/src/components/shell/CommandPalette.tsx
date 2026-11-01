"use client";

import type { LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

export interface PaletteItem {
  href: string;
  label: string;
  capability: string;
  icon: LucideIcon;
}

/** Dispatched by the sidebar search button. */
export const OPEN_EVENT = "daedalus:open-palette";

const CommandDialog = dynamic(() => import("./CommandDialog").then((m) => m.CommandDialog), {
  ssr: false,
});

/** ⌘K / Ctrl+K palette: jump to any workspace, design or CFD run. */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const show = () => {
      setLoaded(true);
      setOpen(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setLoaded(true);
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  return loaded ? <CommandDialog items={items} open={open} setOpen={setOpen} /> : null;
}
