import { describe, expect, it } from "vitest";
import { defaultPanels, TITLES } from "./dockLayout";

describe("Pit Wall default docking layout", () => {
  it.each([375, 1024, 1440])("only references panels already added at %i px", (width) => {
    const added = new Set<string>();
    for (const panel of defaultPanels(width)) {
      if (panel.position && "referencePanel" in panel.position) {
        expect(added.has(String(panel.position.referencePanel))).toBe(true);
      }
      expect(added.has(panel.id)).toBe(false);
      added.add(panel.id);
    }
    expect([...added].toSorted()).toEqual(Object.keys(TITLES).toSorted());
  });
  it("uses tabs on mobile and a side pane on desktop", () => {
    expect(defaultPanels(375).filter((p) => p.position?.direction === "right")).toHaveLength(0);
    expect(
      defaultPanels(1440)
        .filter((p) => p.position?.direction === "right")
        .map((p) => p.id),
    ).toEqual(["next"]);
  });
});
