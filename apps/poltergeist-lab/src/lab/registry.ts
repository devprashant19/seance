import { getGlobalRegistry } from "seance-core";
import type { ExperimentDefinition } from "../experiments/pendulum-g/index.js";
import { spinFindChip } from "../experiments/spin-find-chip/index.js";
import { pendulumG } from "../experiments/pendulum-g/index.js";
import { freeFall } from "../experiments/free-fall/index.js";
import { singingRuler } from "../experiments/singing-ruler/index.js";
import { coupledPendulums } from "../experiments/coupled-pendulums/index.js";
import { boardModes } from "../experiments/board-modes/index.js";
import { gatePeriod } from "../experiments/gate-period/index.js";
import { gateSpeed } from "../experiments/gate-speed/index.js";
import { gateRpm } from "../experiments/gate-rpm/index.js";

const DEFAULT_EXPERIMENTS: readonly ExperimentDefinition[] = [
  spinFindChip,
  pendulumG,
  freeFall,
  singingRuler,
  coupledPendulums,
  boardModes,
  gatePeriod,
  gateSpeed,
  gateRpm,
];

// Ensure all default lab experiments are registered in core PluginRegistry
const globalRegistry = getGlobalRegistry();
for (const exp of DEFAULT_EXPERIMENTS) {
  if (!globalRegistry.getExperiment(exp.id)) {
    globalRegistry.registerExperiment(exp);
  }
}

export function getExperiments(): readonly ExperimentDefinition[] {
  const registered = getGlobalRegistry().listExperiments() as readonly ExperimentDefinition[];
  return registered.length > 0 ? registered : DEFAULT_EXPERIMENTS;
}

export function getExperimentById(id: string): ExperimentDefinition | undefined {
  return (
    (getGlobalRegistry().getExperiment(id) as ExperimentDefinition | undefined) ??
    DEFAULT_EXPERIMENTS.find((e) => e.id === id)
  );
}

export type { ExperimentDefinition };
