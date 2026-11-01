"use client";

import {
  AlignCenterHorizontal,
  ArrowUpRight,
  Circle,
  Columns2,
  Droplets,
  EyeOff,
  Layers,
  Palette,
  ScanLine,
  TrendingUp,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FlowLayers } from "./types";

interface Item {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface Group {
  name: string;
  items: Item[];
}

/** Left layer rail: one icon per layer, grouped by what the layer draws. */
export function ControlRail({
  layers,
  setLayers,
  available,
  compare,
  onCompare,
}: {
  layers: FlowLayers;
  setLayers: React.Dispatch<React.SetStateAction<FlowLayers>>;
  available: {
    oil: boolean;
    sensitivity: boolean;
    vortices: boolean;
    shell: boolean;
    slices: boolean;
  };
  compare: boolean;
  onCompare: () => void;
}) {
  const surface =
    (value: FlowLayers["surface"]): (() => void) =>
    () =>
      setLayers((l) => ({ ...l, surface: l.surface === value && value !== "cp" ? "cp" : value }));
  const volume =
    (key: "streamlines" | "particles" | "vortices" | "shell"): (() => void) =>
    () =>
      setLayers((l) => ({ ...l, [key]: !l[key] }));
  const planes =
    (key: "wake" | "centreline" | "arrows"): (() => void) =>
    () =>
      setLayers((l) => ({ ...l, [key]: !l[key] }));

  const groups: Group[] = [
    {
      name: "Surface",
      items: [
        {
          key: "cp",
          label: "Pressure",
          hint: "Cp contours on the body",
          icon: Palette,
          active: layers.surface === "cp",
          onClick: surface("cp"),
        },
        {
          key: "oil",
          label: "Oil flow",
          hint: available.oil
            ? "Surface streaklines and separation"
            : "No wall shear stress in this export",
          icon: Droplets,
          active: layers.surface === "oil",
          disabled: !available.oil,
          onClick: surface("oil"),
        },
        {
          key: "sensitivity",
          label: "Sensitivity",
          hint: available.sensitivity
            ? "Adjoint drag sensitivity map"
            : "No adjoint result for this run",
          icon: TrendingUp,
          active: layers.surface === "sensitivity",
          disabled: !available.sensitivity,
          onClick: surface("sensitivity"),
        },
        {
          key: "plain",
          label: "Plain",
          hint: "Solid body, no field colouring",
          icon: Circle,
          active: layers.surface === "plain",
          onClick: surface("plain"),
        },
        {
          key: "off",
          label: "No surface",
          hint: "Hide the car skin",
          icon: EyeOff,
          active: layers.surface === "off",
          onClick: surface("off"),
        },
      ],
    },
    {
      name: "Volume",
      items: [
        {
          key: "streamlines",
          label: "Streams",
          hint: "Velocity-coloured streamlines",
          icon: Wind,
          active: layers.streamlines,
          onClick: volume("streamlines"),
        },
        {
          key: "particles",
          label: "Air",
          hint: "Air particles flowing along the streamlines",
          icon: Wind,
          active: layers.particles,
          onClick: volume("particles"),
        },
        {
          key: "vortices",
          label: "Vortices",
          hint: available.vortices ? "Q iso-surfaces" : "No Q criterion in this export",
          icon: Waves,
          active: layers.vortices,
          disabled: !available.vortices,
          onClick: volume("vortices"),
        },
        {
          key: "shell",
          label: "Wake shell",
          hint: available.shell ? "Ux/U∞ = 0.5 deficit surface" : "No wake shell in this export",
          icon: Layers,
          active: layers.shell,
          disabled: !available.shell,
          onClick: volume("shell"),
        },
      ],
    },
    {
      name: "Planes",
      items: [
        {
          key: "wake",
          label: "Wake scanner",
          hint: available.slices ? "Scrub the 24 exported x-planes" : "No x-slices in this export",
          icon: ScanLine,
          active: layers.wake,
          disabled: !available.slices,
          onClick: planes("wake"),
        },
        {
          key: "centreline",
          label: "Centreline",
          hint: "Vertical centreline plane",
          icon: AlignCenterHorizontal,
          active: layers.centreline,
          onClick: planes("centreline"),
        },
        {
          key: "arrows",
          label: "Arrows",
          hint: "In-plane velocity arrows on the active slice",
          icon: ArrowUpRight,
          active: layers.arrows,
          disabled: !available.slices,
          onClick: planes("arrows"),
        },
      ],
    },
  ];

  return (
    <div className="pointer-events-auto absolute top-3 left-3 z-10 flex flex-col gap-1 rounded-xl border bg-card/85 p-1 backdrop-blur">
      {groups.map((group, index) => (
        <div key={group.name} className="contents">
          {index > 0 && <span className="mx-1 h-px bg-border" aria-hidden />}
          <div role="group" aria-label={group.name} className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={item.label}
                      aria-pressed={item.active}
                      aria-disabled={item.disabled}
                      disabled={item.disabled}
                      onClick={item.onClick}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none",
                        "hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
                        item.active && "border border-brand/45 bg-brand/10 text-brand",
                        item.disabled && "cursor-not-allowed opacity-35 hover:bg-transparent",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                    {item.hint ? ` · ${item.hint}` : ""}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
      <span className="mx-1 h-px bg-border" aria-hidden />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Compare runs"
            aria-pressed={compare}
            onClick={onCompare}
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none",
              "hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
              compare && "border border-brand/45 bg-brand/10 text-brand",
            )}
          >
            <Columns2 className="size-4" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Compare a second run</TooltipContent>
      </Tooltip>
    </div>
  );
}
