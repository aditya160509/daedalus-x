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
    <div className="flex min-h-11 shrink-0 flex-wrap items-end gap-1 border-b px-2 sm:px-4">
      <div
        role="tablist"
        aria-label="Views"
        className="mask-fade-x flex h-11 max-w-full items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
                "relative h-full rounded-t-md px-3 text-[13px] transition-colors duration-150 outline-none hover:bg-white/[0.025] focus-visible:bg-accent focus-visible:text-foreground",
                on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors duration-150",
                  on ? "bg-brand" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
      {right && (
        <div className="ml-auto flex min-h-9 max-w-full items-center gap-2 pb-1">{right}</div>
      )}
    </div>
  );
}

/** Thin bottom bar of key numbers, replacing rows of metric cards. */
export function StatusBar({
  items,
}: {
  items: { label: string; value: React.ReactNode; tone?: "risk" | "ok" | "muted"; title?: string }[];
}) {
  return (
    <div
      role="group"
      aria-label="Key figures"
      className="flex h-8 shrink-0 items-center gap-5 overflow-x-auto border-t px-4 text-[11px] whitespace-nowrap text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((it) => (
        <span key={it.label} className="flex shrink-0 items-baseline gap-1.5" title={it.title}>
          {it.label}
          <span
            className={cn(
              "tabular font-mono text-foreground",
              it.tone === "risk" && "text-risk",
              it.tone === "ok" && "text-ok",
              it.tone === "muted" && "text-muted-foreground/60",
            )}
          >
            {it.value}
          </span>
        </span>
      ))}
    </div>
  );
}
