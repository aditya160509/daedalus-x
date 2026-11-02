// Adapted from slowlydev/f1-dash DriverMiniSectors.tsx (AGPL-3.0), see THIRD_PARTY.md.
import { cn } from "@/lib/utils";
import DriverMiniSectors from "./DriverMiniSectors";
export function MiniSectors({
  times,
  other,
  completed,
}: {
  times: (number | null)[];
  other?: (number | null)[] | null;
  completed: number;
}) {
  return (
    <DriverMiniSectors
      bestSectors={undefined}
      sectors={times.map((value, index) => {
        const rival = other?.[index];
        const status =
          value === null || index >= completed
            ? 0
            : rival == null
              ? 2049
              : value <= rival
                ? 2051
                : 2048;
        return {
          Segments: [{ Status: status }],
          Value: status === 0 || value === null ? undefined : `${(value * 1000).toFixed(1)} ms`,
          OverallFastest: status === 2051,
        };
      })}
    />
  );
}
export function SectorLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      {[
        ["bg-violet-500", "Faster comparison sector"],
        ["bg-emerald-500", "No comparison"],
        ["bg-amber-400", "Slower comparison sector"],
        ["bg-muted", "Not completed"],
      ].map(([tone, name]) => (
        <span key={name} className="flex items-center gap-1">
          <i className={cn("size-1.5 rounded-sm", tone)} />
          {name}
        </span>
      ))}
    </div>
  );
}
