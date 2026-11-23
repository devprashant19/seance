import type { BudgetTerm } from "../../oracle/types.js";

export interface FreeFallUncertainty {
  readonly deltaH: number;
  readonly relativeH: number;
  readonly budget: readonly BudgetTerm[];
}

export function freeFallUncertainty(
  h: number,
  t: number,
  deltaT: number,
  sampleIntervalMs: number,
): FreeFallUncertainty {
  const sampleUncertaintyS = sampleIntervalMs / 1000 / 2;
  const totalDeltaT = Math.sqrt(deltaT ** 2 + sampleUncertaintyS ** 2);

  const relT = (2 * totalDeltaT) / t;
  const relativeH = relT;
  const deltaH = relativeH * h;

  const timingVariance = deltaT ** 2;
  const samplingVariance = sampleUncertaintyS ** 2;
  const totalVariance = timingVariance + samplingVariance;

  const budget: BudgetTerm[] = [
    {
      name: "timing",
      share: totalVariance > 0 ? timingVariance / totalVariance : 0.5,
      value: t,
      uncertainty: deltaT,
      unit: "s",
    },
    {
      name: "sampling",
      share: totalVariance > 0 ? samplingVariance / totalVariance : 0.5,
      value: sampleIntervalMs,
      uncertainty: sampleUncertaintyS * 1000,
      unit: "ms",
    },
  ];

  return { deltaH, relativeH, budget };
}
