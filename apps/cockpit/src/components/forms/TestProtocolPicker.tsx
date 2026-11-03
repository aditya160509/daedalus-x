"use client";

import { SegmentedControl } from "@/components/ui/primitives";

export const TEST_PROTOCOLS = {
  lab: { trackM: 10, alternativeTrackM: 5, timingSdMs: 1, budget: 4, coastDown: true },
  track: { trackM: 20, alternativeTrackM: 10, timingSdMs: 5, budget: 3, coastDown: false },
} as const;
export type TestProtocolId = keyof typeof TEST_PROTOCOLS | "custom";

const OPTIONS = [
  { value: "lab", label: "Lab day" },
  { value: "track", label: "Track day" },
  { value: "custom", label: "Custom" },
] as const;

export function TestProtocolPicker({
  value,
  onChange,
}: {
  value: TestProtocolId;
  onChange: (value: TestProtocolId) => void;
}) {
  return (
    <div className="space-y-2">
      <SegmentedControl options={OPTIONS} value={value} onChange={onChange} label="Test protocol" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        {value === "custom"
          ? "Custom settings. "
          : value === "lab"
            ? "10 m track · assumed timing SD 1 ms. "
            : "20 m track · assumed timing SD 5 ms. "}
        Editable assumptions; verify your timing precision. Car priors and uploaded data stay as
        entered.
      </p>
    </div>
  );
}
