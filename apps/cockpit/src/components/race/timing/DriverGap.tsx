// Adapted from slowlydev/f1-dash at d21607a (AGPL-3.0). See THIRD_PARTY.md.
import { clsx } from "clsx";

interface TimingDataDriver {
  GapToLeader?: string;
  IntervalToPositionAhead?: { Value?: string; Catching?: boolean };
  Stats?: { TimeDiffToFastest?: string; TimeDifftoPositionAhead?: string }[];
  TimeDiffToFastest?: string;
  TimeDiffToPositionAhead?: string;
}

type Props = {
  timingDriver: TimingDataDriver;
  sessionPart: number | undefined;
};

export default function DriverGap({ timingDriver, sessionPart }: Props) {
  const gapToLeader =
    timingDriver.GapToLeader ??
    (timingDriver.Stats
      ? timingDriver.Stats[sessionPart ? sessionPart - 1 : 0]?.TimeDiffToFastest
      : undefined) ??
    timingDriver.TimeDiffToFastest ??
    "";

  const gapToFront =
    timingDriver.IntervalToPositionAhead?.Value ??
    (timingDriver.Stats
      ? timingDriver.Stats[sessionPart ? sessionPart - 1 : 0]?.TimeDifftoPositionAhead
      : undefined) ??
    timingDriver.TimeDiffToPositionAhead ??
    "";

  const catching = timingDriver.IntervalToPositionAhead?.Catching;

  return (
    <div className="place-self-start">
      <p
        className={clsx("font-mono text-xs leading-none font-medium tabular-nums", {
          "text-emerald-500": catching,
          "text-muted-foreground": !gapToFront,
        })}
      >
        {gapToFront ? gapToFront : "—"}
      </p>

      <p className="font-mono text-[10px] leading-none text-muted-foreground tabular-nums">
        {gapToLeader ? gapToLeader : "—"}
      </p>
    </div>
  );
}
