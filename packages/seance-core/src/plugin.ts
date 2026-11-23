import type { ChannelId } from "./channels.js";
import type { Spirit, SpiritKind } from "./spirit.js";

export interface InstrumentDef {
  readonly name: string;
  readonly kind: SpiritKind;
  readonly channels: readonly ChannelId[];
  readonly description?: string;
  createSpirit(config: Record<string, unknown>): Spirit | Promise<Spirit>;
}

export interface ExperimentDef {
  readonly name: string;
  readonly description?: string;
  readonly instruments: readonly string[];
  readonly durationMs?: number;
  readonly parameters?: Record<string, unknown>;
}

export function defineInstrument(def: InstrumentDef): InstrumentDef {
  return Object.freeze({ ...def });
}

export function defineExperiment(def: ExperimentDef): ExperimentDef {
  return Object.freeze({ ...def });
}

export class PluginRegistry {
  private readonly _instruments = new Map<string, InstrumentDef>();
  private readonly _experiments = new Map<string, ExperimentDef>();

  registerInstrument(instrument: InstrumentDef): void {
    if (this._instruments.has(instrument.name)) {
      throw new Error(`Instrument already registered: ${instrument.name}`);
    }
    this._instruments.set(instrument.name, instrument);
  }

  registerExperiment(experiment: ExperimentDef): void {
    if (this._experiments.has(experiment.name)) {
      throw new Error(`Experiment already registered: ${experiment.name}`);
    }
    for (const instName of experiment.instruments) {
      if (!this._instruments.has(instName)) {
        throw new Error(
          `Experiment "${experiment.name}" requires unregistered instrument: ${instName}`,
        );
      }
    }
    this._experiments.set(experiment.name, experiment);
  }

  getInstrument(name: string): InstrumentDef | undefined {
    return this._instruments.get(name);
  }

  getExperiment(name: string): ExperimentDef | undefined {
    return this._experiments.get(name);
  }

  listInstruments(): readonly InstrumentDef[] {
    return [...this._instruments.values()];
  }

  listExperiments(): readonly ExperimentDef[] {
    return [...this._experiments.values()];
  }

  clear(): void {
    this._instruments.clear();
    this._experiments.clear();
  }
}

let _globalRegistry: PluginRegistry | undefined;

export function getGlobalRegistry(): PluginRegistry {
  if (!_globalRegistry) {
    _globalRegistry = new PluginRegistry();
  }
  return _globalRegistry;
}
