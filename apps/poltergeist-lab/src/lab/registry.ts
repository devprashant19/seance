import type { ExperimentDefinition } from "../experiments/pendulum-g/index.js";
import { pendulumG } from "../experiments/pendulum-g/index.js";
import { freeFall } from "../experiments/free-fall/index.js";
import { singingRuler } from "../experiments/singing-ruler/index.js";

const ALL_EXPERIMENTS: readonly ExperimentDefinition[] = [
  pendulumG,
  freeFall,
  singingRuler,
];

export function getExperiments(): readonly ExperimentDefinition[] {
  return ALL_EXPERIMENTS;
}

export function getExperimentById(id: string): ExperimentDefinition | undefined {
  return ALL_EXPERIMENTS.find((e) => e.id === id);
}

export type { ExperimentDefinition };
