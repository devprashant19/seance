import { BaseSpirit } from "../base-spirit.js";
import type { ChannelInfo, SpiritKind, TransportKind } from "../spirit.js";
import {
  computeRoiSignal,
  calibrateBaseline,
  type NormalizedRoi,
  type BaselineCalibration,
} from "../dsp/photogate.js";

const CAPABILITIES: readonly ChannelInfo[] = [
  { id: "camera.gate", unit: "1", axes: ["roi1", "roi2"], nominalRateHz: 30 },
];

export interface CameraGateSpiritOptions {
  readonly roi1?: NormalizedRoi;
  readonly roi2?: NormalizedRoi;
  readonly downsampleWidth?: number;
  readonly downsampleHeight?: number;
}

export class CameraGateSpirit extends BaseSpirit {
  readonly id = "camera-gate";
  readonly kind: SpiritKind = "poltergeist";
  readonly label = "Apparition Photogate";
  readonly transport: TransportKind = "local";
  readonly capabilities = CAPABILITIES;

  private _stream: MediaStream | undefined;
  private _videoEl: HTMLVideoElement | undefined;
  private _canvas: OffscreenCanvas | HTMLCanvasElement | undefined;
  private _ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | undefined;
  private _animationFrameId: number | undefined;
  private _timer: ReturnType<typeof setInterval> | undefined;

  private _roi1: NormalizedRoi;
  private _roi2: NormalizedRoi;
  private _width: number;
  private _height: number;

  private _calib1: BaselineCalibration = { baseline: 128, sigma: 5 };
  private _calib2: BaselineCalibration = { baseline: 128, sigma: 5 };
  private _calibrating = false;
  private _calibrationSamples1: number[] = [];
  private _calibrationSamples2: number[] = [];

  private _fps = 30;
  private _lastFrameTimeMs = 0;
  private _isBrowser = false;
  private _seq = 0;
  private _source: "none" | "camera" | "synthetic" = "none";
  private _calibrated = false;

  constructor(options?: CameraGateSpiritOptions) {
    super();
    this._roi1 = options?.roi1 ?? { x: 0.3, y: 0.4, width: 0.1, height: 0.2 };
    this._roi2 = options?.roi2 ?? { x: 0.6, y: 0.4, width: 0.1, height: 0.2 };
    this._width = options?.downsampleWidth ?? 64;
    this._height = options?.downsampleHeight ?? 48;
  }

  get fps(): number {
    return this._fps;
  }

  /** Where frames come from: the real webcam, or synthetic noise (tests / camera unavailable). */
  get source(): "none" | "camera" | "synthetic" {
    return this._source;
  }

  /** The live webcam stream, so a page can show what the gate sees. */
  get mediaStream(): MediaStream | undefined {
    return this._stream;
  }

  /** True once a baseline has been measured from real frames. */
  get calibrated(): boolean {
    return this._calibrated;
  }

  get calibration(): { roi1: BaselineCalibration; roi2: BaselineCalibration } {
    return { roi1: this._calib1, roi2: this._calib2 };
  }

  setRoi(gateIndex: 1 | 2, roi: NormalizedRoi): void {
    if (gateIndex === 1) {
      this._roi1 = roi;
    } else {
      this._roi2 = roi;
    }
  }

  startCalibration(): void {
    this._calibrating = true;
    this._calibrationSamples1 = [];
    this._calibrationSamples2 = [];
  }

  stopCalibration(): void {
    this._calibrating = false;
    if (this._calibrationSamples1.length > 5) {
      this._calib1 = calibrateBaseline(this._calibrationSamples1);
    }
    if (this._calibrationSamples2.length > 5) {
      this._calib2 = calibrateBaseline(this._calibrationSamples2);
    }
    this._calibrated = this._calibrationSamples1.length > 5;
  }

  override async summon(): Promise<void> {
    this.setState("summoning", "requesting camera access");

    this._isBrowser =
      typeof globalThis.navigator?.mediaDevices?.getUserMedia === "function" &&
      (typeof globalThis.OffscreenCanvas !== "undefined" || typeof document !== "undefined");

    if (this._isBrowser) {
      try {
        this._stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        });

        if (typeof document !== "undefined") {
          this._videoEl = document.createElement("video");
          this._videoEl.srcObject = this._stream;
          this._videoEl.playsInline = true;
          this._videoEl.muted = true;
          await this._videoEl.play();
        }

        if (typeof OffscreenCanvas !== "undefined") {
          this._canvas = new OffscreenCanvas(this._width, this._height);
          this._ctx = this._canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
        } else if (typeof document !== "undefined") {
          const domCanvas = document.createElement("canvas");
          domCanvas.width = this._width;
          domCanvas.height = this._height;
          this._canvas = domCanvas;
          this._ctx = domCanvas.getContext("2d") as CanvasRenderingContext2D;
        }

        this._source = "camera";
        this._startVideoLoop();
        this.setState("present", "camera photogate active");
        return;
      } catch {
        // Fall back to synthetic mock loop if camera denied or unavailable
      }
    }

    // Synthetic fallback (for tests or unsupported environments). Pages must check `source` and
    // never present measurements from it as real.
    this._source = "synthetic";
    this._startSyntheticLoop();
    this.setState("present", "synthetic photogate active");
  }

  private _startVideoLoop(): void {
    const processFrame = (nowMs: number) => {
      if (!this._ctx || !this._videoEl) return;

      try {
        this._ctx.drawImage(this._videoEl, 0, 0, this._width, this._height);
        const imgData = this._ctx.getImageData(0, 0, this._width, this._height);
        const pixels = imgData.data;

        const val1 = computeRoiSignal(pixels, this._width, this._height, this._roi1);
        const val2 = computeRoiSignal(pixels, this._width, this._height, this._roi2);

        if (this._calibrating) {
          this._calibrationSamples1.push(val1);
          this._calibrationSamples2.push(val2);
        }

        if (this._lastFrameTimeMs > 0) {
          const dt = nowMs - this._lastFrameTimeMs;
          if (dt > 0) this._fps = 0.9 * this._fps + 0.1 * (1000 / dt);
        }
        this._lastFrameTimeMs = nowMs;

        const delta1 = Math.abs(val1 - this._calib1.baseline);
        const delta2 = Math.abs(val2 - this._calib2.baseline);

        this.emitBatch({
          channel: "camera.gate",
          seq: this._seq++,
          t: Float64Array.of(nowMs),
          values: [Float32Array.of(delta1), Float32Array.of(delta2)],
        });
      } catch {
        // Ignore draw failure on video unready
      }

      const video = this._videoEl as any;
      if (typeof video?.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback((_now: number, meta: { expectedDisplayTime?: number }) => {
          processFrame(meta.expectedDisplayTime ?? performance.now());
        });
      } else if (typeof requestAnimationFrame === "function") {
        this._animationFrameId = requestAnimationFrame(processFrame);
      }
    };

    const video = this._videoEl as any;
    if (typeof video?.requestVideoFrameCallback === "function") {
      video.requestVideoFrameCallback((_now: number, meta: { expectedDisplayTime?: number }) => {
        processFrame(meta.expectedDisplayTime ?? performance.now());
      });
    } else if (typeof requestAnimationFrame === "function") {
      this._animationFrameId = requestAnimationFrame(processFrame);
    }
  }

  private _startSyntheticLoop(): void {
    let t = Date.now();
    this._timer = setInterval(() => {
      t += 33;
      // Synthetic quiescent baseline plus random noise
      const val1 = 128 + (Math.random() - 0.5) * 2;
      const val2 = 128 + (Math.random() - 0.5) * 2;

      const delta1 = Math.abs(val1 - this._calib1.baseline);
      const delta2 = Math.abs(val2 - this._calib2.baseline);

      this.emitBatch({
        channel: "camera.gate",
        seq: this._seq++,
        t: Float64Array.of(t),
        values: [Float32Array.of(delta1), Float32Array.of(delta2)],
      });
    }, 33);
  }

  override async banish(): Promise<void> {
    if (this._stream) {
      for (const track of this._stream.getTracks()) {
        track.stop();
      }
      this._stream = undefined;
    }
    if (this._videoEl) {
      this._videoEl.srcObject = null;
      this._videoEl = undefined;
    }
    if (this._animationFrameId !== undefined && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = undefined;
    }
    if (this._timer !== undefined) {
      clearInterval(this._timer);
      this._timer = undefined;
    }

    this.setState("banished", "camera photogate closed");
  }
}
