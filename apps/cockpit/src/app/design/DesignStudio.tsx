"use client";

import { LegalPanel } from "@/components/pitwall/LegalPanel";
import { useTab, WorkspaceTabs } from "@/components/shell/WorkspaceTabs";
import { DesignWorkspace } from "./DesignWorkspace";

const TABS = [
  { id: "cad", label: "CAD" },
  { id: "inspect", label: "Inspect" },
  { id: "rules", label: "Rules" },
] as const;

/**
 * Design Studio. CAD is Chili3D (AGPL-3.0, github.com/xiangechen/chili3d), built from
 * vendor/chili3d into public/cad and loaded only when this tab is open.
 */
export function DesignStudio() {
  const [tab, setTab] = useTab(TABS);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceTabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="min-h-0 flex-1">
        {tab === "cad" && (
          // Same-origin first-party CAD (needs IndexedDB + WASM), so no sandbox.
          // oxlint-disable-next-line react/iframe-missing-sandbox
          <iframe
            title="CAD"
            src="/cad/index.html"
            className="size-full border-0"
          />
        )}
        {tab === "inspect" && <DesignWorkspace />}
        {tab === "rules" && (
          <div className="mx-auto h-full max-w-4xl p-3 [&>section]:h-full">
            <LegalPanel />
          </div>
        )}
      </div>
    </div>
  );
}
