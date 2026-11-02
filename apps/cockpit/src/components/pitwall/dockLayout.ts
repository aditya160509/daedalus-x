import type { AddPanelOptions } from "dockview-react";

export const TITLES = {
  flow: "Flow",
  car: "Car",
  sealed: "Sealed prediction",
  next: "Next run · ORACLE",
  rules: "Rules",
};

export function defaultPanels(width: number): AddPanelOptions[] {
  return Object.entries(TITLES).map(([id, title], index) => ({
    id,
    title,
    component: "cockpit",
    position:
      index === 0
        ? undefined
        : {
            referencePanel: index <= 3 ? "flow" : "next",
            direction: index === 3 && width >= 700 ? "right" : "within",
          },
    initialWidth: index === 3 && width >= 700 ? 360 : undefined,
    inactive: index !== 0 && index !== 3,
  }));
}
