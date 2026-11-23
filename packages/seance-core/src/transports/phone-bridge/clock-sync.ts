const MIN_SAMPLES = 3;
const MAX_SAMPLES = 8;
const SYNC_INTERVAL_MS = 5000;

export interface SyncSample {
  readonly t0: number;
  readonly t1: number;
  readonly t2: number;
  readonly t3: number;
}

export interface ClockEstimate {
  readonly offsetMs: number;
  readonly rttMs: number;
  readonly samples: number;
}

export class ClockSync {
  private readonly _samples: SyncSample[] = [];
  private _estimate: ClockEstimate | undefined;

  get syncIntervalMs(): number {
    return SYNC_INTERVAL_MS;
  }

  get estimate(): ClockEstimate | undefined {
    return this._estimate;
  }

  get sampleCount(): number {
    return this._samples.length;
  }

  get isReady(): boolean {
    return this._samples.length >= MIN_SAMPLES;
  }

  createProbe(): { t0: number } {
    return { t0: performance.now() };
  }

  addSample(sample: SyncSample): ClockEstimate {
    this._samples.push(sample);
    if (this._samples.length > MAX_SAMPLES) {
      this._samples.shift();
    }
    this._estimate = this._computeEstimate();
    return this._estimate;
  }

  remoteToLocal(remoteMs: number): number {
    if (!this._estimate) return remoteMs;
    return remoteMs - this._estimate.offsetMs;
  }

  localToRemote(localMs: number): number {
    if (!this._estimate) return localMs;
    return localMs + this._estimate.offsetMs;
  }

  reset(): void {
    this._samples.length = 0;
    this._estimate = undefined;
  }

  private _computeEstimate(): ClockEstimate {
    const offsets: number[] = [];
    const rtts: number[] = [];

    for (const s of this._samples) {
      const rtt = (s.t3 - s.t0) - (s.t2 - s.t1);
      const offset = ((s.t1 - s.t0) + (s.t2 - s.t3)) / 2;
      rtts.push(rtt);
      offsets.push(offset);
    }

    const sortedRtts = [...rtts].sort((a, b) => a - b);
    const medianRtt = sortedRtts[Math.floor(sortedRtts.length / 2)]!;

    const filtered: number[] = [];
    for (let i = 0; i < offsets.length; i++) {
      if (rtts[i]! <= medianRtt * 2) {
        filtered.push(offsets[i]!);
      }
    }

    const usable = filtered.length > 0 ? filtered : offsets;
    const avgOffset = usable.reduce((a, b) => a + b, 0) / usable.length;

    return {
      offsetMs: avgOffset,
      rttMs: medianRtt,
      samples: this._samples.length,
    };
  }
}
