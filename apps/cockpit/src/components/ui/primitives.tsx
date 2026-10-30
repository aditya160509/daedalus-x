import type { Provenance } from "@/lib/api";
import { cn } from "@/lib/cn";

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-surface",
        className,
      )}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
        <h2 className="label-caps !text-text-2">{title}</h2>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

const PROV_STYLE: Record<Provenance, string> = {
  measured: "text-prov-measured border-prov-measured/40 bg-prov-measured/10",
  simulated: "text-prov-simulated border-prov-simulated/40 bg-prov-simulated/10",
  predicted: "text-prov-predicted border-prov-predicted/40 bg-prov-predicted/10",
  estimated: "text-prov-estimated border-prov-estimated/40 bg-prov-estimated/10",
  synthetic: "text-prov-synthetic border-prov-synthetic/40 bg-prov-synthetic/10",
};

export function ProvenanceBadge({ value, title }: { value: Provenance; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[10px] font-medium tracking-wider uppercase",
        PROV_STYLE[value],
      )}
    >
      {value}
    </span>
  );
}

export function Metric({
  label,
  value,
  unit,
  provenance,
  tone,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  provenance?: Provenance;
  tone?: "default" | "risk" | "danger";
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-panel border border-line bg-surface px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps truncate">{label}</span>
        {provenance && <ProvenanceBadge value={provenance} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "tabular font-mono text-[26px] leading-none font-medium tracking-tight",
            tone === "risk" && "text-risk",
            tone === "danger" && "text-danger",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {hint && <span className="truncate text-2xs text-muted">{hint}</span>}
    </div>
  );
}

export function NumberField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  id,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  id: string;
}) {
  const invalid = !Number.isFinite(value) || value < min || value > max;
  return (
    <label htmlFor={id} className="grid grid-cols-[1fr_112px] items-center gap-2 text-xs">
      <span className="text-text-2">{label}</span>
      <span
        className={cn(
          "flex h-7 items-center rounded-sm border bg-surface-2 pr-2 transition-colors focus-within:border-accent",
          invalid ? "border-danger" : "border-line",
        )}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="tabular h-full w-full min-w-0 bg-transparent px-2 text-right font-mono text-xs text-text outline-none"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        <span className="shrink-0 font-mono text-[10px] text-muted">{unit}</span>
      </span>
    </label>
  );
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-accent text-bg hover:bg-accent/85",
        variant === "secondary" &&
          "border border-line-strong bg-surface-2 text-text hover:border-muted hover:bg-surface-3",
        variant === "ghost" && "text-text-2 hover:bg-surface-3 hover:text-text",
        className,
      )}
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
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-sm border border-line bg-surface-2 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-6 flex-1 rounded-[3px] px-2 text-[11px] font-medium text-text-2 transition-colors",
            o.value === value ? "bg-surface-3 text-text shadow-sm" : "hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
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
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-line bg-surface-2 text-text-2">
        {icon}
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="max-w-md text-xs leading-relaxed text-text-2">{children}</div>
      {action}
    </div>
  );
}
