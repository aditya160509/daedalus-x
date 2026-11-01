"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TabDef<T extends string> {
  id: T;
  label: string;
}

/** Tab state mirrored in the URL hash (#tab) so a view survives reload and can be shared. */
export function useTab<T extends string>(tabs: readonly TabDef<T>[]): [T, (t: T) => void] {
  const [tab, setTab] = useState<T>(tabs[0].id);
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      const hit = tabs.find((t) => t.id === h);
      if (hit) setTab(hit.id);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [tabs]);
  const select = (t: T) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };
  return [tab, select];
}

/** Google/Linear-style underline tab bar: one job per tab, keyboard ←/→ between tabs. */
export function WorkspaceTabs<T extends string>({
  tabs,
  value,
  onChange,
  right,
}: {
  tabs: readonly TabDef<T>[];
  value: T;
  onChange: (t: T) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-end gap-1 border-b px-4">
      <div role="tablist" aria-label="Views" className="flex h-full items-end gap-1">
        {tabs.map((t, i) => {
          const on = t.id === value;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => {
                const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (!d) return;
                const next = tabs[(i + d + tabs.length) % tabs.length];
                onChange(next.id);
                (
                  e.currentTarget.parentElement?.children[(i + d + tabs.length) % tabs.length] as
                    | HTMLElement
                    | undefined
                )?.focus();
              }}
              className={cn(
                "relative h-full px-3 text-[13px] transition-colors outline-none focus-visible:text-foreground",
                on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors",
                  on ? "bg-foreground" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
      {right && <div className="ml-auto flex h-full items-center gap-3 pb-1">{right}</div>}
    </div>
  );
}

/** Thin bottom bar of key numbers, replacing rows of metric cards. */
export function StatusBar({
  items,
}: {
  items: { label: string; value: React.ReactNode; tone?: "risk" | "ok" }[];
}) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-5 border-t px-4 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-baseline gap-1.5">
          {it.label}
          <span
            className={cn(
              "tabular font-mono text-foreground",
              it.tone === "risk" && "text-risk",
              it.tone === "ok" && "text-ok",
            )}
          >
            {it.value}
          </span>
        </span>
      ))}
    </div>
  );
}
