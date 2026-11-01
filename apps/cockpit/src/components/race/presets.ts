/**
 * What-if presets, stored in localStorage until ATLAS owns them. Every read is validated so a
 * corrupted or hand-edited entry cannot poison the race inputs.
 */

export interface RacePreset {
  id: string;
  name: string;
  massG: number;
  cdaCm2: number;
  crr: number;
  thrustScale: number;
  trackM: number;
  rho: number;
  model: "M1" | "M2";
}

export const PRESET_STORAGE_KEY = "daedalus.race.presets.v1";
const MAX_PRESETS = 50;

const LIMITS = {
  massG: [1, 1000],
  cdaCm2: [0, 500],
  crr: [0, 1],
  thrustScale: [0.05, 5],
  trackM: [1, 100],
  rho: [0.5, 1.5],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberIn(value: unknown, key: keyof typeof LIMITS): number | null {
  const [min, max] = LIMITS[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
}

export function sanitizePreset(input: unknown): RacePreset | null {
  if (!isRecord(input)) return null;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const id =
    typeof input.id === "string" && input.id.length > 0 && input.id.length <= 80 ? input.id : null;
  const model = input.model === "M1" || input.model === "M2" ? input.model : null;
  const massG = numberIn(input.massG, "massG");
  const cdaCm2 = numberIn(input.cdaCm2, "cdaCm2");
  const crr = numberIn(input.crr, "crr");
  const thrustScale = numberIn(input.thrustScale, "thrustScale");
  const trackM = numberIn(input.trackM, "trackM");
  const rho = numberIn(input.rho, "rho");
  if (
    !name ||
    name.length > 60 ||
    !id ||
    !model ||
    massG === null ||
    cdaCm2 === null ||
    crr === null ||
    thrustScale === null ||
    trackM === null ||
    rho === null
  ) {
    return null;
  }
  return { id, name, massG, cdaCm2, crr, thrustScale, trackM, rho, model };
}

export function parsePresets(raw: unknown): RacePreset[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: RacePreset[] = [];
  for (const entry of raw) {
    const preset = sanitizePreset(entry);
    if (!preset || seen.has(preset.id)) continue;
    seen.add(preset.id);
    out.push(preset);
    if (out.length === MAX_PRESETS) break;
  }
  return out;
}

export function newPresetId(): string {
  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadPresets(): { presets: RacePreset[]; error: string | null } {
  try {
    const raw = globalThis.localStorage?.getItem(PRESET_STORAGE_KEY);
    if (!raw) return { presets: [], error: null };
    return { presets: parsePresets(JSON.parse(raw)), error: null };
  } catch (cause) {
    return {
      presets: [],
      error: `Could not read saved presets: ${cause instanceof Error ? cause.message : String(cause)}`,
    };
  }
}

export function savePresets(presets: RacePreset[]): string | null {
  try {
    globalThis.localStorage?.setItem(
      PRESET_STORAGE_KEY,
      JSON.stringify(presets.slice(0, MAX_PRESETS)),
    );
    return null;
  } catch (cause) {
    return `Could not save presets: ${cause instanceof Error ? cause.message : String(cause)}`;
  }
}
