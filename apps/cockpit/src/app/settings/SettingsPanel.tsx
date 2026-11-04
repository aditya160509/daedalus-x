"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { useSettings, updateSettings } from "@/lib/settings";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="label-caps px-1">{title}</h2>
      <div className="divide-y rounded-lg border border-border/80 bg-card shadow-panel">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  description,
  control,
}: {
  label: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-6 px-4 py-3 transition-colors duration-150 hover:bg-white/[0.015]">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="text-right text-[13px]">{control}</div>
    </div>
  );
}

export function SettingsPanel() {
  const { maxRanks } = useSettings();
  // Draft text lets the user clear the field while typing; only a valid value is saved.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(maxRanks);
  const parsed = Number(shown);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= 8;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-7 px-6 py-7 sm:px-8">
        <header className="space-y-1.5">
          <p className="label-caps">Workspace</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Settings</h1>
          <p className="text-sm text-muted-foreground">Stored in this browser only.</p>
        </header>

        <Group title="Solver">
          <Row
            label="Max MPI ranks per job"
            description="Upper limit for the Requested MPI ranks field in New run. Between 1 and 8."
            control={
              <div className="flex flex-col items-end gap-1">
                <Input
                  aria-label="Max MPI ranks per job"
                  aria-invalid={!valid}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={8}
                  step={1}
                  value={shown}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    const next = Number(e.target.value);
                    if (Number.isInteger(next) && next >= 1 && next <= 8) {
                      updateSettings({ maxRanks: next });
                      setDraft(null);
                    }
                  }}
                  onBlur={() => setDraft(null)}
                  className="tabular h-8 w-20 text-right font-mono text-[13px]"
                />
                {!valid && <span className="text-[11px] text-destructive">Enter 1 to 8</span>}
              </div>
            }
          />
        </Group>

        <Group title="Display">
          <Row
            label="Units"
            description="Engineering values are always shown in SI units."
            control={<span className="font-mono text-muted-foreground">SI · m, s, kg, N</span>}
          />
          <Row
            label="Theme"
            description="The graphite dark theme is the only theme in this build."
            control={<span className="text-muted-foreground">Graphite dark</span>}
          />
        </Group>

        <Group title="Engine">
          <Row
            label="Engine endpoint"
            description="Requests go to /api and are forwarded to the local engine API."
            control={<code className="font-mono text-muted-foreground">/api</code>}
          />
        </Group>
      </div>
    </div>
  );
}
