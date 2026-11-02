// Adapted from slowlydev/f1-dash at d21607a (AGPL-3.0). See THIRD_PARTY.md.
import { clsx } from "clsx";

export interface TimingSector {
  Segments: { Status: number }[];
  Value?: string;
  PreviousValue?: string;
  OverallFastest?: boolean;
  PersonalFastest?: boolean;
}
interface TimingDataDriver {
  Sectors: TimingSector[];
}
interface TimingStatsDriver {
  BestSectors: { Position?: number; Value?: string }[];
}

type Props = {
  sectors: TimingDataDriver["Sectors"];
  bestSectors: TimingStatsDriver["BestSectors"] | undefined;
};

export default function DriverMiniSectors({ sectors = [], bestSectors }: Props) {
  const showMiniSectors = true;
  const showBestSectors = bestSectors !== undefined;

  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-2">
      {sectors.map((sector, i) => (
        <div title={`Sector ${i + 1}`} key={`sector.${i}`} className="min-w-0 flex flex-col gap-1">
          {showMiniSectors && (
            <div className="flex flex-row gap-1">
              {sector.Segments.map((segment, j) => (
                <MiniSector status={segment.Status} key={`sector.mini.${j}`} />
              ))}
            </div>
          )}

          <div className={clsx("flex", showMiniSectors ? "items-center gap-1" : "flex-col")}>
            <p
              className={clsx("font-mono text-[10px] leading-none font-medium tabular-nums", {
                "text-violet-600!": sector.OverallFastest,
                "text-emerald-500!": sector.PersonalFastest,
                "text-muted-foreground": !sector.Value,
              })}
            >
              {sector.Value ? sector.Value : sector.PreviousValue ? sector.PreviousValue : "—"}
            </p>

            {showBestSectors && (
              <p
                className={clsx(
                  "font-mono text-[10px] leading-none text-muted-foreground tabular-nums",
                  {
                    "text-violet-600!": bestSectors?.[i].Position === 1,
                  },
                )}
              >
                {bestSectors && bestSectors[i].Value ? bestSectors[i].Value : "—"}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniSector({ status }: { status: number }) {
  return (
    <div
      style={{ width: "100%", height: 5, borderRadius: 2 }}
      className={clsx({
        "bg-amber-400": status === 2048 || status === 2052,
        "bg-emerald-500": status === 2049,
        "bg-violet-600": status === 2051,
        "bg-blue-500": status === 2064,
        "bg-muted": status === 0,
      })}
    />
  );
}
