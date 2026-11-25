export interface TraceStats {
  readonly rateHz: number;
  readonly jitterPct: number;
  readonly dropouts: number;
  readonly dropoutPct: number;
  readonly durationS: number;
  readonly calibrated: boolean;
  readonly noiseFloor: number;
}

export interface Diagnostic {
  readonly code: string;
  readonly severity: "info" | "minor" | "major";
  readonly value?: number;
  readonly unit?: string;
}

export interface BudgetTerm {
  readonly name: string;
  readonly share: number;
  readonly value: number;
  readonly uncertainty: number;
  readonly unit: string;
}

export interface VerdictCause {
  readonly spooky: string;
  readonly plain: string;
  readonly fix: string;
  readonly severity: "minor" | "major";
}

/** "measured" = there is no accepted value to compare with, so no pass/fail (value ± uncertainty only). */
export type VerdictTier = "approves" | "veil" | "disagree" | "cursed" | "measured";
export type Confidence = "high" | "medium" | "low";

export interface Verdict {
  readonly tier: VerdictTier;
  readonly spooky: string;
  readonly plain: string;
  /** NaN when there is no reference to compare with. */
  readonly percentError: number;
  /** NaN when there is no reference to compare with. */
  readonly z: number;
  readonly confidence: Confidence;
  readonly dominantTerm: { readonly name: string; readonly share: number };
  readonly causes: readonly VerdictCause[];
}

export interface ExperimentResult {
  readonly measured: number;
  readonly uncertainty: number;
  /**
   * Independent accepted/theoretical value, or null when none exists for this quantity (e.g. where
   * the sensor chip sits in *your* phone). Never use the measurement itself as its reference.
   */
  readonly reference: number | null;
  readonly referenceUncertainty: number;
  readonly unit: string;
  readonly quantity: string;
}
