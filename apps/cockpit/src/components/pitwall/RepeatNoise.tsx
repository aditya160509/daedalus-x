"use client";

import { useState } from "react";
import { Metric } from "@/components/ui/primitives";

export function repeatNoise(values: number[]) {
  if (values.length < 3 || values.length > 100 || values.some((v) => !Number.isFinite(v) || v <= 0))
    return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1));
  return Number.isFinite(sd) ? { mean, sd } : null;
}

export function RepeatNoise({ nuggetCm2 }: { nuggetCm2: number }) {
  const [raw, setRaw] = useState("");
  const [matched, setMatched] = useState(false);
  const values = raw.trim()
    ? raw
        .trim()
        .split(/[\s,]+/)
        .map(Number)
    : [];
  const result = repeatNoise(values);
  return (
    <section className="space-y-2 rounded border p-3">
      <h4 className="text-sm font-medium">Repeat-experiment noise</h4>
      <label htmlFor="repeat-cda" className="grid gap-1 text-xs">
        Repeat CdA readings (cm²)
        <textarea
          id="repeat-cda"
          className="min-h-16 rounded border bg-background p-2"
          value={raw}
          maxLength={1600}
          onChange={(event) => {
            setRaw(event.target.value);
            setMatched(false);
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={matched}
          onChange={(event) => setMatched(event.target.checked)}
        />
        These are independent repeats of the same design and setup.
      </label>
      {matched && result ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label="Repeat mean" value={result.mean.toFixed(4)} unit="cm²" />
          <Metric
            label="Repeat sample SD"
            value={result.sd.toFixed(4)}
            unit="cm²"
            hint={`${values.length} repeats`}
          />
          <Metric label="Fitted GP nugget SD" value={nuggetCm2.toFixed(4)} unit="cm²" />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Enter 3–100 positive readings separated by commas or spaces and confirm the setup.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        The repeat SD uses the supplied readings and does not change the GP fit or training data.
      </p>
    </section>
  );
}
