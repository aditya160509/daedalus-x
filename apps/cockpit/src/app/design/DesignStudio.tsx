"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Save } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LegalPanel } from "@/components/pitwall/LegalPanel";
import { FrontierPanel } from "@/components/pitwall/FrontierPanel";
import { StrengthPanel } from "@/components/strength/StrengthPanel";
import { useTab, WorkspaceTabs } from "@/components/shell/WorkspaceTabs";
import { getForgeChecks, importCadStep, listDesigns, type RuleCheck } from "@/lib/api";
import { CadFrame, type FocusRequest } from "./CadFrame";
import { DesignWorkspace } from "./DesignWorkspace";

const TABS = [
  { id: "cad", label: "CAD" },
  { id: "inspect", label: "Inspect" },
  { id: "rules", label: "Rules" },
  { id: "frontier", label: "Limits" },
  { id: "strength", label: "Strength" },
] as const;

const BLANK = "__blank";

/** Ask the embedded CAD for its open design as STEP (vendor patch: daedalusBridge.ts). */
type CadParts = { name: string; parts: { name: string; blob: Blob }[] };

function exportStep(frame: HTMLIFrameElement): Promise<CadParts> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => finish(new Error("CAD did not answer")), 60_000);
    function finish(err?: Error, value?: CadParts) {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (value) resolve(value);
      else reject(err);
    }
    function onMessage(e: MessageEvent) {
      if (e.source !== frame.contentWindow || e.data?.type !== "daedalus:exported") return;
      if (e.data.error) finish(new Error(e.data.error));
      else finish(undefined, { name: e.data.name, parts: e.data.parts });
    }
    window.addEventListener("message", onMessage);
    frame.contentWindow?.postMessage({ type: "daedalus:export" }, window.location.origin);
  });
}

/**
 * Design Studio. CAD is our build of Chili3D (AGPL-3.0, credited in THIRD_PARTY.md): it opens
 * the picked car's STEP, and "Save as design" imports the model back as a rule-checked design.
 */
/** The closer of the two stated limits; null when neither is stated. */
function nearestLimit(check: RuleCheck): number | null {
  if (check.min == null && check.max == null) return null;
  if (check.min == null) return check.max ?? null;
  if (check.max == null) return check.min;
  if (check.value == null) return check.min;
  return Math.abs(check.value - check.min) <= Math.abs(check.max - check.value)
    ? check.min
    : check.max;
}

export function DesignStudio() {
  const query = useSearchParams();
  const initialDesign = query.get("design") ?? undefined;
  const parts = query.has("focus") ? query.getAll("part") : null;
  return (
    <Studio key={initialDesign ?? "default"} initialDesign={initialDesign} initialParts={parts} />
  );
}

function Studio({
  initialDesign,
  initialParts,
}: {
  initialDesign?: string;
  initialParts: string[] | null;
}) {
  const [tab, setTab] = useTab(TABS);
  const qc = useQueryClient();
  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns, staleTime: 60_000 });
  const [design, setDesign] = useState<string | undefined>(initialDesign);
  const [cadOpened, setCadOpened] = useState(false);
  const [inspectOpened, setInspectOpened] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(() =>
    initialParts ? { parts: initialParts, nonce: 0 } : null,
  );
  const focus = (parts: string[]) => {
    setFocusRequest((previous) => ({ parts, nonce: (previous?.nonce ?? 0) + 1 }));
    setCadOpened(true);
    setTab("cad");
  };
  const selectTab = (next: typeof tab) => {
    if (tab === "cad" || next === "cad") setCadOpened(true);
    if (next === "inspect") setInspectOpened(true);
    setTab(next);
  };
  const [saving, setSaving] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const current = design ?? designs.data?.[0]?.design_id;
  const forge = useQuery({
    queryKey: ["forge-checks", current],
    queryFn: () => getForgeChecks(current!),
    enabled: Boolean(current) && current !== BLANK && (tab === "cad" || cadOpened),
    staleTime: 30_000,
  });
  const cadRules = useMemo(() => {
    if (!forge.data) return [];
    return forge.data.checks.flatMap((check) => {
      if (check.state === "manual_review" || check.value == null) return [];
      const limit = nearestLimit(check);
      return check.parts.map((part) => ({
        part,
        state: check.state,
        value: check.value,
        limit,
        unit: check.unit,
        axis: check.axis ?? null,
        name: check.name,
      }));
    });
  }, [forge.data]);

  const save = async () => {
    if (!frame.current) return;
    setSaving(true);
    try {
      const { name, parts } = await exportStep(frame.current);
      const r = await importCadStep(parts, name);
      const fails = r.checks.filter((c) => c.state === "fail_cad").length;
      const risks = r.checks.filter((c) => c.state === "at_risk").length;
      await qc.invalidateQueries({ queryKey: ["designs"] });
      setDesign(r.design_id);
      toast.success(`Saved as ${r.design_id}`, {
        description: `Rules: ${fails} fail · ${risks} at risk. Ready for a Wind Tunnel run.`,
        action: { label: "Rules", onClick: () => setTab("rules") },
      });
    } catch (err) {
      toast.error("Could not save design", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const src =
    current && current !== BLANK
      ? `/cad/index.html?name=${encodeURIComponent(current)}&url=${encodeURIComponent(`/api/v1/designs/${current}/source.step`)}`
      : "/cad/index.html";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceTabs
        tabs={TABS}
        value={tab}
        onChange={selectTab}
        right={
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="design-pick">
              Design
            </label>
            <select
              id="design-pick"
              value={current ?? ""}
              onChange={(e) => setDesign(e.target.value)}
              className="h-7 max-w-40 rounded-md border bg-transparent px-2 font-mono text-xs"
            >
              {designs.data?.map((d) => (
                <option key={d.design_id} value={d.design_id}>
                  {d.design_id}
                </option>
              ))}
              {tab === "cad" && <option value={BLANK}>New blank design</option>}
            </select>
            {tab === "cad" && (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground px-2.5 text-xs font-medium text-background disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {saving ? "Saving…" : "Save as design"}
              </button>
            )}
          </div>
        }
      />
      <div className="min-h-0 flex-1">
        {current && (tab === "cad" || cadOpened) && (
          <div className="size-full" hidden={tab !== "cad"}>
            <CadFrame
              key={src}
              src={src}
              frame={frame}
              active={tab === "cad"}
              request={focusRequest}
              rules={cadRules}
              revision={forge.data?.revision ?? ""}
            />
          </div>
        )}
        {(tab === "inspect" || inspectOpened) && (
          <div className="size-full" hidden={tab !== "inspect"}>
            <DesignWorkspace designId={current === BLANK ? undefined : current} />
          </div>
        )}
        {tab === "strength" && (
          <div className="mx-auto w-full max-w-3xl overflow-y-auto p-3">
            <StrengthPanel />
          </div>
        )}
        {tab === "frontier" && (
          <div className="mx-auto h-full max-w-4xl p-3 [&>section]:h-full">
            <FrontierPanel design={current === BLANK ? undefined : current} onFocus={focus} />
          </div>
        )}
        {tab === "rules" && (
          <div className="mx-auto h-full max-w-4xl p-3 [&>section]:h-full">
            <LegalPanel design={current === BLANK ? undefined : current} onFocus={focus} />
          </div>
        )}
      </div>
    </div>
  );
}
