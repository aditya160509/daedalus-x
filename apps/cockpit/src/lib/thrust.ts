/** Thrust-curve helpers for the Race workspace. */

export interface ThrustTrace {
  t_s: number[];
  force_n: number[];
}

export interface ThrustEstimate {
  peakN: number;
  riseS: number;
  decayTauS: number;
  burnS: number;
}

/**
 * Parametric estimate: linear rise to peak, exponential decay, cut to zero at burn end.
 * This is an assumption shape, never a measurement.
 */
export function estimateThrust(p: ThrustEstimate, samples = 240): ThrustTrace {
  const t_s: number[] = [];
  const force_n: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (p.burnS * i) / (samples - 1);
    const f =
      t <= p.riseS ? (p.peakN * t) / p.riseS : p.peakN * Math.exp(-(t - p.riseS) / p.decayTauS);
    t_s.push(t);
    force_n.push(i === samples - 1 ? 0 : f);
  }
  return { t_s, force_n };
}

/** Total impulse by trapezoidal integration, N·s. */
export function impulse(trace: ThrustTrace): number {
  let sum = 0;
  for (let i = 1; i < trace.t_s.length; i++) {
    sum += 0.5 * (trace.force_n[i] + trace.force_n[i - 1]) * (trace.t_s[i] - trace.t_s[i - 1]);
  }
  return sum;
}

export class ThrustCsvError extends Error {}

/**
 * Parse a two-column CSV (time [s], force [N]). A header row is allowed; units in the header
 * must be s and N if present ("time_s,force_n" or "t (s), F (N)").
 */
export function parseThrustCsv(text: string): ThrustTrace {
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0 && !r.startsWith("#"));
  if (rows.length === 0) throw new ThrustCsvError("File is empty");
  const delim = rows[0].includes(";") ? ";" : rows[0].includes("\t") ? "\t" : ",";
  const first = rows[0].split(delim);
  const hasHeader = first.some((c) => Number.isNaN(Number(c.trim())));
  if (hasHeader) {
    const header = rows[0].toLowerCase();
    if (/\bms\b|millisecond/.test(header) || /\bkn\b|\bmn\b|\blbf\b|\bkgf\b/.test(header)) {
      throw new ThrustCsvError("Header units must be seconds and newtons");
    }
  }
  const t_s: number[] = [];
  const force_n: number[] = [];
  rows.slice(hasHeader ? 1 : 0).forEach((r, i) => {
    const cells = r.split(delim).map((c) => Number(c.trim()));
    if (cells.length < 2 || !Number.isFinite(cells[0]) || !Number.isFinite(cells[1])) {
      throw new ThrustCsvError(`Row ${i + (hasHeader ? 2 : 1)} is not two numbers`);
    }
    t_s.push(cells[0]);
    force_n.push(cells[1]);
  });
  if (t_s.length < 2) throw new ThrustCsvError("Need at least two samples");
  for (let i = 1; i < t_s.length; i++) {
    if (t_s[i] <= t_s[i - 1]) throw new ThrustCsvError(`Time not increasing at row ${i + 1}`);
  }
  if (force_n.some((f) => f < 0)) throw new ThrustCsvError("Negative force values");
  return { t_s, force_n };
}
