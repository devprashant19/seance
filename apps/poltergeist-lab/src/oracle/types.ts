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

export type VerdictTier = "approves" | "veil" | "disagree" | "cursed";
export type Confidence = "high" | "medium" | "low";

export interface Verdict {
  readonly tier: VerdictTier;
  readonly spooky: string;
  readonly plain: string;
  readonly percentError: number;
  readonly z: number;
  readonly confidence: Confidence;
  readonly dominantTerm: { readonly name: string; readonly share: number };
  readonly causes: readonly VerdictCause[];
}

export interface ExperimentResult {
  readonly measured: number;
  readonly uncertainty: number;
  readonly reference: number;
  readonly referenceUncertainty: number;
  readonly unit: string;
  readonly quantity: string;
}
