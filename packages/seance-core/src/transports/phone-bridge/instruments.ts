/**
 * Banshee Choir instruments a player can pick on their phone. Shared by the phone pages (picker)
 * and the laptop (synthesis), so both agree on ids and the switch cooldown.
 */

export interface InstrumentInfo {
  readonly id: InstrumentId;
  readonly label: string;
  readonly emoji: string;
  /** One line for the picker. */
  readonly hint: string;
}

export const INSTRUMENT_IDS = [
  "banshee",
  "organ",
  "theremin",
  "strings",
  "musicbox",
  "bells",
  "choir",
  "bass",
] as const;

export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

export const INSTRUMENTS: readonly InstrumentInfo[] = [
  { id: "banshee", label: "Banshee Wail", emoji: "👻", hint: "Haunting vowel voice" },
  { id: "organ", label: "Haunted Organ", emoji: "🎹", hint: "Cathedral pipes" },
  { id: "theremin", label: "Theremin", emoji: "📡", hint: "Swooping sci-fi sine" },
  { id: "strings", label: "Spectral Strings", emoji: "🎻", hint: "Slow, lush ensemble" },
  { id: "musicbox", label: "Music Box", emoji: "🎶", hint: "Plucks each new note" },
  { id: "bells", label: "Crypt Bells", emoji: "🔔", hint: "Metallic chimes" },
  { id: "choir", label: "Ghost Choir", emoji: "🕯️", hint: "Airy 'aah' pad" },
  { id: "bass", label: "Grave Bass", emoji: "🔊", hint: "Deep synth bass" },
];

export const DEFAULT_INSTRUMENT: InstrumentId = "banshee";

/** A player may switch instrument at most once per this many milliseconds. */
export const INSTRUMENT_COOLDOWN_MS = 10_000;

export function isInstrumentId(value: unknown): value is InstrumentId {
  return typeof value === "string" && (INSTRUMENT_IDS as readonly string[]).includes(value);
}

export function instrumentInfo(id: InstrumentId): InstrumentInfo {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0]!;
}

/**
 * Cooldown gate for instrument switches, keyed by player. `tolerance` absorbs network jitter
 * between the phone's countdown and the laptop's clock.
 */
export class InstrumentCooldown {
  private readonly _last = new Map<string, number>();

  constructor(
    private readonly _cooldownMs = INSTRUMENT_COOLDOWN_MS,
    private readonly _toleranceMs = 750,
  ) {}

  /** Record the player's starting instrument without starting a cooldown. */
  seed(player: string): void {
    if (!this._last.has(player)) this._last.set(player, Number.NEGATIVE_INFINITY);
  }

  /** May this player switch now? If yes, the switch is recorded. */
  trySwitch(player: string, now: number): boolean {
    const last = this._last.get(player) ?? Number.NEGATIVE_INFINITY;
    if (now - last < this._cooldownMs - this._toleranceMs) return false;
    this._last.set(player, now);
    return true;
  }

  /** Milliseconds until this player may switch again (0 = now). */
  remaining(player: string, now: number): number {
    const last = this._last.get(player) ?? Number.NEGATIVE_INFINITY;
    return Math.max(0, this._cooldownMs - (now - last));
  }

  forget(player: string): void {
    this._last.delete(player);
  }
}
