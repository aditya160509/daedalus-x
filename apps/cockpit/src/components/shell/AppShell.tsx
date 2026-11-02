"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Box,
  ChevronsUpDown,
  FileStack,
  Gauge,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Search,
  Settings,
  type LucideIcon,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandPalette, OPEN_EVENT } from "./CommandPalette";
import { RunPicker } from "./RunPicker";
import { EvidenceDrawer, OPEN_EVIDENCE } from "@/components/evidence/EvidenceDrawer";
import { OPEN_PRESENTER, Presenter } from "@/components/present/Presenter";
import { Key } from "./Key";
import { getHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Workspace {
  href: string;
  label: string;
  capability: string;
  icon: LucideIcon;
  /** Pipeline readiness shown in the sidebar; never a fabricated count. */
  status: "live" | "partial" | "pending";
}

interface Section {
  title: string;
  items: Workspace[];
}

const SECTIONS: Section[] = [
  {
    title: "Workspaces",
    items: [
      { href: "/", label: "Pit Wall", capability: "ATLAS", icon: LayoutDashboard, status: "live" },
      { href: "/simulate", label: "Wind Tunnel", capability: "AETHER", icon: Wind, status: "live" },
      { href: "/design", label: "Design Studio", capability: "AETHER", icon: Box, status: "live" },
      { href: "/race", label: "Race", capability: "TITAN", icon: Gauge, status: "live" },
    ],
  },
];

const ALL = SECTIONS.flatMap((s) => s.items);

const STATUS_DOT: Record<Workspace["status"], string> = {
  live: "bg-ok",
  partial: "bg-brand",
  pending: "bg-line-strong",
};
const STATUS_LABEL: Record<Workspace["status"], string> = {
  live: "Live",
  partial: "Partial",
  pending: "Not built yet",
};

const COLLAPSE_KEY = "daedalus:sidebar-collapsed";

/** Remembered sidebar state. Storage can be blocked, so reads and writes never throw. */
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

const collapseListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void) {
  collapseListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    collapseListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable: the choice lasts for this page view only.
  }
  collapseListeners.forEach((listener) => listener());
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = ALL.find((w) => (w.href === "/" ? pathname === "/" : pathname.startsWith(w.href)));
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const toggleCollapsed = () => writeCollapsed(!collapsed);

  // Keys 1-6 jump to a workspace (04-UI-QUALITY-BAR).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const target = ALL[Number(event.key) - 1];
      if (target) router.push(target.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className={cn(
          "grid h-dvh min-w-[1280px] overflow-hidden bg-background",
          collapsed ? "grid-cols-[56px_1fr]" : "grid-cols-[232px_1fr]",
        )}
      >
        <aside
          className="flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar"
          aria-label="Sidebar"
          data-collapsed={collapsed || undefined}
        >
          <div
            className={cn(
              "flex h-14 items-center gap-2.5",
              collapsed ? "justify-center px-0" : "px-5",
            )}
          >
            <Logo />
            {!collapsed && (
              <span className="text-[14px] font-semibold tracking-tight">
                Daedalus <span className="text-brand">X</span>
              </span>
            )}
          </div>

          {collapsed ? (
            <div
              className="mx-auto mb-2 flex size-8 items-center justify-center rounded-md bg-brand/15 text-xs font-semibold text-brand"
              title="Veloira"
            >
              V
            </div>
          ) : (
            <div className="mx-3 mb-2 flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-xs font-semibold text-brand">
                V
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">Veloira</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  STEM Racing · Nationals
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />
            </div>
          )}

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
            aria-label="Search and command palette"
            title="Search (⌘K)"
            className={cn(
              "mb-1 flex h-9 items-center rounded-lg text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground",
              collapsed ? "mx-auto w-9 justify-center" : "mx-3 gap-2.5 px-2.5",
            )}
          >
            <Search size={15} aria-hidden />
            {!collapsed && (
              <>
                Search
                <span className="ml-auto flex gap-1">
                  <Key>⌘</Key>
                  <Key>K</Key>
                </span>
              </>
            )}
          </button>

          <nav aria-label="Workspaces" className="flex-1 overflow-y-auto px-3 py-2">
            {SECTIONS.map((section) => (
              <div key={section.title} className="mb-4">
                {collapsed ? (
                  <div className="mx-auto mb-1.5 h-px w-6 bg-sidebar-border" aria-hidden />
                ) : (
                  <div className="px-2 pb-1.5 text-[11px] font-medium text-muted-foreground">
                    {section.title}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((w) => {
                    const isActive = active?.href === w.href;
                    const Icon = w.icon;
                    const shortcut = String(ALL.indexOf(w) + 1);
                    const link = (
                      <Link
                        href={w.href}
                        aria-current={isActive ? "page" : undefined}
                        aria-keyshortcuts={shortcut}
                        aria-label={collapsed ? w.label : undefined}
                        className={cn(
                          "group relative flex h-9 items-center rounded-lg text-[13px] text-sidebar-foreground transition-colors",
                          "hover:bg-accent hover:text-foreground",
                          collapsed ? "mx-auto w-9 justify-center" : "gap-3 px-2.5",
                          isActive && "bg-accent font-medium text-foreground",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 text-muted-foreground transition-colors group-hover:text-foreground",
                            isActive && "text-brand group-hover:text-brand",
                          )}
                          strokeWidth={1.75}
                        />
                        {collapsed ? (
                          <span
                            className={cn(
                              "absolute top-1.5 right-1.5 size-1.5 rounded-full",
                              STATUS_DOT[w.status],
                            )}
                            aria-hidden
                          />
                        ) : (
                          <>
                            <span className="flex-1">{w.label}</span>
                            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/70">
                              {w.capability}
                            </span>
                            <span
                              className={cn("size-1.5 rounded-full", STATUS_DOT[w.status])}
                              role="img"
                              title={STATUS_LABEL[w.status]}
                              aria-label={STATUS_LABEL[w.status]}
                            />
                          </>
                        )}
                      </Link>
                    );
                    return (
                      <li key={w.href}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right">
                              {w.label} · {w.capability}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="space-y-2 border-t border-sidebar-border p-3">
            {!collapsed && (
              <>
                <ContextRow label="Rulebook" value="Dev 26/27 · ref" />
                <ContextRow label="Design" value="Reference car" />
              </>
            )}
            <ApiStatus compact={collapsed} />
            <Link
              href="/settings"
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              aria-label={collapsed ? "Settings" : undefined}
              title={collapsed ? "Settings" : undefined}
              className={cn(
                "flex h-8 items-center rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                collapsed ? "mx-auto w-8 justify-center" : "w-full gap-2 px-2",
                pathname.startsWith("/settings") && "bg-accent text-foreground",
              )}
            >
              <Settings className="size-4" aria-hidden />
              {!collapsed && "Settings"}
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "flex h-8 items-center rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none",
                collapsed ? "mx-auto w-8 justify-center" : "w-full gap-2 px-2",
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden />
              ) : (
                <>
                  <PanelLeftClose className="size-4" aria-hidden />
                  Collapse sidebar
                </>
              )}
            </button>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-6">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">Veloira</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-medium">
                {active?.label ?? (pathname.startsWith("/settings") ? "Settings" : "—")}
              </span>
            </nav>
            {active && (
              <span className="rounded-md border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                {active.capability}
              </span>
            )}
            <div className="ml-auto flex items-center gap-4">
              <RunPicker />
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(OPEN_EVIDENCE))}
                className="flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <FileStack className="size-3.5" aria-hidden />
                Evidence
                <Key>E</Key>
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(OPEN_PRESENTER))}
                className="flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Presentation className="size-3.5" aria-hidden />
                Present
                <kbd className="text-[10px] opacity-70">P</kbd>
              </button>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
      <CommandPalette items={ALL} />
      <EvidenceDrawer />
      <Presenter />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          className: "!bg-popover !border-line-strong !text-foreground !shadow-float",
        }}
      />
    </TooltipProvider>
  );
}

function ContextRow({ label, value, tone }: { label: string; value: string; tone?: "risk" }) {
  return (
    <div className="flex items-center justify-between px-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", tone === "risk" && "text-risk")}>{value}</span>
    </div>
  );
}

function ApiStatus({ compact = false }: { compact?: boolean }) {
  const { isSuccess, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 10_000,
  });
  const state = isPending ? "Checking" : isSuccess ? "Online" : "Offline";
  if (compact) {
    return (
      <div
        className="flex justify-center py-1"
        role="status"
        aria-live="polite"
        title={`Engine API: ${state}`}
      >
        <span className="sr-only">Engine API {state}</span>
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            state === "Online" && "bg-ok shadow-[0_0_6px] shadow-ok/70",
            state === "Offline" && "bg-destructive",
            state === "Checking" && "animate-pulse bg-muted-foreground",
          )}
        />
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-between px-1 text-xs"
      role="status"
      aria-live="polite"
    >
      <span className="text-muted-foreground">Engine API</span>
      <span className="flex items-center gap-1.5 font-medium">
        <span
          className={cn(
            "size-1.5 rounded-full",
            state === "Online" && "bg-ok shadow-[0_0_6px] shadow-ok/70",
            state === "Offline" && "bg-destructive",
            state === "Checking" && "animate-pulse bg-muted-foreground",
          )}
        />
        {state}
      </span>
    </div>
  );
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 19 L12 4 L21 19"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 19 L12 12 L16 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
