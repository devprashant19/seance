import type { BudgetTerm } from "../../oracle/types.js";
import type { Confidence } from "../../oracle/types.js";

export interface SpinEstimate {
  readonly rx: number;
  readonly ry: number;
  readonly stdErrRx: number;
  readonly stdErrRy: number;
  readonly meanOmega: number;
  readonly sampleCount: number;
}

export interface SpinUncertaintyResult {
  readonly deltaRx: number;
  readonly deltaRy: number;
  readonly deltaR: number;
  readonly relativeR: number;
  readonly confidence: Confidence;
  readonly budget: readonly BudgetTerm[];
}

export function spinUncertainty(
  spins: readonly SpinEstimate[],
  meanRx: number,
  meanRy: number,
): SpinUncertaintyResult {
  const n = spins.length;
  if (n === 0) {
    return {
      deltaRx: 0, deltaRy: 0, deltaR: 0, relativeR: 1,
      confidence: "low",
      budget: [],
    };
  }

  const meanFitErrRx = spins.reduce((s, sp) => s + sp.stdErrRx, 0) / n;
  const meanFitErrRy = spins.reduce((s, sp) => s + sp.stdErrRy, 0) / n;

  let semRx = 0;
  let semRy = 0;
  if (n >= 2) {
    const varRx = spins.reduce((s, sp) => s + (sp.rx - meanRx) ** 2, 0) / (n - 1);
    const varRy = spins.reduce((s, sp) => s + (sp.ry - meanRy) ** 2, 0) / (n - 1);
    semRx = Math.sqrt(varRx / n);
    semRy = Math.sqrt(varRy / n);
  }

  const deltaRx = Math.max(meanFitErrRx, semRx);
  const deltaRy = Math.max(meanFitErrRy, semRy);

  const r = Math.sqrt(meanRx ** 2 + meanRy ** 2);
  const deltaR = r > 1e-9
    ? Math.sqrt((meanRx * deltaRx) ** 2 + (meanRy * deltaRy) ** 2) / r
    : Math.sqrt(deltaRx ** 2 + deltaRy ** 2);
  const relativeR = r > 1e-9 ? deltaR / r : 1;

  const spread = n >= 2
    ? Math.sqrt(
        spins.reduce((s, sp) => s + (sp.rx - meanRx) ** 2 + (sp.ry - meanRy) ** 2, 0) / (n - 1),
      )
    : Infinity;

  const meanOmega = spins.reduce((s, sp) => s + Math.abs(sp.meanOmega), 0) / n;

  let confidence: Confidence;
  if (n >= 3 && spread <= 0.005 && meanOmega >= 9) {
    confidence = "high";
  } else if (n >= 2 && spread <= 0.010) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const accelShare = relativeR > 1e-9 ? 0.33 : 0.5;
  const gyroShare = relativeR > 1e-9 ? 0.67 : 0.5;

  const budget: BudgetTerm[] = [
    { name: "accel noise", share: accelShare, value: r, uncertainty: deltaR * accelShare, unit: "m" },
    { name: "gyro noise (×2)", share: gyroShare, value: r, uncertainty: deltaR * gyroShare, unit: "m" },
  ];

  return { deltaRx, deltaRy, deltaR, relativeR, confidence, budget };
}
