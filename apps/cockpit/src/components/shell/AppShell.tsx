"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Box,
  ChevronsUpDown,
  FileStack,
  Gauge,
  type LucideIcon,
  ShieldCheck,
  Target,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
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

export const SECTIONS: Section[] = [
  {
    title: "Engineering",
    items: [
      { href: "/design", label: "Design", capability: "AETHER", icon: Box, status: "partial" },
      { href: "/simulate", label: "Simulate", capability: "AETHER", icon: Wind, status: "pending" },
      {
        href: "/optimize",
        label: "Optimize",
        capability: "ORACLE",
        icon: Target,
        status: "pending",
      },
    ],
  },
  {
    title: "Validation",
    items: [
      { href: "/race", label: "Race", capability: "TITAN", icon: Gauge, status: "live" },
      {
        href: "/inspect",
        label: "Inspect",
        capability: "FORGE",
        icon: ShieldCheck,
        status: "pending",
      },
    ],
  },
  {
    title: "Record",
    items: [
      {
        href: "/evidence",
        label: "Evidence",
        capability: "ATLAS",
        icon: FileStack,
        status: "pending",
      },
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = ALL.find((w) => pathname.startsWith(w.href));

  return (
    <TooltipProvider delayDuration={250}>
      <div className="grid h-dvh min-w-[1280px] grid-cols-[232px_1fr] overflow-hidden bg-background">
        <aside className="flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="flex h-14 items-center gap-2.5 px-5">
            <Logo />
            <span className="text-[14px] font-semibold tracking-tight">
              Daedalus <span className="text-brand">X</span>
            </span>
          </div>

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

          <nav aria-label="Workspaces" className="flex-1 overflow-y-auto px-3 py-2">
            {SECTIONS.map((section) => (
              <div key={section.title} className="mb-4">
                <div className="px-2 pb-1.5 text-[11px] font-medium text-muted-foreground">
                  {section.title}
                </div>
                <ul className="space-y-0.5">
                  {section.items.map((w) => {
                    const isActive = active?.href === w.href;
                    const Icon = w.icon;
                    return (
                      <li key={w.href}>
                        <Link
                          href={w.href}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "group flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] text-sidebar-foreground transition-colors",
                            "hover:bg-accent hover:text-foreground",
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
                          <span className="flex-1">{w.label}</span>
                          <span className="text-[10px] font-medium tracking-wide text-muted-foreground/70">
                            {w.capability}
                          </span>
                          <span
                            className={cn("size-1.5 rounded-full", STATUS_DOT[w.status])}
                            title={STATUS_LABEL[w.status]}
                            aria-label={STATUS_LABEL[w.status]}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="space-y-2 border-t border-sidebar-border p-3">
            <ContextRow label="Rulebook" value="Not loaded" tone="risk" />
            <ContextRow label="Design" value="Reference car" />
            <ApiStatus />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-6">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">Veloira</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-medium">{active?.label ?? "—"}</span>
            </nav>
            {active && (
              <span className="rounded-md border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                {active.capability}
              </span>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              SI units · provenance on every value
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
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

function ApiStatus() {
  const { isSuccess, isError, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 10_000,
  });
  const state = isPending ? "Checking" : isSuccess ? "Online" : isError ? "Offline" : "Unknown";
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
