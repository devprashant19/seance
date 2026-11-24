/**
 * Multi-spirit array orchestrator.
 */

import type { Spirit, SpiritState, Mood, SampleBatch } from "../spirit.js";
import { linearResample } from "../dsp/resample.js";
import { estimateSyncSkewBound, type SyncQualityReport } from "./sync-quality.js";

export interface ArraySpiritMember {
  readonly spirit: Spirit;
  readonly roleName: string;
  samplingRateHz: number;
  lastSeenMs: number;
  rttSamplesMs: number[];
}

export interface ArraySpiritConfig {
  readonly id: string;
  readonly name: string;
  readonly targetRateHz?: number; // default min of member rates or 50
}

export class ArraySpirit {
  readonly id: string;
  readonly name: string;
  private readonly _members = new Map<string, ArraySpiritMember>();
  private readonly _targetRate: number;
  private _state: SpiritState = "present";
  private _mood: Mood = "calm";

  constructor(config: ArraySpiritConfig) {
    this.id = config.id;
    this.name = config.name;
    this._targetRate = config.targetRateHz ?? 50;
  }

  get state(): SpiritState {
    return this._state;
  }

  get mood(): Mood {
    return this._mood;
  }

  get memberCount(): number {
    return this._members.size;
  }

  addMember(spirit: Spirit, roleName: string): void {
    this._members.set(spirit.id, {
      spirit,
      roleName,
      samplingRateHz: 50,
      lastSeenMs: Date.now(),
      rttSamplesMs: [10, 12, 11], // nominal RTT
    });
  }

  removeMember(spiritId: string): boolean {
    return this._members.delete(spiritId);
  }

  getMember(spiritId: string): ArraySpiritMember | undefined {
    return this._members.get(spiritId);
  }

  listMembers(): { id: string; roleName: string; state: SpiritState; mood: Mood }[] {
    const list: { id: string; roleName: string; state: SpiritState; mood: Mood }[] = [];
    for (const [id, m] of this._members.entries()) {
      list.push({
        id,
        roleName: m.roleName,
        state: m.spirit.state,
        mood: m.spirit.health().mood,
      });
    }
    return list;
  }

  getSyncReport(): SyncQualityReport {
    const allRtts: number[] = [];
    for (const m of this._members.values()) {
      allRtts.push(...m.rttSamplesMs);
    }
    return estimateSyncSkewBound(allRtts);
  }

  resampleMemberTrace(
    t: Float64Array | number[],
    v: Float32Array | number[],
    inputRateHz: number,
  ): { t: Float64Array; v: Float32Array } {
    const commonRate = Math.min(inputRateHz, this._targetRate);
    const n = Math.min(t.length, v.length);
    if (n < 2) {
      return {
        t: t instanceof Float64Array ? t : new Float64Array(t),
        v: v instanceof Float32Array ? v : new Float32Array(v),
      };
    }

    const res = linearResample(t, v, commonRate);
    return { t: res.t, v: res.values };
  }

  markMemberDropout(spiritId: string): void {
    const member = this._members.get(spiritId);
    if (member) {
      this._mood = "fading";
    }
  }
}
