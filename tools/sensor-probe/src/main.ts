const DEG_TO_RAD = Math.PI / 180;
const MAX_SAMPLES = 200 * 60; // 200 Hz × 60 s

// ── Preallocated typed arrays for GC-free hot path ──

const buf = {
  idx: 0,
  tPerf: new Float64Array(MAX_SAMPLES),
  tEvent: new Float64Array(MAX_SAMPLES),
  interval: new Float64Array(MAX_SAMPLES),
  ax: new Float64Array(MAX_SAMPLES),
  ay: new Float64Array(MAX_SAMPLES),
  az: new Float64Array(MAX_SAMPLES),
  gax: new Float64Array(MAX_SAMPLES),
  gay: new Float64Array(MAX_SAMPLES),
  gaz: new Float64Array(MAX_SAMPLES),
  ra: new Float64Array(MAX_SAMPLES),
  rb: new Float64Array(MAX_SAMPLES),
  rg: new Float64Array(MAX_SAMPLES),
};

const orientBuf = {
  idx: 0,
  tPerf: new Float64Array(MAX_SAMPLES),
  alpha: new Float64Array(MAX_SAMPLES),
  beta: new Float64Array(MAX_SAMPLES),
  gamma: new Float64Array(MAX_SAMPLES),
  absolute: new Uint8Array(MAX_SAMPLES),
};

// ── DOM refs ──

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const envInfo = $<HTMLDivElement>("env-info");
const statusBar = $<HTMLDivElement>("status-bar");
const btnBegin = $<HTMLButtonElement>("btn-begin");
const wakeLockStatus = $<HTMLSpanElement>("wake-lock-status");
const panelMotion = $<HTMLElement>("panel-motion");
const panelOrientation = $<HTMLElement>("panel-orientation");
const motionHud = $<HTMLDivElement>("motion-hud");
const orientationHud = $<HTMLDivElement>("orientation-hud");
const recordStatus = $<HTMLDivElement>("record-status");
const traceLabelInput = $<HTMLInputElement>("trace-label");

// ── Environment check ──

const isSecure = window.isSecureContext;
envInfo.textContent = [
  `secure: ${isSecure ? "yes" : "NO"}`,
  `ua: ${navigator.userAgent}`,
  `orient: ${screen.orientation?.type ?? "n/a"}`,
  `dpr: ${devicePixelRatio}`,
  `timeOrigin: ${performance.timeOrigin.toFixed(1)}`,
].join(" · ");

if (!isSecure) {
  statusBar.textContent = "Sensors require HTTPS context";
  btnBegin.disabled = true;
}

// ── Wake lock ──

let wakeLockSentinel: WakeLockSentinel | null = null;

async function requestWakeLock(): Promise<void> {
  try {
    wakeLockSentinel = await navigator.wakeLock?.request("screen") ?? null;
    wakeLockStatus.textContent = wakeLockSentinel ? "wake lock: ON" : "wake lock: n/a";
    wakeLockSentinel?.addEventListener("release", () => {
      wakeLockStatus.textContent = "wake lock: released";
    });
  } catch (err) {
    wakeLockStatus.textContent = `wake lock: ${(err as Error).message}`;
  }
}

// ── Motion handler (hot path — no allocations) ──

let motionCount = 0;
let firstMotionT = 0;
let lastHudUpdate = 0;
const HUD_INTERVAL = 200; // ms between HUD refreshes

function onDeviceMotion(e: DeviceMotionEvent): void {
  const now = performance.now();
  const i = buf.idx;
  if (i >= MAX_SAMPLES) return;

  buf.tPerf[i] = now;
  buf.tEvent[i] = e.timeStamp;
  buf.interval[i] = e.interval ?? 0;

  const a = e.acceleration;
  buf.ax[i] = a?.x ?? 0;
  buf.ay[i] = a?.y ?? 0;
  buf.az[i] = a?.z ?? 0;

  const ag = e.accelerationIncludingGravity;
  buf.gax[i] = ag?.x ?? 0;
  buf.gay[i] = ag?.y ?? 0;
  buf.gaz[i] = ag?.z ?? 0;

  const r = e.rotationRate;
  buf.ra[i] = r?.alpha ?? 0;
  buf.rb[i] = r?.beta ?? 0;
  buf.rg[i] = r?.gamma ?? 0;

  buf.idx = i + 1;
  motionCount++;

  if (motionCount === 1) firstMotionT = now;

  if (now - lastHudUpdate > HUD_INTERVAL) {
    lastHudUpdate = now;
    updateMotionHud(now);
  }
}

function updateMotionHud(now: number): void {
  const n = buf.idx;
  if (n < 2) return;

  const elapsed = (now - firstMotionT) / 1000;
  const rate = elapsed > 0 ? (motionCount - 1) / elapsed : 0;

  const intervals: number[] = [];
  const count = Math.min(n, 200);
  for (let j = n - count; j < n - 1; j++) {
    intervals.push(buf.tPerf[j + 1]! - buf.tPerf[j]!);
  }
  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)] ?? 0;

  const last = n - 1;
  motionHud.innerHTML = `<div class="hud-grid">
    <span class="label">events</span><span class="value">${motionCount}</span>
    <span class="label">rate</span><span class="value">${rate.toFixed(1)} Hz</span>
    <span class="label">median dt</span><span class="value">${median.toFixed(2)} ms</span>
    <span class="label">accel</span><span class="value">${fmt(buf.ax[last]!)} ${fmt(buf.ay[last]!)} ${fmt(buf.az[last]!)}</span>
    <span class="label">accelG</span><span class="value">${fmt(buf.gax[last]!)} ${fmt(buf.gay[last]!)} ${fmt(buf.gaz[last]!)}</span>
    <span class="label">rotRate</span><span class="value">${fmt(buf.ra[last]!)} ${fmt(buf.rb[last]!)} ${fmt(buf.rg[last]!)}</span>
    <span class="label">interval</span><span class="value">${buf.interval[last]!.toFixed(1)} ms</span>
  </div>`;
}

function fmt(v: number): string {
  return v.toFixed(3).padStart(8);
}

// ── Orientation handler ──

let orientCount = 0;

function onDeviceOrientation(e: DeviceOrientationEvent): void {
  const now = performance.now();
  const i = orientBuf.idx;
  if (i >= MAX_SAMPLES) return;

  orientBuf.tPerf[i] = now;
  orientBuf.alpha[i] = e.alpha ?? 0;
  orientBuf.beta[i] = e.beta ?? 0;
  orientBuf.gamma[i] = e.gamma ?? 0;
  orientBuf.absolute[i] = e.absolute ? 1 : 0;
  orientBuf.idx = i + 1;
  orientCount++;

  if (orientCount % 20 === 0) {
    orientationHud.innerHTML = `<div class="hud-grid">
      <span class="label">events</span><span class="value">${orientCount}</span>
      <span class="label">alpha</span><span class="value">${(e.alpha ?? 0).toFixed(2)}°</span>
      <span class="label">beta</span><span class="value">${(e.beta ?? 0).toFixed(2)}°</span>
      <span class="label">gamma</span><span class="value">${(e.gamma ?? 0).toFixed(2)}°</span>
      <span class="label">absolute</span><span class="value">${e.absolute ? "yes" : "no"}</span>
    </div>`;
  }
}

// ── Begin button — permission + listeners in a single user gesture ──

btnBegin.addEventListener("click", () => {
  btnBegin.disabled = true;
  const results: string[] = [];

  const motionNeedsPerm =
    typeof DeviceMotionEvent !== "undefined" &&
    typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function";
  const orientNeedsPerm =
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function";

  const permPromises: Promise<void>[] = [];

  if (motionNeedsPerm) {
    permPromises.push(
      (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> })
        .requestPermission()
        .then((state) => { results.push(`motion: ${state}`); })
        .catch((err: unknown) => { results.push(`motion: error (${(err as Error).message})`); })
    );
  } else {
    results.push("motion: not required");
  }

  if (orientNeedsPerm) {
    permPromises.push(
      (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> })
        .requestPermission()
        .then((state) => { results.push(`orientation: ${state}`); })
        .catch((err: unknown) => { results.push(`orientation: error (${(err as Error).message})`); })
    );
  } else {
    results.push("orientation: not required");
  }

  window.addEventListener("devicemotion", onDeviceMotion);
  window.addEventListener("deviceorientation", onDeviceOrientation);

  panelMotion.hidden = false;
  panelOrientation.hidden = false;

  void requestWakeLock();

  setTimeout(() => {
    if (motionCount === 0) {
      statusBar.textContent = "No motion events detected (desktop/unsupported browser)";
    }
  }, 2000);

  Promise.all(permPromises).then(() => {
    statusBar.textContent = results.join(" · ");
  });
});

// ── Recording & .seance v1 export ──

interface RecordingState {
  active: boolean;
  startIdx: number;
  orientStartIdx: number;
  durationMs: number;
  timerId: ReturnType<typeof setTimeout> | null;
}

const recording: RecordingState = {
  active: false,
  startIdx: 0,
  orientStartIdx: 0,
  durationMs: 0,
  timerId: null,
};

function detectPlatform(): "ios" | "android" | "unknown" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "unknown";
}

function startRecording(durationSec: number): void {
  if (recording.active) return;

  recording.active = true;
  recording.startIdx = buf.idx;
  recording.orientStartIdx = orientBuf.idx;
  recording.durationMs = durationSec * 1000;

  panelMotion.classList.add("recording");
  recordStatus.textContent = `Recording ${durationSec}s...`;

  recording.timerId = setTimeout(() => {
    finishRecording();
  }, recording.durationMs);
}

function finishRecording(): void {
  recording.active = false;
  panelMotion.classList.remove("recording");
  recordStatus.textContent = "Processing...";

  if (recording.timerId !== null) {
    clearTimeout(recording.timerId);
    recording.timerId = null;
  }

  const startI = recording.startIdx;
  const endI = buf.idx;
  const n = endI - startI;

  if (n < 2) {
    recordStatus.textContent = "Not enough samples to export.";
    return;
  }

  const tBase = buf.tPerf[startI]!;
  const t = Array.from({ length: n }, (_, j) => +(buf.tPerf[startI + j]! - tBase).toFixed(2));

  const slice = (arr: Float64Array) =>
    Array.from({ length: n }, (_, j) => +(arr[startI + j]!).toFixed(6));

  const sliceConvertDegToRad = (arr: Float64Array) =>
    Array.from({ length: n }, (_, j) => +(arr[startI + j]! * DEG_TO_RAD).toFixed(6));

  const label = traceLabelInput.value.trim() || "unknown";
  const phoneShort = label.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase().slice(0, 20) || "device";
  const now = new Date();
  const isoTs = now.toISOString().replace(/[:.]/g, "-").slice(0, 19) + "Z";

  const trace = {
    format: "seance-trace" as const,
    version: 1 as const,
    id: `${isoTs}_probe-test_${phoneShort}`,
    label,
    createdAt: now.toISOString(),
    experiment: null,
    device: {
      kind: "poltergeist" as const,
      platform: detectPlatform(),
      userAgent: navigator.userAgent,
      model: label,
    },
    clock: null,
    calibration: null,
    inputs: null,
    channels: {
      accel: {
        unit: "m/s^2",
        axes: ["x", "y", "z"],
        t,
        data: [slice(buf.ax), slice(buf.ay), slice(buf.az)],
      },
      accelG: {
        unit: "m/s^2",
        axes: ["x", "y", "z"],
        t,
        data: [slice(buf.gax), slice(buf.gay), slice(buf.gaz)],
      },
      gyro: {
        unit: "rad/s",
        axes: ["x", "y", "z"],
        t,
        data: [
          sliceConvertDegToRad(buf.rb),
          sliceConvertDegToRad(buf.rg),
          sliceConvertDegToRad(buf.ra),
        ],
      },
      orientation: {
        unit: "rad",
        axes: ["alpha", "beta", "gamma"],
        t: buildOrientationT(tBase),
        data: buildOrientationData(),
      },
      rawIntervalMs: {
        unit: "ms",
        axes: ["interval"],
        t,
        data: [slice(buf.interval)],
      },
    },
    expected: null,
    notes: "",
  };

  const json = JSON.stringify(trace, null, 2);
  const filename = `${trace.id}.seance`;

  exportFile(json, filename);
  recordStatus.textContent = `Exported: ${filename} (${n} samples)`;
}

function buildOrientationT(motionTBase: number): number[] {
  const startI = recording.orientStartIdx;
  const endI = orientBuf.idx;
  const n = endI - startI;
  return Array.from({ length: n }, (_, j) =>
    +((orientBuf.tPerf[startI + j]! - motionTBase)).toFixed(2)
  );
}

function buildOrientationData(): number[][] {
  const startI = recording.orientStartIdx;
  const endI = orientBuf.idx;
  const n = endI - startI;
  const toRad = (arr: Float64Array) =>
    Array.from({ length: n }, (_, j) => +(arr[startI + j]! * DEG_TO_RAD).toFixed(6));
  return [toRad(orientBuf.alpha), toRad(orientBuf.beta), toRad(orientBuf.gamma)];
}

function exportFile(json: string, filename: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => downloadBlob(blob, filename));
  } else {
    downloadBlob(blob, filename);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Record buttons
document.querySelectorAll<HTMLButtonElement>("#record-controls button[data-duration]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const dur = parseInt(btn.dataset["duration"] ?? "10", 10);
    startRecording(dur);
  });
});

// ── Microphone Panel ──

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let micStream: MediaStream | null = null;
let oscillator: OscillatorNode | null = null;
let micAnimFrame = 0;

const btnMic = $<HTMLButtonElement>("btn-mic");
const micControls = $<HTMLDivElement>("mic-controls");
const micHud = $<HTMLDivElement>("mic-hud");
const fftSizeSelect = $<HTMLSelectElement>("fft-size");
const btnTone440 = $<HTMLButtonElement>("btn-tone-440");
const btnTone1000 = $<HTMLButtonElement>("btn-tone-1000");
const btnToneStop = $<HTMLButtonElement>("btn-tone-stop");

btnMic.addEventListener("click", async () => {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = parseInt(fftSizeSelect.value, 10);
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);

    micControls.hidden = false;
    btnMic.hidden = true;

    startMicLoop();
  } catch (err) {
    micHud.textContent = `Mic error: ${(err as Error).message}`;
  }
});

fftSizeSelect.addEventListener("change", () => {
  if (analyser) {
    analyser.fftSize = parseInt(fftSizeSelect.value, 10);
  }
});

function startMicLoop(): void {
  if (!analyser || !audioCtx) return;

  const freqData = new Float32Array(analyser.frequencyBinCount);

  function tick() {
    if (!analyser || !audioCtx) return;

    if (freqData.length !== analyser.frequencyBinCount) {
      micAnimFrame = requestAnimationFrame(tick);
      return;
    }

    analyser.getFloatFrequencyData(freqData);

    const sr = audioCtx.sampleRate;
    const fftSize = analyser.fftSize;
    const binWidth = sr / fftSize;

    let maxVal = -Infinity;
    let maxBin = 0;
    for (let i = 1; i < freqData.length; i++) {
      if (freqData[i]! > maxVal) {
        maxVal = freqData[i]!;
        maxBin = i;
      }
    }

    let peakFreq = maxBin * binWidth;
    if (maxBin > 0 && maxBin < freqData.length - 1) {
      const a = freqData[maxBin - 1]!;
      const b = freqData[maxBin]!;
      const c = freqData[maxBin + 1]!;
      const denom = a - 2 * b + c;
      if (denom !== 0) {
        const delta = 0.5 * (a - c) / denom;
        peakFreq = (maxBin + delta) * binWidth;
      }
    }

    micHud.innerHTML = `<div class="hud-grid">
      <span class="label">sampleRate</span><span class="value">${sr} Hz</span>
      <span class="label">fftSize</span><span class="value">${fftSize}</span>
      <span class="label">bin width</span><span class="value">${binWidth.toFixed(2)} Hz</span>
      <span class="label">peak freq</span><span class="value">${peakFreq.toFixed(1)} Hz</span>
      <span class="label">level</span><span class="value">${maxVal.toFixed(1)} dBFS</span>
    </div>`;

    micAnimFrame = requestAnimationFrame(tick);
  }

  micAnimFrame = requestAnimationFrame(tick);
}

function startTone(freq: number): void {
  if (!audioCtx) return;
  stopTone();
  oscillator = audioCtx.createOscillator();
  oscillator.frequency.value = freq;
  oscillator.connect(audioCtx.destination);
  oscillator.start();
  btnToneStop.hidden = false;
}

function stopTone(): void {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
  btnToneStop.hidden = true;
}

btnTone440.addEventListener("click", () => startTone(440));
btnTone1000.addEventListener("click", () => startTone(1000));
btnToneStop.addEventListener("click", () => stopTone());

// ── Webcam Panel ──

const btnCam = $<HTMLButtonElement>("btn-cam");
const camCanvas = $<HTMLCanvasElement>("cam-canvas");
const camHud = $<HTMLDivElement>("cam-hud");
let camStream: MediaStream | null = null;
let camVideo: HTMLVideoElement | null = null;
let camCtx: CanvasRenderingContext2D | null = null;
let trackColor: { h: number; s: number; v: number } | null = null;
let camAnimFrame = 0;
let camFrameCount = 0;
let camFpsStart = 0;

btnCam.addEventListener("click", async () => {
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240 },
    });
    camVideo = document.createElement("video");
    camVideo.srcObject = camStream;
    camVideo.setAttribute("playsinline", "");
    await camVideo.play();

    camCanvas.hidden = false;
    camCtx = camCanvas.getContext("2d", { willReadFrequently: true });
    btnCam.hidden = true;

    camFpsStart = performance.now();
    camFrameCount = 0;

    function drawCam() {
      if (!camCtx || !camVideo) return;
      camCtx.drawImage(camVideo, 0, 0, 320, 240);
      camFrameCount++;

      if (trackColor) {
        processTracking();
      }

      const elapsed = (performance.now() - camFpsStart) / 1000;
      if (elapsed > 0.5) {
        const fps = camFrameCount / elapsed;
        camHud.innerHTML = `<div class="hud-grid">
          <span class="label">fps</span><span class="value">${fps.toFixed(1)}</span>
          <span class="label">tracking</span><span class="value">${trackColor ? "active" : "click a pixel"}</span>
        </div>`;
        camFrameCount = 0;
        camFpsStart = performance.now();
      }

      camAnimFrame = requestAnimationFrame(drawCam);
    }

    camAnimFrame = requestAnimationFrame(drawCam);
  } catch (err) {
    camHud.textContent = `Cam error: ${(err as Error).message}`;
  }
});

camCanvas.addEventListener("click", (e) => {
  if (!camCtx) return;
  const rect = camCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (320 / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (240 / rect.height));
  const pixel = camCtx.getImageData(x, y, 1, 1).data;
  trackColor = rgbToHsv(pixel[0]!, pixel[1]!, pixel[2]!);
});

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function processTracking(): void {
  if (!camCtx || !trackColor) return;
  const imgData = camCtx.getImageData(0, 0, 320, 240);
  const d = imgData.data;
  let cx = 0, cy = 0, count = 0;

  for (let py = 0; py < 240; py++) {
    for (let px = 0; px < 320; px++) {
      const off = (py * 320 + px) * 4;
      const hsv = rgbToHsv(d[off]!, d[off + 1]!, d[off + 2]!);
      const dh = Math.abs(hsv.h - trackColor.h);
      const hDist = Math.min(dh, 360 - dh);
      if (hDist < 25 && Math.abs(hsv.s - trackColor.s) < 0.3 && Math.abs(hsv.v - trackColor.v) < 0.3) {
        cx += px;
        cy += py;
        count++;
      }
    }
  }

  if (count > 10) {
    cx = Math.round(cx / count);
    cy = Math.round(cy / count);
    camCtx.strokeStyle = "#2ecc71";
    camCtx.lineWidth = 2;
    camCtx.beginPath();
    camCtx.arc(cx, cy, 10, 0, 2 * Math.PI);
    camCtx.stroke();
    camCtx.fillStyle = "#2ecc71";
    camCtx.font = "11px monospace";
    camCtx.fillText(`(${cx},${cy}) n=${count}`, cx + 14, cy - 4);
  }
}
