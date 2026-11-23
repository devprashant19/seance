import { BaseSpirit } from "../base-spirit.js";
import type {
  ChannelInfo,
  HealthReport,
  SpiritKind,
  TransportKind,
} from "../spirit.js";

const CAPABILITIES: readonly ChannelInfo[] = [
  { id: "audio.level", unit: "dBFS", axes: ["rms"], nominalRateHz: 30 },
  { id: "audio.spectrum", unit: "dBFS", axes: [], nominalRateHz: 30 },
];

export class LocalSpirit extends BaseSpirit {
  readonly id = "local-mic";
  readonly kind: SpiritKind = "banshee";
  readonly label = "Local Microphone";
  readonly transport: TransportKind = "local";
  readonly capabilities = CAPABILITIES;

  private _timer: ReturnType<typeof setInterval> | undefined;
  private _audioCtx: AudioContext | undefined;
  private _analyser: AnalyserNode | undefined;
  private _stream: MediaStream | undefined;
  private _seq = 0;
  private _startMs = 0;
  private _fftSize = 2048;
  private _isBrowser = false;

  async summon(): Promise<void> {
    this.setState("summoning", "requesting microphone");

    this._isBrowser =
      typeof globalThis.AudioContext !== "undefined" &&
      typeof globalThis.navigator?.mediaDevices?.getUserMedia === "function";

    if (this._isBrowser) {
      try {
        this._audioCtx = new AudioContext();
        this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = this._audioCtx.createMediaStreamSource(this._stream);
        this._analyser = this._audioCtx.createAnalyser();
        this._analyser.fftSize = this._fftSize;
        source.connect(this._analyser);
      } catch {
        this._isBrowser = false;
      }
    }

    this._startMs = Date.now();
    this.setState("present", this._isBrowser ? "mic live" : "stub mode");

    this._timer = setInterval(() => {
      this._tick();
    }, 33);
  }

  override async banish(): Promise<void> {
    if (this._timer !== undefined) {
      clearInterval(this._timer);
      this._timer = undefined;
    }
    if (this._stream) {
      for (const track of this._stream.getTracks()) track.stop();
      this._stream = undefined;
    }
    if (this._audioCtx) {
      await this._audioCtx.close().catch(() => {});
      this._audioCtx = undefined;
    }
    this._analyser = undefined;
    await super.banish();
  }

  private _tick(): void {
    if (this.state !== "present") return;

    const nowMs = Date.now() - this._startMs;
    this._seq++;

    if (this._isBrowser && this._analyser) {
      const timeDomain = new Float32Array(this._analyser.fftSize);
      this._analyser.getFloatTimeDomainData(timeDomain);

      let sumSq = 0;
      for (let i = 0; i < timeDomain.length; i++) {
        sumSq += timeDomain[i]! ** 2;
      }
      const rms = Math.sqrt(sumSq / timeDomain.length);
      const dBFS = rms > 0 ? 20 * Math.log10(rms) : -100;

      this.emitBatch({
        channel: "audio.level",
        seq: this._seq,
        t: Float64Array.of(nowMs),
        values: [Float32Array.of(dBFS)],
      });

      const freqData = new Float32Array(this._analyser.frequencyBinCount);
      this._analyser.getFloatFrequencyData(freqData);

      this._seq++;
      this.emitBatch({
        channel: "audio.spectrum",
        seq: this._seq,
        t: Float64Array.of(nowMs),
        values: [freqData],
      });
    } else {
      this.emitBatch({
        channel: "audio.level",
        seq: this._seq,
        t: Float64Array.of(nowMs),
        values: [Float32Array.of(-60)],
      });

      this._seq++;
      const silentSpectrum = new Float32Array(this._fftSize / 2).fill(-100);
      this.emitBatch({
        channel: "audio.spectrum",
        seq: this._seq,
        t: Float64Array.of(nowMs),
        values: [silentSpectrum],
      });
    }

    const health: HealthReport = {
      rateHz: 30,
      jitterPct: 0,
      dropouts: 0,
      calibrated: this._isBrowser,
      mood: "calm",
      reason: this._isBrowser ? "Mic active" : "Stub mode (no Web Audio)",
    };
    this.updateHealth(health, nowMs);
  }
}

export function createLocalSpirit(): LocalSpirit {
  return new LocalSpirit();
}
