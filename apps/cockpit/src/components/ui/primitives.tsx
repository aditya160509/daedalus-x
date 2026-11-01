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
        "flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]",
        className,
      )}
    >
      <header className="flex min-h-11 shrink-0 items-center gap-3 border-b px-4 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-medium text-foreground">{title}</h2>
          {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
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
          {value}
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
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {icon && <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>}
          <span className="truncate">{label}</span>
        </span>
        {provenance && <ProvenanceBadge value={provenance} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "tabular font-mono text-[28px] leading-none font-medium tracking-tight",
            tone === "risk" && "text-risk",
            tone === "danger" && "text-destructive",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
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
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className="rounded-lg border bg-secondary/50 p-0.5"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-7 rounded-md px-3 text-xs text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-foreground data-[state=on]:shadow-sm"
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
      <div className="flex size-11 items-center justify-center rounded-xl border bg-secondary text-text-2 [&_svg]:size-5">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{children}</div>
      </div>
      {action}
    </div>
  );
}

/** Placeholder block shaped like the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse bg-surface-2", className)} />;
}

/** `loading` fallback for dynamically imported 3D viewers. */
export function ViewerFallback() {
  return <Skeleton className="h-full" />;
}
