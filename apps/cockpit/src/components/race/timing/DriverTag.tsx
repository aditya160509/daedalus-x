// Adapted from slowlydev/f1-dash at d21607a (AGPL-3.0). See THIRD_PARTY.md.
import { clsx } from "clsx";

type Props = {
  teamColor: string;
  short: string;
  position?: number;
  className?: string;
};

export default function DriverTag({ position, teamColor, short, className }: Props) {
  return (
    <div
      className={clsx(
        "flex w-fit items-center justify-between gap-0.5 rounded-md border border-border px-1 py-1 font-medium",
        className,
      )}
      style={{ backgroundColor: `#${teamColor}` }}
    >
      {position && <p className="px-1 text-xs leading-none">{position}</p>}

      <div className="flex h-min w-min items-center justify-center rounded-sm bg-background px-1">
        <p
          className="font-mono text-foreground"
          style={{ ...(teamColor && { color: `#${teamColor}` }) }}
        >
          {short}
        </p>
      </div>
    </div>
  );
}
