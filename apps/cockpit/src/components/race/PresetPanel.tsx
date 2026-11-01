"use client";

import { Check, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Panel } from "@/components/ui/primitives";
import { newPresetId, sanitizePreset, type RacePreset } from "./presets";

/** Save / rename / delete what-if presets in localStorage (spec T08: stopgap until ATLAS). */
export function PresetPanel({
  presets,
  note,
  current,
  onAdd,
  onRename,
  onDelete,
  onApply,
}: {
  presets: RacePreset[];
  note: string | null;
  current: Pick<
    RacePreset,
    "massG" | "cdaCm2" | "crr" | "thrustScale" | "trackM" | "rho" | "model"
  >;
  onAdd: (preset: RacePreset) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onApply: (preset: RacePreset) => void;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const renameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editingId) renameInput.current?.focus();
  }, [editingId]);

  const save = () => {
    const preset = sanitizePreset({ ...current, id: newPresetId(), name });
    if (!preset) return;
    onAdd(preset);
    setName("");
  };

  const commitRename = (id: string) => {
    if (draft.trim()) onRename(id, draft.trim());
    setEditingId(null);
  };

  return (
    <Panel
      title="What-if presets"
      description="Stored in this browser until the evidence store owns them."
      bodyClassName="space-y-2 p-3"
      className="shrink-0"
    >
      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          placeholder="Name, e.g. heavy nose"
          aria-label="Preset name"
          maxLength={60}
          className="h-8 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        />
        <Button variant="primary" onClick={save} disabled={!name.trim()}>
          <Save size={13} /> Save
        </Button>
      </div>
      {note && (
        <p role="alert" className="text-2xs text-risk">
          {note}
        </p>
      )}
      {presets.length === 0 ? (
        <p className="text-2xs leading-relaxed text-muted-foreground">
          Saves mass, CdA, rolling resistance, thrust scale, track length and model level. Saved
          presets can then race as ghosts.
        </p>
      ) : (
        <ul className="space-y-1" aria-label="Saved presets">
          {presets.map((preset) => (
            <li key={preset.id} className="group flex items-center gap-1.5 text-xs">
              {editingId === preset.id ? (
                <>
                  <input
                    ref={renameInput}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename(preset.id);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => commitRename(preset.id)}
                    aria-label="Rename preset"
                    maxLength={60}
                    className="h-7 min-w-0 flex-1 rounded-md border bg-background px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  />
                  <button
                    type="button"
                    aria-label={`Keep new name for ${preset.name}`}
                    onClick={() => commitRename(preset.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Check size={13} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onApply(preset)}
                    className="min-w-0 flex-1 truncate text-left text-text-2 hover:text-brand"
                    title={`Apply ${preset.name}: ${preset.massG} g, CdA ${preset.cdaCm2} cm²`}
                  >
                    {preset.name}
                  </button>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {preset.cdaCm2}cm² · {preset.massG}g
                  </span>
                  <button
                    type="button"
                    aria-label={`Rename ${preset.name}`}
                    onClick={() => {
                      setEditingId(preset.id);
                      setDraft(preset.name);
                    }}
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${preset.name}`}
                    onClick={() => onDelete(preset.id)}
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
