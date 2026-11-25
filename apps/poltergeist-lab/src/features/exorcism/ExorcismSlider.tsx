import { useState, useMemo, useEffect } from "react";
import {
  butterworthLowpass,
  sliderToCutoff,
  attenuationAtFreq,
  detectSignalFrequency,
} from "./filter.js";

interface ExorcismSliderProps {
  readonly signal: readonly number[];
  readonly sampleRateHz: number;
  readonly unit: string;
  readonly signalFreqHz?: number;
  readonly fMin?: number;
  readonly fMax?: number;
  readonly onFilterChange?: (filtered: readonly number[]) => void;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function ExorcismSlider({
  signal,
  sampleRateHz,
  unit,
  signalFreqHz: signalFreqProp,
  fMin: fMinProp,
  fMax: fMaxProp,
  onFilterChange,
}: ExorcismSliderProps) {
  const [sliderPos, setSliderPos] = useState(0);
  const reducedMotion = useReducedMotion();

  const nyquist = sampleRateHz / 2;
  const fMax = fMaxProp ?? nyquist * 0.9;
  const fMin = fMinProp ?? 0.5;

  const detectedFreq = useMemo(
    () => signalFreqProp ?? detectSignalFrequency(signal, sampleRateHz),
    [signal, sampleRateHz, signalFreqProp],
  );

  const cutoffHz = useMemo(
    () => sliderToCutoff(sliderPos, fMin, fMax),
    [sliderPos, fMin, fMax],
  );

  const filterResult = useMemo(() => {
    if (sliderPos === 0 || signal.length < 3) return null;
    return butterworthLowpass(signal, sampleRateHz, cutoffHz);
  }, [signal, sampleRateHz, cutoffHz, sliderPos]);

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filterResult ? filterResult.filtered : signal);
    }
  }, [filterResult, signal, onFilterChange]);

  const attenuation = useMemo(() => {
    if (detectedFreq <= 0 || cutoffHz <= 0) return null;
    return attenuationAtFreq(cutoffHz, detectedFreq);
  }, [cutoffHz, detectedFreq]);

  const isEatingSignal = attenuation !== null && cutoffHz < detectedFreq * 2;

  return (
    <div style={{
      padding: "12px 16px",
      background: "rgba(20, 15, 30, 0.6)",
      border: "1px solid #2a2040",
      borderRadius: 8,
      marginTop: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <label
          htmlFor="exorcism-slider"
          style={{ fontSize: 13, color: "#b4a9d6", whiteSpace: "nowrap" }}
        >
          Exorcism
        </label>
        <input
          id="exorcism-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          aria-label={`Noise filter cutoff: ${cutoffHz.toFixed(1)} Hz`}
          style={{ flex: 1, accentColor: "#7755cc" }}
        />
        <span style={{ fontSize: 13, color: "#c9bfe6", fontFamily: "monospace", minWidth: 90 }}>
          {sliderPos === 0 ? "Raw" : `${cutoffHz.toFixed(1)} Hz`}
        </span>
      </div>

      {filterResult && (
        <p style={{ fontSize: 12, color: "#9d8fc4", margin: "4px 0" }}>
          Noise removed: RMS {filterResult.rmsRaw.toFixed(3)} → {filterResult.rmsFiltered.toFixed(3)} {unit}
        </p>
      )}

      {isEatingSignal && attenuation && (
        <div style={{
          padding: "8px 12px",
          background: "rgba(200, 100, 50, 0.1)",
          border: "1px solid rgba(200, 100, 50, 0.25)",
          borderRadius: 6,
          marginTop: 8,
          fontSize: 12,
          color: "#ffe066",
        }}>
          {reducedMotion ? null : (
            <span style={{ marginRight: 6 }}>~</span>
          )}
          <strong>The exorcism is eating the spirit</strong>
          {" — "}Cutoff {cutoffHz.toFixed(1)} Hz is close to motion frequency{" "}
          {detectedFreq.toFixed(1)} Hz: amplitude reduced by{" "}
          {attenuation.amplitudeReductionPct.toFixed(0)}%
          {attenuation.phaseLagMs > 0 && ` (phase lag ${attenuation.phaseLagMs.toFixed(0)} ms)`}.
        </div>
      )}

      <p style={{ fontSize: 11, color: "#76679f", marginTop: 8, fontStyle: "italic" }}>
        Display filter only — Physics Oracle measurement uses calibrated fixed-frequency filter.
      </p>
    </div>
  );
}
