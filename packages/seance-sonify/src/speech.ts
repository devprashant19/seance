import type { Mood } from "seance-core";

export interface ResultSentenceParams {
  readonly label: string;
  readonly value: number;
  readonly uncertainty: number;
  readonly unitSpoken?: string;
  readonly unit?: string;
  readonly n?: number;
  readonly mood?: Mood;
}

const UNIT_EXPANSIONS: Record<string, string> = {
  "m/s^2": "metres per second squared",
  "m/s²": "metres per second squared",
  "m/s": "metres per second",
  m: "metres",
  s: "seconds",
  ms: "milliseconds",
  Hz: "hertz",
  Pa: "pascals",
  GPa: "gigapascals",
  "kg/m^3": "kilograms per cubic metre",
  "rad/s": "radians per second",
  "deg/s": "degrees per second",
  rad: "radians",
  deg: "degrees",
  "|r|": "metres from centre",
  E: "pascals",
  g: "metres per second squared",
  h: "metres",
};

export function expandUnitSpoken(unit: string): string {
  const trimmed = unit.trim();
  return UNIT_EXPANSIONS[trimmed] ?? trimmed;
}

export function formatWithUncertainty(
  value: number,
  uncertainty: number,
): { valueStr: string; uncStr: string } {
  if (!Number.isFinite(value) || !Number.isFinite(uncertainty)) {
    return { valueStr: String(value), uncStr: String(uncertainty) };
  }

  const u = Math.abs(uncertainty);
  if (u === 0) {
    return { valueStr: value.toFixed(2), uncStr: "0.00" };
  }

  // Determine decimal places from uncertainty (1-2 significant figures)
  const exponent = Math.floor(Math.log10(u));
  const decimalPlaces = Math.max(0, -exponent + (u / Math.pow(10, exponent) < 2 ? 1 : 0));

  const uncStr = u.toFixed(decimalPlaces);
  const valueStr = value.toFixed(decimalPlaces);

  return { valueStr, uncStr };
}

export function resultSentence(r: ResultSentenceParams): string {
  const { valueStr, uncStr } = formatWithUncertainty(r.value, r.uncertainty);
  const unit = r.unitSpoken ?? (r.unit ? expandUnitSpoken(r.unit) : "");

  let sentence = `${r.label}: ${valueStr} plus or minus ${uncStr} ${unit}.`.trim();

  if (typeof r.n === "number" && r.n > 0) {
    sentence += ` Measured across ${r.n} oscillations.`;
  }

  if (r.mood === "uneasy") {
    sentence += " Caution: sensor data showed minor jitter.";
  } else if (r.mood === "restless") {
    sentence += " Warning: high sensor jitter detected.";
  } else if (r.mood === "fading") {
    sentence += " Notice: connection to device was unstable.";
  }

  return sentence;
}

export async function speakSentence(
  sentence: string,
  opts?: { urgent?: boolean; rate?: number },
): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  const synth = window.speechSynthesis;
  if (opts?.urgent) {
    synth.cancel();
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = opts?.rate ?? 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}
