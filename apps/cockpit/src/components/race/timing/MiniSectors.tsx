// Adapted from slowlydev/f1-dash DriverMiniSectors.tsx (AGPL-3.0), see THIRD_PARTY.md.
import { cn } from "@/lib/utils";
export type SectorStatus = 0 | 2048 | 2049 | 2051;
function MiniSector({ status, title }: { status: SectorStatus; title: string }) {
  return (
    <div
      title={title}
      aria-label={title}
      className={cn("h-2.5 min-w-2 flex-1 rounded-[2px]", {
        "bg-amber-400": status === 2048,
        "bg-emerald-500": status === 2049,
        "bg-violet-500": status === 2051,
        "bg-muted": status === 0,
      })}
    />
  );
}
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
    <div className="flex gap-0.5">
      {times.map((value, index) => {
        const rival = other?.[index];
        const status: SectorStatus =
          value === null || index >= completed
            ? 0
            : rival == null
              ? 2049
              : value <= rival
                ? 2051
                : 2048;
        return (
          <MiniSector
            key={index}
            status={status}
            title={`Sector ${index + 1}: ${value === null || index >= completed ? "not completed" : `${(value * 1000).toFixed(2)} ms`}`}
          />
        );
      })}
    </div>
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
