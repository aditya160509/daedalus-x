// Adapted from slowlydev/f1-dash at d21607a (AGPL-3.0). See THIRD_PARTY.md.
import { clsx } from "clsx";

export interface LapTimeValue {
  Value?: string;
  OverallFastest?: boolean;
  PersonalFastest?: boolean;
}
interface TimingDataDriver {
  LastLapTime: LapTimeValue;
  BestLapTime: LapTimeValue;
}

type Props = {
  last: TimingDataDriver["LastLapTime"];
  best: TimingDataDriver["BestLapTime"];
  hasFastest: boolean;
};

export default function DriverLapTime({ last, best, hasFastest }: Props) {
  return (
    <div className="space-y-1 place-self-start" aria-label="Current result and best comparison">
      <p
        className={clsx("font-mono text-sm leading-none font-medium tabular-nums", {
          "text-violet-600!": last.OverallFastest,
          "text-emerald-500!": last.PersonalFastest,
          "text-muted-foreground!": !last.Value,
        })}
      >
        {last.Value ? last.Value : "—"}
      </p>
      <p
        className={clsx("font-mono text-[10px] leading-none text-muted-foreground tabular-nums", {
          "text-violet-600!": hasFastest,
          "text-muted-foreground!": !best.Value,
        })}
      >
        {best.Value ? best.Value : "—"}
      </p>
    </div>
  );
}
