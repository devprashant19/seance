import type { ChannelId } from "./channels.js";
import type { Spirit, SpiritKind } from "./spirit.js";

export interface InstrumentDef {
  readonly name: string;
  readonly kind: SpiritKind;
  readonly channels: readonly ChannelId[];
  readonly description?: string;
  createSpirit(config: Record<string, unknown>): Spirit | Promise<Spirit>;
}

export interface InputSpec {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly defaultValue: number;
  readonly defaultUncertainty?: number;
  readonly min: number;
  readonly max: number;
}

export interface ExperimentDef {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly spooky?: string;
  readonly plain?: string;
  readonly instruments?: readonly string[];
  readonly channels?: readonly (ChannelId | string)[];
  readonly inputs?: readonly InputSpec[];
  readonly safetyNote?: string;
  readonly durationMs?: number;
  readonly parameters?: Record<string, unknown>;
  readonly analyze?: (
    channels: Record<string, readonly { t: number; v: readonly number[] }[]>,
    inputs: Record<string, number>,
  ) => any;
}

export function defineInstrument(def: InstrumentDef): InstrumentDef {
  return Object.freeze({ ...def });
}

export function defineExperiment<T extends ExperimentDef = ExperimentDef>(def: T): T {
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
    const key = experiment.id ?? experiment.name;
    if (this._experiments.has(key) || this._experiments.has(experiment.name)) {
      throw new Error(`Experiment already registered: ${key}`);
    }
    if (experiment.instruments) {
      for (const instName of experiment.instruments) {
        if (!this._instruments.has(instName)) {
          throw new Error(
            `Experiment "${experiment.name}" requires unregistered instrument: ${instName}`,
          );
        }
      }
    }
    this._experiments.set(key, experiment);
    if (experiment.id && experiment.name !== experiment.id) {
      this._experiments.set(experiment.name, experiment);
    }
  }

  getInstrument(name: string): InstrumentDef | undefined {
    return this._instruments.get(name);
  }

  listInstruments(): readonly InstrumentDef[] {
    return [...this._instruments.values()];
  }

  getExperiment(nameOrId: string): ExperimentDef | undefined {
    return this._experiments.get(nameOrId);
  }

  listExperiments(): readonly ExperimentDef[] {
    return Array.from(new Set(this._experiments.values()));
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
