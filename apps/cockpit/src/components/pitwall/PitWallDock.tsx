"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  DockviewReact,
  themeDark,
  type DockviewApi,
  type IDockviewPanelProps,
} from "dockview-react";
import { Button } from "@/components/ui/button";
import "dockview-react/dist/styles/dockview.css";
import "./PitWallDock.css";
import { TITLES, defaultPanels } from "./dockLayout";

type Slot = keyof typeof TITLES;
const STORAGE_KEY = "daedalus.pitwall.layout.v1";
const SlotContext = createContext<Partial<Record<Slot, ReactNode>>>({});

function DockPanel({ api }: IDockviewPanelProps) {
  const slots = useContext(SlotContext);
  return <div className="pitwall-dock-content">{slots[api.id as Slot]}</div>;
}
const COMPONENTS = { cockpit: DockPanel };

function defaultLayout(api: DockviewApi) {
  api.clear();
  for (const panel of defaultPanels(api.width)) api.addPanel(panel);
}

export function PitWallDock({ slots }: { slots: Record<Slot, ReactNode> }) {
  const apiRef = useRef<DockviewApi | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <SlotContext.Provider value={slots}>
      <div className="flex h-full min-h-[560px] flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{notice || "Drag tabs to arrange · layout saved on this device"}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              if (apiRef.current) defaultLayout(apiRef.current);
            }}
          >
            Reset layout
          </Button>
        </div>
        <div className="pitwall-dock min-h-0 flex-1 overflow-hidden rounded-lg border">
          <DockviewReact
            theme={themeDark}
            components={COMPONENTS}
            disableFloatingGroups
            onReady={({ api }) => {
              apiRef.current = api;
              const storageKey = `${STORAGE_KEY}.${api.width < 700 ? "compact" : "wide"}`;
              let restored = false;
              try {
                const raw = localStorage.getItem(storageKey);
                if (raw && raw.length < 65_536) {
                  const saved = JSON.parse(raw);
                  const ids = Object.keys(saved.panels ?? {});
                  if (
                    ids.length > 0 &&
                    ids.every(
                      (id) =>
                        Object.hasOwn(TITLES, id) &&
                        saved.panels[id].contentComponent === "cockpit",
                    ) &&
                    !saved.popoutGroups?.length &&
                    !saved.floatingGroups?.length
                  ) {
                    api.fromJSON(saved);
                    restored = true;
                  }
                }
              } catch {
                setNotice("Saved layout unavailable · default restored");
              }
              if (!restored) defaultLayout(api);
              let timer: ReturnType<typeof setTimeout> | undefined;
              const save = () => {
                try {
                  localStorage.setItem(storageKey, JSON.stringify(api.toJSON()));
                } catch {
                  setNotice("Layout cannot be saved on this device");
                }
              };
              const listener = api.onDidLayoutChange(() => {
                clearTimeout(timer);
                timer = setTimeout(save, 250);
              });
              cleanupRef.current = () => {
                clearTimeout(timer);
                listener.dispose();
                apiRef.current = null;
              };
            }}
          />
        </div>
      </div>
    </SlotContext.Provider>
  );
}
