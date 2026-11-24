import { useEffect, useRef } from "react";
import { downsampleEnvelope } from "./envelope.js";
import type { Mood } from "seance-core";

export interface DrumChannelData {
  readonly id: string;
  readonly name?: string;
  readonly color: string;
  readonly t: readonly number[] | Float64Array;
  readonly v: readonly number[] | Float32Array;
}

export interface SmokedDrumProps {
  readonly channels: readonly DrumChannelData[];
  readonly width?: number;
  readonly height?: number;
  readonly zoomSecondsPerPx?: number; // default 0.02 s/px
  readonly mood?: Mood;
  readonly reducedMotion?: boolean;
}

export function SmokedDrum({
  channels,
  width = 800,
  height = 300,
  zoomSecondsPerPx = 0.02,
  mood = "calm",
  reducedMotion = false,
}: SmokedDrumProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      // 1. Clear background to soot/smoked paper
      const moodTint = mood === "restless" ? "#1e1410" : mood === "uneasy" ? "#181410" : "#120f0d";
      ctx.fillStyle = moodTint;
      ctx.fillRect(0, 0, width, height);

      // 2. Paper grain & faint grid
      ctx.strokeStyle = "rgba(255, 230, 200, 0.06)";
      ctx.lineWidth = 1;

      const pxPerSec = 1 / zoomSecondsPerPx;
      const offset = reducedMotion ? 0 : (performance.now() / 1000 * pxPerSec) % pxPerSec;

      ctx.beginPath();
      for (let x = width - offset; x >= 0; x -= pxPerSec) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // Zero baseline
      ctx.strokeStyle = "rgba(255, 230, 200, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // 3. Render each channel's ink line
      for (const ch of channels) {
        const buckets = downsampleEnvelope(ch.t, ch.v, width, zoomSecondsPerPx);
        if (buckets.length === 0) continue;

        // Auto-scale vertical bounds
        let maxAbs = 1;
        for (const b of buckets) {
          if (Math.abs(b.min) > maxAbs) maxAbs = Math.abs(b.min);
          if (Math.abs(b.max) > maxAbs) maxAbs = Math.abs(b.max);
        }

        const midY = height / 2;
        const scaleY = (height / 2 - 20) / (maxAbs || 1);

        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        let inPath = false;

        for (const b of buckets) {
          if (b.isGap) {
            // Torn paper gap: lift pen
            inPath = false;
            continue;
          }

          const yMin = midY - b.max * scaleY;
          const yMax = midY - b.min * scaleY;

          if (!inPath) {
            ctx.moveTo(b.pixelX, yMin);
            inPath = true;
          } else {
            ctx.lineTo(b.pixelX, yMin);
          }

          if (Math.abs(yMax - yMin) > 1) {
            ctx.lineTo(b.pixelX, yMax);
          }
        }

        ctx.stroke();
      }

      // Legend overlay
      ctx.font = "11px monospace";
      let legendX = 16;
      for (const ch of channels) {
        ctx.fillStyle = ch.color;
        ctx.fillText(`● ${ch.name ?? ch.id}`, legendX, 20);
        legendX += 100;
      }

      if (!reducedMotion && isRunning) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [channels, width, height, zoomSecondsPerPx, mood, reducedMotion]);

  return (
    <div
      style={{
        position: "relative",
        background: "#0a0807",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #332822",
        display: "inline-block",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label="Smoked Drum Seismograph recording sensor oscillations on soot paper"
        style={{ display: "block" }}
      />
    </div>
  );
}
