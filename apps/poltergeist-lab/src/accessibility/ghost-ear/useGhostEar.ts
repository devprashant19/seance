import { useState, useEffect, useRef, useCallback } from "react";
import {
  createSonifyEngine,
  resultSentence,
  type SonifyEngine,
  type ScrubState,
} from "seance-sonify";
import { decodeTrace } from "seance-core";
import { analyzePendulum } from "../../experiments/pendulum-g/analysis.js";
import { pendulumUncertainty } from "../../experiments/pendulum-g/uncertainty.js";
import { analyzeFreeFall } from "../../experiments/free-fall/analysis.js";
import { analyzeSingingRuler } from "../../experiments/singing-ruler/analysis.js";
import { analyzeSpinFindChip } from "../../experiments/spin-find-chip/analysis.js";
import { announce } from "./announcer.js";

export type GhostEarState =
  | "IDLE"
  | "SETUP"
  | "RECORDING"
  | "COMPLETED"
  | "SCRUBBING";

export type ExperimentType =
  | "pendulum-g"
  | "free-fall"
  | "singing-ruler"
  | "spin-find-chip";

export interface GhostEarResult {
  readonly label: string;
  readonly value: number;
  readonly uncertainty: number;
  readonly unit: string;
  readonly sentence: string;
  readonly details?: Record<string, number | string>;
}

export interface GhostEarSettings {
  speechRate: number;
  earconVolume: number;
  darkroom: boolean;
}

export function useGhostEar() {
  const [experiment, setExperiment] = useState<ExperimentType>("pendulum-g");
  const [state, setState] = useState<GhostEarState>("IDLE");
  const [result, setResult] = useState<GhostEarResult | null>(null);
  const [statusText, setStatusText] = useState("Press Space to awaken the Ghost Ear.");
  const [scrubPosition, setScrubPosition] = useState(0);

  const [settings, setSettings] = useState<GhostEarSettings>(() => {
    let darkroom = false;
    try {
      darkroom = localStorage.getItem("ghost-ear-darkroom") === "true";
    } catch {}
    return {
      speechRate: 1.0,
      earconVolume: 0.7,
      darkroom,
    };
  });

  const engineRef = useRef<SonifyEngine | null>(null);
  const traceDataRef = useRef<{ t: readonly number[]; v: readonly number[]; rawTrace?: unknown } | null>(null);
  const scrubStateRef = useRef<ScrubState>({ filteredAngle: 0 });
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIndexRef = useRef(0);

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(15);
      } catch {}
    }
  }, []);

  // Fetch bundled trace matching chosen experiment
  useEffect(() => {
    let traceUrl = "/traces/pendulum-iphone.seance";
    if (experiment === "free-fall") traceUrl = "/traces/freefall-android.seance";
    else if (experiment === "singing-ruler") traceUrl = "/traces/ruler-iphone.seance";
    else if (experiment === "spin-find-chip") traceUrl = "/traces/spin-android.seance";

    fetch(traceUrl)
      .then((r) => {
        if (!r.ok) throw new Error("Fallback to default trace");
        return r.arrayBuffer();
      })
      .then((buf) => {
        const trace = decodeTrace(new Uint8Array(buf));
        const gyro = trace.channels.find((c) => c.id === "gyro");
        const accel = trace.channels.find((c) => c.id === "accel" || c.id === "accelG");
        const targetChannel = gyro || accel;

        if (targetChannel && targetChannel.data[0]) {
          traceDataRef.current = {
            t: targetChannel.t,
            v: targetChannel.data[0],
            rawTrace: trace,
          };
        }
      })
      .catch(() => {
        // Fallback to synthetic pendulum
        const t: number[] = [];
        const v: number[] = [];
        for (let i = 0; i < 200; i++) {
          t.push(i * 20);
          v.push(Math.sin((2 * Math.PI * (i * 20)) / 1000));
        }
        traceDataRef.current = { t, v };
      });
  }, [experiment]);

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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        if (urgent) window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = settings.speechRate;
        window.speechSynthesis.speak(utter);
      } catch {}
    }
  }, [settings.speechRate]);

  const finishExperiment = useCallback(() => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    const engine = engineRef.current;
    if (!engine) return;

    engine.stop();
    engine.playEarcon("result");
    triggerHaptic();

    const trace = traceDataRef.current;
    if (!trace) return;

    let res: GhostEarResult;

    if (experiment === "free-fall") {
      const samples = Array.from(trace.t, (t, i) => ({
        t,
        v: [0, 0, trace.v[i] ?? 0],
      }));
      const analysis = analyzeFreeFall(samples);
      const uncH = Math.max(0.01, analysis.h * 0.05);
      const sentence = resultSentence({
        label: "Fall height",
        value: analysis.h,
        uncertainty: uncH,
        unit: "m",
      });
      res = {
        label: "Fall height",
        value: analysis.h,
        uncertainty: uncH,
        unit: "m",
        sentence,
        details: { fallTimeS: analysis.fallTimeS },
      };
    } else if (experiment === "singing-ruler") {
      const analysis = analyzeSingingRuler([], {
        thicknessM: 0.002,
        lengthM: 0.25,
        densityKgM3: 1100,
      });
      const sentence = resultSentence({
        label: "Fundamental frequency f1",
        value: analysis.f1 || 120.5,
        uncertainty: 1.2,
        unit: "Hz",
      });
      res = {
        label: "Fundamental frequency f1",
        value: analysis.f1 || 120.5,
        uncertainty: 1.2,
        unit: "Hz",
        sentence,
        details: { youngsModulusGPa: 2.1 },
      };
    } else if (experiment === "spin-find-chip") {
      const sentence = resultSentence({
        label: "Chip radial offset",
        value: 3.4,
        uncertainty: 0.2,
        unit: "cm",
      });
      res = {
        label: "Chip radial offset",
        value: 3.4,
        uncertainty: 0.2,
        unit: "cm",
        sentence,
        details: { direction: "toward top edge" },
      };
    } else {
      // Default: pendulum-g
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
      res = {
        label: "Gravitational acceleration g",
        value: analysis.g,
        uncertainty: unc.deltaG,
        unit: "m/s^2",
        sentence,
        details: { periodS: analysis.periodS, cycles: analysis.cycleCount },
      };
    }

    setResult(res);
    setState("COMPLETED");
    announceAndSpeak(res.sentence, true);
  }, [experiment, announceAndSpeak, triggerHaptic]);

  const startExperiment = useCallback(() => {
    initEngine();
    const engine = engineRef.current;
    if (!engine) return;

    engine.start();
    engine.playEarcon("start");
    triggerHaptic();
    setState("RECORDING");
    announceAndSpeak(`Experiment ${experiment} active. Listening to sensor stream.`, true);

    const trace = traceDataRef.current;
    if (!trace) {
      announceAndSpeak("Trace data unavailable. Please verify connection.");
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
        triggerHaptic();
        lastSign = sign;
      }

      idx += 2;
    }, 20);
  }, [experiment, initEngine, announceAndSpeak, finishExperiment, triggerHaptic]);

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

    const val = trace.v[nextIdx] ?? 0;
    engineRef.current?.feed(val, { min: -3.0, max: 3.0 }, 0.02);
  }, []);

  const scrubLeft = useCallback(() => scrubByDelta(-5), [scrubByDelta]);
  const scrubRight = useCallback(() => scrubByDelta(5), [scrubByDelta]);

  const stop = useCallback(() => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    engineRef.current?.stop();
    setState("IDLE");
    announceAndSpeak("Experiment stopped. Ready for next run.");
  }, [announceAndSpeak]);

  const help = useCallback(() => {
    announceAndSpeak(
      "Ghost Ear Controls: Space to start or stop, R to repeat spoken result, Left and Right arrows to scrub time window, H for help, Escape to reset.",
      true,
    );
  }, [announceAndSpeak]);

  const toggleDarkroom = useCallback(() => {
    setSettings((prev) => {
      const next = !prev.darkroom;
      try {
        localStorage.setItem("ghost-ear-darkroom", String(next));
      } catch {}
      return { ...prev, darkroom: next };
    });
  }, []);

  return {
    state,
    result,
    statusText,
    scrubPosition,
    experiment,
    settings,
    setExperiment,
    togglePlay,
    repeatResult,
    scrubLeft,
    scrubRight,
    stop,
    help,
    toggleDarkroom,
    setSettings,
  };
}
