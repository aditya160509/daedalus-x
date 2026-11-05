"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewRunDialog } from "@/components/jobs/NewRunDialog";
import { buildOracleStudy, listDesigns } from "@/lib/api";

export function BuildNextControls({ unit, reason }: { unit: number[]; reason: string }) {
  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns });
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const baseline =
    selected ??
    designs.data?.find((d) => d.design_id === "orbit_v2")?.design_id ??
    designs.data?.[0]?.design_id ??
    "";
  const build = useMutation({
    mutationFn: buildOracleStudy,
    onSuccess: () => void cache.invalidateQueries({ queryKey: ["designs"] }),
  });
  // FORGE's comparable dimensional headrooms are in millimetres.
  const nearest = build.data?.checks
    .filter((check) => check.unit === "mm" && check.margin != null)
    .toSorted((a, b) => a.margin! - b.margin!)[0];

  return (
    <div className="mt-4 space-y-3 border-t pt-3 text-xs">
      <p>
        <span className="font-medium">Why this recommendation</span>
        {" · "}
        {reason} ·{" "}
        {nearest
          ? `Tightest FORGE dimension: ${nearest.rule_id} (${nearest.margin?.toFixed(2)} mm headroom)`
          : build.data
            ? "No computable dimensional rule margin"
            : "Build candidate to check its rule margin"}
      </p>
      <p className="leading-relaxed text-muted-foreground">
        Build this point as a parametric study using the baseline’s overall dimensions. This family
        is not a reconstruction of your manufactured car. FORGE checks it after import; halo, tether
        features, tolerances and physical loads still need engineering review.
      </p>
      <label htmlFor="oracle-baseline" className="block">
        Baseline dimensions from
      </label>
      <Input
        id="oracle-baseline"
        list="oracle-baselines"
        value={baseline}
        disabled={build.isPending}
        onChange={(e) => {
          setSelected(e.target.value);
          build.reset();
        }}
      />
      <datalist id="oracle-baselines">
        {designs.data?.map((d) => (
          <option key={d.design_id} value={d.design_id}>
            {d.design_id}
          </option>
        ))}
      </datalist>
      {designs.isPending && <p>Loading imported designs…</p>}
      {designs.isError && (
        <p role="alert" className="text-destructive">
          {designs.error.message}
        </p>
      )}
      {!designs.isPending && !designs.isError && !designs.data?.length && (
        <p>Import a baseline in Design Studio first.</p>
      )}
      <Button
        size="sm"
        disabled={build.isPending || !designs.data?.some((d) => d.design_id === baseline)}
        onClick={() => build.mutate({ baseline, unit })}
      >
        {build.isPending ? "Building CAD and checking rules…" : "Build study design"}
      </Button>
      {build.isError && (
        <p role="alert" className="text-destructive">
          {build.error.message}
        </p>
      )}
      {build.data && (
        <div role="status" className="space-y-2">
          <p className="break-all font-mono">{build.data.design_id}</p>
          <p>
            {build.data.failed_rules} failed CAD rules · {build.data.manual_rules} manual checks. No
            physical compliance claim.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="underline underline-offset-4"
              href={`/design?design=${encodeURIComponent(build.data.design_id)}#cad`}
            >
              Open in CAD
            </a>
            <a
              className="underline underline-offset-4"
              href={`/design?design=${encodeURIComponent(build.data.design_id)}#rules`}
            >
              Review rules
            </a>
            {build.data.failed_rules === 0 && (
              <NewRunDialog key={build.data.design_id} initialDesign={build.data.design_id} />
            )}
          </div>
          {build.data.failed_rules > 0 && (
            <p className="text-muted-foreground">
              Resolve the failed geometry checks before queueing this candidate here.
            </p>
          )}
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            {build.data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
