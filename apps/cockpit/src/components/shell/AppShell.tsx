"use client";

import { useQuery } from "@tanstack/react-query";
import { Box, FileStack, Gauge, type LucideIcon, ShieldCheck, Target, Wind } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getHealth } from "@/lib/api";
import { cn } from "@/lib/cn";

interface Workspace {
  href: string;
  label: string;
  capability: string;
  icon: LucideIcon;
}

export const WORKSPACES: Workspace[] = [
  { href: "/design", label: "Design", capability: "AETHER", icon: Box },
  { href: "/simulate", label: "Simulate", capability: "AETHER", icon: Wind },
  { href: "/optimize", label: "Optimize", capability: "ORACLE", icon: Target },
  { href: "/race", label: "Race", capability: "TITAN", icon: Gauge },
  { href: "/inspect", label: "Inspect", capability: "FORGE", icon: ShieldCheck },
  { href: "/evidence", label: "Evidence", capability: "ATLAS", icon: FileStack },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = WORKSPACES.find((w) => pathname.startsWith(w.href));

  return (
    <div className="grid h-dvh min-w-[1280px] grid-cols-[64px_1fr] grid-rows-[44px_1fr_24px] overflow-hidden">
      <header className="col-span-2 flex items-center gap-4 border-b border-line bg-surface px-4">
        <Link href="/design" className="flex items-center gap-2.5" aria-label="Daedalus X home">
          <Logo />
          <span className="text-[13px] font-semibold tracking-[0.18em]">
            DAEDALUS<span className="text-accent"> X</span>
          </span>
        </Link>
        <div className="h-5 w-px bg-line" />
        <ContextStrip workspace={active} />
        <div className="ml-auto">
          <ApiStatus />
        </div>
      </header>

      <nav
        aria-label="Workspaces"
        className="row-span-2 flex flex-col items-stretch gap-1 border-r border-line bg-surface py-2"
      >
        {WORKSPACES.map((w) => {
          const isActive = active?.href === w.href;
          const Icon = w.icon;
          return (
            <Link
              key={w.href}
              href={w.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative mx-1.5 flex flex-col items-center gap-1 rounded-md py-2.5 text-text-2 transition-colors duration-150",
                "hover:bg-surface-3 hover:text-text",
                isActive && "bg-surface-3 text-text",
              )}
            >
              <span
                className={cn(
                  "absolute top-2 bottom-2 -left-1.5 w-[2px] rounded-r bg-accent opacity-0 transition-opacity",
                  isActive && "opacity-100",
                )}
              />
              <Icon size={18} strokeWidth={1.6} className={cn(isActive && "text-accent")} />
              <span className="text-[10px] font-medium tracking-wide">{w.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="min-h-0 min-w-0 overflow-hidden bg-bg">{children}</main>

      <footer className="col-start-2 flex items-center gap-4 border-t border-line bg-surface px-3 text-2xs text-muted">
        <span>Daedalus X 0.1.0</span>
        <span className="h-3 w-px bg-line" />
        <span>Spec v2.0</span>
        <span className="ml-auto">
          All values carry units and provenance. Synthetic data is labelled.
        </span>
      </footer>
    </div>
  );
}

function ContextStrip({ workspace }: { workspace?: Workspace }) {
  return (
    <div className="flex items-center gap-5 text-xs">
      <ContextItem label="Workspace" value={workspace?.label ?? "—"} />
      <ContextItem label="Capability" value={workspace?.capability ?? "—"} />
      <ContextItem label="Project" value="Veloira" />
      <ContextItem label="Rulebook" value="Not loaded" warn />
      <ContextItem label="Design rev" value="No CAD imported" warn />
    </div>
  );
}

function ContextItem({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="label-caps">{label}</span>
      <span className={cn("font-medium text-text", warn && "text-risk")}>{value}</span>
    </div>
  );
}

function ApiStatus() {
  const { isSuccess, isError, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 10_000,
  });
  const state = isPending ? "checking" : isSuccess ? "online" : isError ? "offline" : "unknown";
  return (
    <div className="flex items-center gap-2 text-xs" role="status" aria-live="polite">
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "online" && "bg-ok shadow-[0_0_8px] shadow-ok/60",
          state === "offline" && "bg-danger",
          state === "checking" && "animate-pulse bg-muted",
        )}
      />
      <span className="label-caps">API</span>
      <span className="text-text-2">{state}</span>
    </div>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 18 L12 4 L21 18" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      <path d="M7.5 18 L12 11 L16.5 18" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
