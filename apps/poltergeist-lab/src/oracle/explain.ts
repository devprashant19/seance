import type { TraceStats, BudgetTerm, ExperimentResult, Verdict } from "./types.js";

export type DiagnosisSeverity = "high" | "medium" | "low" | "info";

export interface SpiritDiagnosis {
  readonly id: string;
  readonly severity: DiagnosisSeverity;
  readonly spooky: string;
  readonly plain: string;
  readonly fix: string;
}

export interface ExplanationFact {
  readonly experimentId: string;
  readonly result: ExperimentResult;
  readonly stats: TraceStats;
  readonly verdict: Verdict;
  readonly budget: readonly BudgetTerm[];
  readonly inputs: Record<string, number>;
  readonly cycleCount?: number;
}

const SEVERITY_ORDER: Record<DiagnosisSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

const MAX_DIAGNOSES = 3;

export function diagnoseDiscrepancies(
  facts: ExplanationFact,
): readonly SpiritDiagnosis[] {
  const all: SpiritDiagnosis[] = [];

  if (facts.stats.jitterPct > 30) {
    all.push({
      id: "jitter-high",
      severity: "high",
      spooky: "The spirit's hand shakes — time itself stutters between readings.",
      plain: `Timing jitter is ${facts.stats.jitterPct.toFixed(1)}%, well above the 30% threshold. This degrades numerical derivatives and zero-crossing detection.`,
      fix: "Keep the phone screen on and this browser tab in the foreground. Move closer to Wi-Fi.",
    });
  }

  if (facts.stats.dropouts > 0) {
    all.push({
      id: "dropouts",
      severity: "medium",
      spooky: "Some whispers from the spirit were lost in the void.",
      plain: `${facts.stats.dropouts} sample(s) were lost during recording. Gaps degrade period and frequency estimates.`,
      fix: "Move closer to the Wi-Fi router, or use a mobile hotspot for a steadier connection.",
    });
  }

  if (!facts.stats.calibrated) {
    all.push({
      id: "uncalibrated",
      severity: "medium",
      spooky: "The instrument was never attuned to this realm.",
      plain: "The accelerometer was not calibrated. Uncorrected bias can shift g by several percent.",
      fix: "Run the 'Hold still' calibration step before starting the experiment.",
    });
  }

  if (facts.experimentId === "pendulum-g") {
    const lengthTerm = facts.budget.find((t) => t.name === "length");
    const timingTerm = facts.budget.find((t) => t.name === "timing");
    if (lengthTerm && timingTerm && lengthTerm.share > timingTerm.share) {
      all.push({
        id: "length-dominates",
        severity: "medium",
        spooky: "The ruler betrays you more than the clock.",
        plain: "Your length measurement uncertainty dominates over timing uncertainty. Improving L will help more than more swings.",
        fix: "Measure the string length more carefully — to the centre of the phone, not its top edge. Use a metal tape measure if available.",
      });
    }

    const pctErr = Math.abs(facts.verdict.percentError);
    if (pctErr >= 1 && pctErr <= 5) {
      all.push({
        id: "physical-pendulum",
        severity: "low",
        spooky: "The spirit is not a point — it has form and weight.",
        plain: "The phone acts as a physical pendulum, not a point mass. Its finite size shifts the effective center of oscillation.",
        fix: "Measure L to the phone's centre of mass (roughly its geometric centre), not to the top edge.",
      });
    }
  }

  if (
    facts.experimentId === "singing-ruler" &&
    facts.result.reference !== null &&
    facts.result.measured < facts.result.reference &&
    facts.verdict.percentError < -15
  ) {
    all.push({
      id: "ruler-clamp-compliance",
      severity: "medium",
      spooky: "The desk edge yields — it is not the immovable wall it pretends to be.",
      plain: `Young's modulus is ${Math.abs(facts.verdict.percentError).toFixed(1)}% below the handbook value. Clamp compliance makes the ruler vibrate as if it were longer than the measured overhang.`,
      fix: "Press the ruler down harder at the desk edge, or clamp it with a heavy book. Try the multi-length fit if available.",
    });
  }

  if (facts.cycleCount !== undefined && facts.cycleCount < 6) {
    all.push({
      id: "too-few-cycles",
      severity: "medium",
      spooky: "The spirit barely stirred — too few oscillations to read its message.",
      plain: `Only ${facts.cycleCount} oscillation(s) detected. Fewer than 6 cycles gives a noisy period estimate.`,
      fix: "Let the pendulum swing longer, or pluck the ruler and wait for more vibrations before stopping.",
    });
  }

  if (
    facts.verdict.confidence === "high" &&
    Math.abs(facts.verdict.percentError) < 3
  ) {
    all.push({
      id: "all-good",
      severity: "info",
      spooky: "Newton approves. The spirits are at peace with your measurement.",
      plain: "Your setup is clean. The measurement agrees with the reference within a tight margin.",
      fix: "No action needed — well done! Try a different experiment or repeat for even tighter statistics.",
    });
  }

  all.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return Object.freeze(all.slice(0, MAX_DIAGNOSES));
}
