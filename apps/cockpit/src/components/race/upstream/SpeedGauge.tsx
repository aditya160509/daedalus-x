"use client";
// SVG gauge copied/adapted from pmndrs/racing-game src/ui/Speed/Gauge.tsx, MIT, 7816a5d.
// The upstream Zustand/physics mutation is replaced with TITAN telemetry props.
import { useId } from "react";
const Background = ({ offset, id }: { offset: string; id: string }) => (
  <svg
    className="speed-background"
    width={289}
    height={55}
    viewBox="0 0 289 55"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id={id} x1="1" y1="0" x2="0" y2="0">
        <stop offset={offset} stopColor="#b7c2cd" />
        <stop stopColor="#3dd6f0" />
      </linearGradient>
    </defs>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 40c175.256-2.308 227.867-13.823 289-40v55H0V40z"
      fill={`url(#${id})`}
    />
  </svg>
);

const Foreground = () => (
  <svg
    className="speed-foreground"
    width={289}
    height={55}
    viewBox="0 0 289 55"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 40c175.256-2.308 227.867-13.823 289-40v55H0V40zm7.5 9.5v-5h9v5h-9zm24 0h-8v-5h8v5zm7-5v5h9v-5h-9zm16 0v5h9v-5h-9zm16-1v6h8v-6h-8zm16 0v6h8v-6h-8zm24 6h-9v-7h9v7zm15 0h-8v-8h8v8zm16 0h-9v-10h9v10zm16 0h-9v-11h9v11zm15 0h-9v-13l9-.5v13.5zm16 0h-9v-15l9-1v16zm15 0h-9v-17l9-1v18zm16 0h-10v-19l10-1v20zm16 0h-10v-21l10-2v23zm15.5 0h-9.5v-25L251 22v27.5zm16 0h-10v-29l10-3.5v32.5zm16 0h-10V15l10-4v38.5z"
      fill="#252a31"
    />
  </svg>
);

export function SpeedGauge({
  speedMps,
  maximumMps,
}: {
  speedMps: number | null;
  maximumMps: number;
}) {
  const id = useId().replaceAll(":", "");
  const fraction =
    speedMps === null ? 0 : Math.max(0, Math.min(1, speedMps / Math.max(maximumMps, 0.01)));
  return (
    <div
      className="w-40 sm:w-52"
      aria-label={
        speedMps === null
          ? "Speed unavailable"
          : `Speed ${(speedMps * 3.6).toFixed(1)} kilometres per hour`
      }
    >
      <div className="mb-1 flex items-baseline gap-1.5 font-mono text-white tabular-nums">
        <span className="text-2xl">{speedMps === null ? "—" : (speedMps * 3.6).toFixed(1)}</span>
        <span className="text-[10px] text-white/60">km/h</span>
      </div>
      <div className="relative h-10 overflow-hidden [&>svg]:absolute [&>svg]:inset-0 [&>svg]:h-full [&>svg]:w-full">
        <Background offset={(1 - fraction).toFixed(4)} id={id} />
        <Foreground />
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[9px] text-white/50">
        <span>0 m/s</span>
        <span>{maximumMps.toFixed(1)} m/s</span>
      </div>
    </div>
  );
}
