// Adapted from pmndrs/racing-game src/ui/LeaderBoard.tsx (Score/Scores) and
// src/ui/Finished.tsx, MIT, commit 7816a5d. See retained licence in docs/licenses/.
// Supabase authentication/writes and medal assets are replaced with our model results.
import type { HTMLAttributes } from "react";

interface ReplayScore {
  id: string;
  name: string;
  time: number | null;
}
const readableTime = (milliseconds: number) => (milliseconds / 1000).toFixed(4);
const Score = ({ name, standing, time }: ReplayScore & { standing: number }) => (
  <li className="flex items-center justify-between gap-4 py-1.5 text-xs">
    <span className="min-w-0 truncate">
      <span className="mr-2 font-mono text-white/50">{standing}</span>
      {name}
    </span>
    <span className="shrink-0 font-mono tabular-nums">
      {time === null ? "DNF" : `${readableTime(time)} s`}
    </span>
  </li>
);
const Scores = ({
  scores,
  ...props
}: HTMLAttributes<HTMLUListElement> & { scores: ReplayScore[] }) => (
  <ul {...props}>
    {scores.map((score, index) => (
      <Score {...score} standing={index + 1} key={score.id} />
    ))}
  </ul>
);
export function ReplayResults({
  primary,
  comparison,
  primaryName,
  comparisonName,
}: {
  primary: number | null;
  comparison?: number | null;
  primaryName: string;
  comparisonName: string;
}) {
  const scores: ReplayScore[] = [
    { id: "primary", name: primaryName, time: primary === null ? null : primary * 1000 },
    ...(comparison === undefined
      ? []
      : [
          {
            id: "comparison",
            name: comparisonName,
            time: comparison === null ? null : comparison * 1000,
          },
        ]),
  ];
  scores.sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  const tied =
    scores.length > 1 &&
    scores[0].time !== null &&
    scores[1].time !== null &&
    Math.abs(scores[0].time - scores[1].time) < 0.01;
  return (
    <div
      className="rounded-lg border border-white/15 bg-black/65 px-4 py-3 text-white backdrop-blur-sm"
      role="status"
    >
      <h3 className="mb-1 text-[10px] tracking-wide text-white/60 uppercase">
        Model finish ·{" "}
        {scores[0].time === null
          ? "No finisher"
          : tied
            ? "Tie within 0.01 ms"
            : `${scores[0].name} leads`}
      </h3>
      <Scores scores={scores} className="divide-y divide-white/10" />
    </div>
  );
}
