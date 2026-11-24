import { realFftWithRate } from "./fft.js";

export interface NormalizedRoi {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CrossingEvent {
  readonly t: number;
  readonly direction: "enter" | "exit";
  readonly delta: number;
}

export interface BaselineCalibration {
  readonly baseline: number;
  readonly sigma: number;
}

export interface GatePeriodResult {
  readonly periodS: number;
  readonly uncertaintyS: number;
  readonly cycleCount: number;
}

export interface GateSpeedResult {
  readonly speedMPerS: number;
  readonly uncertaintyMPerS: number;
  readonly deltaTS: number;
  readonly timingUncertaintyS: number;
}

export interface GateRpmResult {
  readonly freqHz: number;
  readonly rpm: number;
  readonly isAliased: boolean;
  readonly nyquistHz: number;
  readonly warning?: string;
}

/**
 * Calculates mean intensity in a normalized ROI [0, 1] on a pixel buffer.
 */
export function computeRoiSignal(
  pixels: Uint8ClampedArray | readonly number[],
  imgWidth: number,
  imgHeight: number,
  roi: NormalizedRoi,
): number {
  if (imgWidth <= 0 || imgHeight <= 0 || pixels.length === 0) return 0;

  const startX = Math.max(0, Math.min(imgWidth - 1, Math.floor(roi.x * imgWidth)));
  const startY = Math.max(0, Math.min(imgHeight - 1, Math.floor(roi.y * imgHeight)));
  const endX = Math.max(startX + 1, Math.min(imgWidth, Math.ceil((roi.x + roi.width) * imgWidth)));
  const endY = Math.max(startY + 1, Math.min(imgHeight, Math.ceil((roi.y + roi.height) * imgHeight)));

  let sum = 0;
  let count = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * imgWidth + x) * 4;
      const r = pixels[idx] ?? 0;
      const g = pixels[idx + 1] ?? 0;
      const b = pixels[idx + 2] ?? 0;
      // Standard Rec. 601 luma
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      sum += gray;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Calibrates baseline mean and standard deviation from a quiescent hold-still sample sequence.
 */
export function calibrateBaseline(samples: readonly number[]): BaselineCalibration {
  const n = samples.length;
  if (n === 0) return { baseline: 0, sigma: 1 };
  if (n === 1) return { baseline: samples[0]!, sigma: 1 };

  let sum = 0;
  for (let i = 0; i < n; i++) sum += samples[i]!;
  const baseline = sum / n;

  let varSum = 0;
  for (let i = 0; i < n; i++) {
    const diff = samples[i]! - baseline;
    varSum += diff * diff;
  }
  const sigma = Math.sqrt(varSum / (n - 1));

  return { baseline, sigma: Math.max(0.001, sigma) };
}

/**
 * Theoretical event timing uncertainty lower bound for digital camera sampling.
 * Property 1: sigma_t >= 1 / (fps * sqrt(12))
 */
export function timingUncertaintyS(fps: number, hasFrameCallback = true): number {
  const safeFps = Math.max(1, fps);
  const framePeriodS = 1 / safeFps;
  const quantizationLimit = framePeriodS / Math.sqrt(12);

  if (!hasFrameCallback) {
    return Math.max(quantizationLimit, framePeriodS);
  }
  return Math.max(quantizationLimit, framePeriodS * 0.5);
}

/**
 * Detects threshold crossings with hysteresis and sub-frame linear interpolation.
 */
export function detectCrossings(
  samples: readonly { t: number; v: number }[],
  baseline: number,
  sigma: number,
  k = 3.0,
): CrossingEvent[] {
  if (samples.length < 2) return [];

  const highThresh = k * sigma;
  const lowThresh = (k / 2) * sigma;

  const events: CrossingEvent[] = [];
  let isBeamBlocked = false;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!;
    const curr = samples[i]!;

    const prevDelta = Math.abs(prev.v - baseline);
    const currDelta = Math.abs(curr.v - baseline);

    if (!isBeamBlocked) {
      if (currDelta >= highThresh) {
        // Entering beam (interrupted)
        const dt = curr.t - prev.t;
        const fraction = currDelta !== prevDelta ? (highThresh - prevDelta) / (currDelta - prevDelta) : 0.5;
        const tCross = prev.t + Math.max(0, Math.min(dt, fraction * dt));
        events.push({ t: tCross, direction: "enter", delta: currDelta });
        isBeamBlocked = true;
      }
    } else {
      if (currDelta < lowThresh) {
        // Exiting beam (cleared)
        const dt = curr.t - prev.t;
        const fraction = prevDelta !== currDelta ? (prevDelta - lowThresh) / (prevDelta - currDelta) : 0.5;
        const tCross = prev.t + Math.max(0, Math.min(dt, fraction * dt));
        events.push({ t: tCross, direction: "exit", delta: currDelta });
        isBeamBlocked = false;
      }
    }
  }

  return events;
}

/**
 * Computes pendulum period from successive same-direction crossings.
 * sigma_T = sqrt(2) * sigma_t / N
 */
export function computeGatePeriod(crossings: readonly CrossingEvent[], fps: number): GatePeriodResult {
  const enterCrossings = crossings.filter((e) => e.direction === "enter");
  const N = enterCrossings.length - 1;

  if (N <= 0) {
    return { periodS: 0, uncertaintyS: 0, cycleCount: 0 };
  }

  const firstT = enterCrossings[0]!.t;
  const lastT = enterCrossings[enterCrossings.length - 1]!.t;
  const totalDurationS = (lastT - firstT) / 1000;
  const periodS = totalDurationS / N;

  const sigmaTEvent = timingUncertaintyS(fps, true);
  const uncertaintyS = (Math.sqrt(2) * sigmaTEvent) / N;

  return { periodS, uncertaintyS, cycleCount: N };
}

/**
 * Computes speed across two photogates: v = d / delta_t
 * sigma_v / v = sqrt( (sigma_d / d)^2 + (sigma_dt / delta_t)^2 )
 */
export function computeGateSpeed(
  t1Ms: number,
  t2Ms: number,
  distanceM: number,
  distanceUncertaintyM: number,
  fps: number,
): GateSpeedResult {
  const deltaTS = Math.abs(t2Ms - t1Ms) / 1000;
  const sigmaTEvent = timingUncertaintyS(fps, true);
  const timingUncertaintySVal = Math.sqrt(2) * sigmaTEvent;

  if (deltaTS <= 0 || distanceM <= 0) {
    return {
      speedMPerS: 0,
      uncertaintyMPerS: 0,
      deltaTS: 0,
      timingUncertaintyS: timingUncertaintySVal,
    };
  }

  const speedMPerS = distanceM / deltaTS;
  const relDistErr = distanceUncertaintyM / distanceM;
  const relTimeErr = timingUncertaintySVal / deltaTS;
  const uncertaintyMPerS = speedMPerS * Math.sqrt(relDistErr * relDistErr + relTimeErr * relTimeErr);

  return {
    speedMPerS,
    uncertaintyMPerS,
    deltaTS,
    timingUncertaintyS: timingUncertaintySVal,
  };
}

/**
 * Optical tachometer: calculates RPM and warns on Nyquist aliasing if expected frequency exceeds fps / 2.
 */
export function computeGateRpm(
  signal: readonly number[],
  fs: number,
  blades = 1,
  expectedMaxFreqHz?: number,
): GateRpmResult {
  const nyquistHz = fs / 2;

  if (signal.length < 16 || fs <= 0) {
    return {
      freqHz: 0,
      rpm: 0,
      isAliased: false,
      nyquistHz,
      warning: "Insufficient data for spectral analysis.",
    };
  }

  // Check expected max frequency vs Nyquist limit
  const isAliased = expectedMaxFreqHz !== undefined && expectedMaxFreqHz > nyquistHz;

  // Use realFftWithRate to find dominant peak
  const fftResult = realFftWithRate(signal, fs);
  let maxMag = 0;
  let peakFreq = 0;

  for (let i = 1; i < fftResult.magnitudes.length; i++) {
    const mag = fftResult.magnitudes[i] ?? 0;
    const freq = fftResult.frequencies[i] ?? 0;
    if (mag > maxMag && freq > 0.2) {
      maxMag = mag;
      peakFreq = freq;
    }
  }

  const bladeCount = Math.max(1, blades);
  const mechanicalFreqHz = peakFreq / bladeCount;
  const rpm = mechanicalFreqHz * 60;

  let warning: string | undefined;
  if (isAliased) {
    warning = `Stroboscopic aliasing warning: Expected frequency (${expectedMaxFreqHz?.toFixed(1)} Hz) exceeds the camera Nyquist limit (${nyquistHz.toFixed(1)} Hz). The optical measurement will appear slowed or reversed.`;
  } else if (peakFreq >= nyquistHz * 0.95) {
    warning = `Warning: Peak frequency (${peakFreq.toFixed(1)} Hz) is close to the Nyquist limit (${nyquistHz.toFixed(1)} Hz); measurement uncertainty is elevated.`;
  }

  return {
    freqHz: mechanicalFreqHz,
    rpm,
    isAliased,
    nyquistHz,
    warning,
  };
}
