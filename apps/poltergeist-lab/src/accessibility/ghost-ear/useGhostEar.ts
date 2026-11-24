import { useState, useEffect, useRef, useCallback } from "react";
import {
  createSonifyEngine,
  resultSentence,
  scrubIndex,
  type SonifyEngine,
  type ScrubState,
} from "seance-sonify";
import { decodeTrace } from "seance-core";
import { analyzePendulum } from "../../experiments/pendulum-g/analysis.js";
import { pendulumUncertainty } from "../../experiments/pendulum-g/uncertainty.js";
import { announce } from "./announcer.js";

export type GhostEarState =
  | "IDLE"
  | "SETUP"
  | "RECORDING"
  | "COMPLETED"
  | "SCRUBBING";

export interface GhostEarResult {
  readonly g: number;
  readonly deltaG: number;
  readonly periodS: number;
  readonly cycleCount: number;
  readonly sentence: string;
}

export function useGhostEar() {
  const [state, setState] = useState<GhostEarState>("IDLE");
  const [result, setResult] = useState<GhostEarResult | null>(null);
  const [statusText, setStatusText] = useState("Press Space to awaken the Ghost Ear.");
  const [scrubPosition, setScrubPosition] = useState(0);

  const engineRef = useRef<SonifyEngine | null>(null);
  const traceDataRef = useRef<{ t: readonly number[]; v: readonly number[] } | null>(null);
  const scrubStateRef = useRef<ScrubState>({ filteredAngle: 0 });
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIndexRef = useRef(0);

  // Initialize or fetch the bundled pendulum trace for replay
  useEffect(() => {
    fetch("/traces/pendulum-iphone.seance")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const trace = decodeTrace(new Uint8Array(buf));
        const gyro = trace.channels.find((c) => c.id === "gyro");
        if (gyro && gyro.data[0]) {
          traceDataRef.current = {
            t: gyro.t,
            v: gyro.data[0],
          };
        }
      })
      .catch(() => {});
  }, []);

  const initEngine = useCallback(() => {
    if (!engineRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      engineRef.current = createSonifyEngine(ctx);
    }
  }, []);

  const announceAndSpeak = useCallback((text: string, urgent = false) => {
    setStatusText(text);
    announce(text);
    engineRef.current?.speak(text, urgent);
  }, []);

  const startExperiment = useCallback(() => {
    initEngine();
    const engine = engineRef.current;
    if (!engine) return;

    engine.start();
    engine.playEarcon("start");
    setState("RECORDING");
    announceAndSpeak("Experiment active. Listen to the pendulum swing.", true);

    const trace = traceDataRef.current;
    if (!trace) {
      announceAndSpeak("Trace data unavailable. Please check bundled traces.");
      return;
    }

    let idx = 0;
    const n = trace.v.length;
    let lastSign = Math.sign(trace.v[0] ?? 0);

    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    playbackTimerRef.current = setInterval(() => {
      if (idx >= n) {
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        finishExperiment();
        return;
      }

      const val = trace.v[idx] ?? 0;
      engine.feed(val, { min: -3.0, max: 3.0 }, 0.05);

      const sign = Math.sign(val);
      if (sign !== 0 && sign !== lastSign && Math.abs(val) > 0.05) {
        engine.playEarcon("zero-crossing");
        lastSign = sign;
      }

      idx += 2;
    }, 20);
  }, [initEngine, announceAndSpeak]);

  const finishExperiment = useCallback(() => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    const engine = engineRef.current;
    if (!engine) return;

    engine.stop();
    engine.playEarcon("result");

    const trace = traceDataRef.current;
    if (!trace) return;

    const samples = Array.from(trace.t, (t, i) => ({
      t,
      v: [trace.v[i] ?? 0, 0, 0],
    }));

    const analysis = analyzePendulum(samples, { lengthM: 1.0, phoneHeightM: 0.15 });
    const deltaT = analysis.periodS > 0
      ? (analysis.periodS / (analysis.cycleCount * 2 || 1)) * 0.02
      : 0.01;
    const unc = pendulumUncertainty(1.0, 0.005, analysis.periodS || 1, deltaT, analysis.g);

    const sentence = resultSentence({
      label: "Gravitational acceleration g",
      value: analysis.g,
      uncertainty: unc.deltaG,
      unit: "m/s^2",
      n: analysis.cycleCount,
    });

    const res: GhostEarResult = {
      g: analysis.g,
      deltaG: unc.deltaG,
      periodS: analysis.periodS,
      cycleCount: analysis.cycleCount,
      sentence,
    };

    setResult(res);
    setState("COMPLETED");
    announceAndSpeak(sentence, true);
  }, [announceAndSpeak]);

  const togglePlay = useCallback(() => {
    if (state === "IDLE" || state === "COMPLETED") {
      startExperiment();
    } else if (state === "RECORDING") {
      finishExperiment();
    }
  }, [state, startExperiment, finishExperiment]);

  const repeatResult = useCallback(() => {
    if (result) {
      announceAndSpeak(result.sentence, true);
    } else {
      announceAndSpeak("No measurement result recorded yet.");
    }
  }, [result, announceAndSpeak]);

  const scrubByDelta = useCallback((delta: number) => {
    const trace = traceDataRef.current;
    if (!trace) return;

    const n = trace.v.length;
    const nextIdx = Math.max(0, Math.min(n - 1, lastIndexRef.current + delta));
    lastIndexRef.current = nextIdx;
    setScrubPosition(nextIdx / n);

    initEngine();
    const engine = engineRef.current;
    if (engine) {
      engine.start();
      const val = trace.v[nextIdx] ?? 0;
      engine.feed(val, { min: -3.0, max: 3.0 }, 0.02);
      if (Math.abs(val) < 0.1) {
        engine.playEarcon("zero-crossing");
      }
    }
  }, [initEngine]);

  const scrubByRoll = useCallback((gamma: number) => {
    const trace = traceDataRef.current;
    if (!trace) return;

    const { index, state: nextState } = scrubIndex(gamma, trace.v.length, scrubStateRef.current);
    scrubStateRef.current = nextState;
    lastIndexRef.current = index;
    setScrubPosition(index / trace.v.length);

    initEngine();
    engineRef.current?.feed(trace.v[index] ?? 0, { min: -3.0, max: 3.0 });
  }, [initEngine]);

  useEffect(() => {
    function onOrientation(e: DeviceOrientationEvent) {
      if (typeof e.gamma === "number") {
        scrubByRoll(e.gamma);
      }
    }
    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      engineRef.current?.dispose();
    };
  }, [scrubByRoll]);

  return {
    state,
    result,
    statusText,
    scrubPosition,
    togglePlay,
    repeatResult,
    scrubLeft: () => scrubByDelta(-10),
    scrubRight: () => scrubByDelta(10),
    stop: () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      engineRef.current?.stop();
      setState("IDLE");
      announceAndSpeak("Experiment stopped.");
    },
    help: () => {
      announceAndSpeak("Keys: Space to start or stop. R to repeat result. Left and Right arrows to scrub. Escape to exit.", true);
    },
  };
}
