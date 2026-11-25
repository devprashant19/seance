import type {
  ExperimentResult,
  TraceStats,
  Diagnostic,
  BudgetTerm,
  Verdict,
  VerdictTier,
  VerdictCause,
  Confidence,
} from "./types.js";

const SPOOKY_HEADLINES: Record<VerdictTier, string> = {
  approves: "Newton approves.",
  veil: "The veil is thin.",
  disagree: "The spirits disagree.",
  cursed: "The data is cursed — here’s why.",
  measured: "The spirit has spoken.",
};

const PLAIN_HEADLINES: Record<VerdictTier, string> = {
  approves: "Measurement agrees with the reference within uncertainty.",
  veil: "Result is close but not quite within one standard deviation.",
  disagree: "The measured value differs significantly from the reference.",
  cursed: "Data quality is too poor for a trustworthy result.",
  measured: "There is no accepted value to compare this with, so this is a measurement, not a pass/fail.",
};

function computeConfidence(
  stats: TraceStats,
  diagnostics: readonly Diagnostic[],
): Confidence {
  const hasMajor = diagnostics.some((d) => d.severity === "major");
  const hasMinor = diagnostics.some((d) => d.severity === "minor");

  if (hasMajor || stats.jitterPct > 30 || stats.dropoutPct > 2) {
    return "low";
  }
  if (
    (stats.jitterPct > 10 && stats.jitterPct <= 30) ||
    hasMinor ||
    !stats.calibrated
  ) {
    return "medium";
  }
  return "high";
}

function computeZ(result: ExperimentResult): number {
  if (result.reference === null) return Number.NaN;
  const diff = Math.abs(result.measured - result.reference);
  const combinedU = Math.sqrt(
    result.uncertainty ** 2 + result.referenceUncertainty ** 2,
  );
  return combinedU > 0 ? diff / combinedU : diff > 0 ? Infinity : 0;
}

function computePercentError(result: ExperimentResult): number {
  if (result.reference === null) return Number.NaN;
  // A zero reference has no meaningful relative error (0 vs 0 is not "0 % error").
  if (result.reference === 0) return Number.NaN;
  return 100 * ((result.measured - result.reference) / result.reference);
}

function findDominantTerm(
  budget: readonly BudgetTerm[],
): { name: string; share: number } {
  if (budget.length === 0) return { name: "unknown", share: 0 };

  const totalVariance = budget.reduce(
    (sum, t) => sum + t.uncertainty ** 2,
    0,
  );
  if (totalVariance === 0) return { name: budget[0]!.name, share: 0 };

  let maxShare = 0;
  let maxName = budget[0]!.name;
  for (const term of budget) {
    const share = term.uncertainty ** 2 / totalVariance;
    if (share > maxShare) {
      maxShare = share;
      maxName = term.name;
    }
  }
  return { name: maxName, share: maxShare };
}

function assignTier(z: number, confidence: Confidence): VerdictTier {
  if (confidence === "low") return "cursed";
  if (Number.isNaN(z)) return "measured";
  if (z > 3) return "cursed";
  if (z <= 1) return "approves";
  if (z <= 2) return "veil";
  return "disagree";
}

function buildCauses(
  stats: TraceStats,
  diagnostics: readonly Diagnostic[],
  dominant: { name: string; share: number },
): VerdictCause[] {
  const causes: VerdictCause[] = [];

  for (const d of diagnostics) {
    if (d.severity === "major") {
      causes.push({
        spooky: `A dark force corrupts the signal (${d.code}).`,
        plain: `Major issue: ${d.code}${d.value !== undefined ? ` = ${d.value}${d.unit ?? ""}` : ""}.`,
        fix: "Re-run the experiment after addressing this issue.",
        severity: "major",
      });
    } else if (d.severity === "minor") {
      causes.push({
        spooky: `A minor disturbance in the ether (${d.code}).`,
        plain: `Minor issue: ${d.code}${d.value !== undefined ? ` = ${d.value}${d.unit ?? ""}` : ""}.`,
        fix: "Consider re-running for a cleaner result.",
        severity: "minor",
      });
    }
  }

  if (stats.jitterPct > 30) {
    causes.push({
      spooky: "The spirit's hand trembles violently.",
      plain: `Timing jitter is ${stats.jitterPct.toFixed(1)}% (threshold: 30%).`,
      fix: "Move closer to Wi-Fi or reduce background apps.",
      severity: "major",
    });
  } else if (stats.jitterPct > 10) {
    causes.push({
      spooky: "The spirit's hand wavers.",
      plain: `Timing jitter is ${stats.jitterPct.toFixed(1)}% (ideal: < 10%).`,
      fix: "Try a steadier network connection.",
      severity: "minor",
    });
  }

  if (stats.dropoutPct > 2) {
    causes.push({
      spooky: "The connection to the other side flickers.",
      plain: `${stats.dropouts} dropouts (${stats.dropoutPct.toFixed(1)}% of samples lost).`,
      fix: "Keep the phone screen on and the tab in the foreground.",
      severity: "major",
    });
  }

  if (!stats.calibrated) {
    causes.push({
      spooky: "The instrument was not attuned.",
      plain: "Sensor was not calibrated before recording.",
      fix: 'Run the "Hold still" calibration step before the experiment.',
      severity: "minor",
    });
  }

  if (dominant.share > 0.5) {
    const pct = (dominant.share * 100).toFixed(0);
    causes.push({
      spooky: `The ${dominant.name} dominates the uncertainty like a restless ghost.`,
      plain: `${dominant.name} contributes ${pct}% of the total uncertainty.`,
      fix: `Improve the ${dominant.name} measurement for a tighter result.`,
      severity: dominant.share > 0.8 ? "major" : "minor",
    });
  }

  causes.sort((a, b) => {
    const sevOrder = { major: 0, minor: 1 } as const;
    return sevOrder[a.severity] - sevOrder[b.severity];
  });

  return causes;
}

export function judge(
  result: ExperimentResult,
  stats: TraceStats,
  diagnostics: readonly Diagnostic[],
  budget: readonly BudgetTerm[],
): Verdict {
  const confidence = computeConfidence(stats, diagnostics);
  const z = computeZ(result);
  const percentError = computePercentError(result);
  const dominantTerm = findDominantTerm(budget);
  const tier = assignTier(z, confidence);
  const causes = buildCauses(stats, diagnostics, dominantTerm);

  return {
    tier,
    spooky: SPOOKY_HEADLINES[tier],
    plain: PLAIN_HEADLINES[tier],
    percentError,
    z,
    confidence,
    dominantTerm,
    causes,
  };
}
