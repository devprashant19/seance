import type { BudgetTerm } from "../../oracle/types.js";

export interface PendulumUncertainty {
  readonly deltaG: number;
  readonly relativeG: number;
  readonly budget: readonly BudgetTerm[];
}

export function pendulumUncertainty(
  L: number,
  deltaL: number,
  T: number,
  deltaT: number,
  g: number,
): PendulumUncertainty {
  const relL = deltaL / L;
  const relT = (2 * deltaT) / T;

  const relativeG = Math.sqrt(relL ** 2 + relT ** 2);
  const deltaG = relativeG * g;

  const totalVariance = relL ** 2 + relT ** 2;
  const lengthShare = totalVariance > 0 ? relL ** 2 / totalVariance : 0.5;
  const timingShare = totalVariance > 0 ? relT ** 2 / totalVariance : 0.5;

  const budget: BudgetTerm[] = [
    { name: "length", share: lengthShare, value: L, uncertainty: deltaL, unit: "m" },
    { name: "timing", share: timingShare, value: T, uncertainty: deltaT, unit: "s" },
  ];

  return { deltaG, relativeG, budget };
}
