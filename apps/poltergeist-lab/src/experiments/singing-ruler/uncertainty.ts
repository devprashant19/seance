import type { BudgetTerm } from "../../oracle/types.js";

export interface SingingRulerUncertainty {
  readonly deltaE: number;
  readonly relativeE: number;
  readonly budget: readonly BudgetTerm[];
}

export function singingRulerUncertainty(
  E: number,
  h: number,
  deltaH: number,
  L: number,
  deltaL: number,
  f1: number,
  deltaF: number,
): SingingRulerUncertainty {
  const relH = (2 * deltaH) / h;
  const relL = (4 * deltaL) / L;
  const relF = (2 * deltaF) / f1;

  const relativeE = Math.sqrt(relH ** 2 + relL ** 2 + relF ** 2);
  const deltaE = relativeE * E;

  const totalVariance = relH ** 2 + relL ** 2 + relF ** 2;

  const budget: BudgetTerm[] = [
    {
      name: "thickness",
      share: totalVariance > 0 ? relH ** 2 / totalVariance : 1 / 3,
      value: h,
      uncertainty: deltaH,
      unit: "m",
    },
    {
      name: "length",
      share: totalVariance > 0 ? relL ** 2 / totalVariance : 1 / 3,
      value: L,
      uncertainty: deltaL,
      unit: "m",
    },
    {
      name: "frequency",
      share: totalVariance > 0 ? relF ** 2 / totalVariance : 1 / 3,
      value: f1,
      uncertainty: deltaF,
      unit: "Hz",
    },
  ];

  return { deltaE, relativeE, budget };
}
