"use client";

import { Button as ShadButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Provenance } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Card-style panel with a sentence-case header (spec §7.2: calm hierarchy, data first). */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "group/panel flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-panel",
        className,
      )}
    >
      <header className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/70 bg-white/[0.012] px-4 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-medium tracking-[-0.01em] text-foreground">
            {title}
          </h2>
          {description && (
            <p className="truncate text-[11.5px] leading-4 text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {actions}
        </div>
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

const PROV_DOT: Record<Provenance, string> = {
  measured: "bg-prov-measured",
  simulated: "bg-prov-simulated",
  predicted: "bg-prov-predicted",
  estimated: "bg-prov-estimated",
  synthetic: "bg-prov-synthetic",
};

const PROV_HELP: Record<Provenance, string> = {
  measured: "From a calibrated instrument on a physical car",
  simulated: "Computed by a CFD solver run",
  predicted: "Output of a model (surrogate or race physics)",
  estimated: "An assumption or approximation entered by the team",
  synthetic: "Generated test data, never a real result",
};

/** Provenance label: always text plus a coloured dot, never colour alone. */
export function ProvenanceBadge({ value, title }: { value: Provenance; title?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex h-6 items-center gap-1.5 rounded-full border bg-secondary/60 px-2 text-[11px] font-medium text-secondary-foreground capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className={cn("size-1.5 rounded-full", PROV_DOT[value])} aria-hidden />
          {/* Narrow metric cards keep the dot and move the word to screen readers. */}
          <span className="@max-[230px]:sr-only">{value}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{title ?? PROV_HELP[value]}</TooltipContent>
    </Tooltip>
  );
}

export function Metric({
  label,
  value,
  unit,
  provenance,
  tone,
  hint,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  provenance?: Provenance;
  tone?: "default" | "risk" | "danger";
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="@container flex min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-panel transition-colors duration-150 hover:border-line-strong/70">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          {icon && <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>}
          <span className="truncate">{label}</span>
        </span>
        {provenance && <ProvenanceBadge value={provenance} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "tabular font-mono text-[26px] leading-none font-medium tracking-[-0.02em] @max-[230px]:text-[22px]",
            tone === "risk" && "text-risk",
            tone === "danger" && "text-destructive",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <span className="truncate text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function NumberField({
  label,
  unit,
  value,
  onChange,
  onCommit,
  min,
  max,
  step,
  id,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  /** Fires on blur, so a sweep can run once the user has finished typing. */
  onCommit?: () => void;
  min: number;
  max: number;
  step: number;
  id: string;
}) {
  const invalid = !Number.isFinite(value) || value < min || value > max;
  return (
    <div className="grid grid-cols-[1fr_120px] items-center gap-3">
      <label htmlFor={id} className="text-[13px] text-text-2">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          onBlur={onCommit}
          className="tabular h-8 pr-11 text-right font-mono text-[13px]"
        />
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
          {unit}
        </span>
      </div>
      {invalid && (
        <p id={`${id}-err`} className="col-span-2 -mt-1 text-right text-[11px] text-destructive">
          Must be between {min} and {max} {unit}
        </p>
      )}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";
const VARIANT_MAP = { primary: "default", secondary: "outline", ghost: "ghost" } as const;

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <ShadButton
      type="button"
      size="sm"
      variant={VARIANT_MAP[variant]}
      className={cn("h-8 text-[13px]", className)}
      {...props}
    />
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        // A single-choice group: clicking the pressed segment keeps it selected.
        const picked = next.find((v) => v !== value);
        if (picked) onChange(picked as T);
      }}
      className="rounded-lg border bg-secondary/50 p-0.5"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-7 rounded-md px-3 text-xs text-muted-foreground data-[pressed]:bg-accent data-[pressed]:text-foreground data-[pressed]:shadow-sm"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full border border-border/80 bg-secondary/70 text-text-2 shadow-panel [&_svg]:size-[18px]">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-[13px] font-medium tracking-[-0.01em]">{title}</h3>
        <div className="max-w-sm text-xs leading-relaxed text-muted-foreground">{children}</div>
      </div>
      {action}
    </div>
  );
}

/** Keyboard hint: a small key cap, shown next to the control it triggers. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-secondary px-1 font-mono text-[11px] text-text-2">
      {children}
    </kbd>
  );
}

/** Placeholder block shaped like the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

/** `loading` fallback for dynamically imported 3D viewers. */
export function ViewerFallback() {
  return <Skeleton className="h-full" />;
}
