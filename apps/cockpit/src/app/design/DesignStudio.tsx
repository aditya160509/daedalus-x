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
      <WorkspaceTabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        right={
          <a
            href="https://github.com/xiangechen/chili3d"
            target="_blank"
            rel="noreferrer"
            className="px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            CAD: Chili3D · AGPL-3.0
          </a>
        }
      />
      <div className="min-h-0 flex-1">
        {tab === "cad" && (
          <iframe
            title="Chili3D CAD"
            src="/cad/index.html"
            sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-popups allow-forms"
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
