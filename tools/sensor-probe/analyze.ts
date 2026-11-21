#!/usr/bin/env node

/**
 * Ingests a .seance v1 JSON trace and outputs statistical timing metrics,
 * sensor noise/bias, and physics estimates as markdown table rows.
 *
 * Usage: pnpm tsx tools/sensor-probe/analyze.ts <path-to-trace.seance>
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

// ── Types ──

interface SeanceChannel {
  unit: string;
  axes: string[];
  t: number[];
  data: number[][];
}

interface SeanceTrace {
  format: string;
  version: number;
  id: string;
  label: string;
  createdAt: string;
  device: { kind: string; platform: string; userAgent: string; model: string };
  channels: Record<string, SeanceChannel>;
  expected: { quantity: string; value: number; unit: string; tolerance: number } | null;
  notes: string;
}

// ── Helpers ──

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) ** 2;
  return Math.sqrt(s / (arr.length - 1));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

function intervals(t: number[]): number[] {
  const dt: number[] = [];
  for (let i = 0; i < t.length - 1; i++) {
    dt.push(t[i + 1]! - t[i]!);
  }
  return dt;
}

// ── Main analysis ──

function analyzeChannel(ch: SeanceChannel, label: string): void {
  const t = ch.t;
  const n = t.length;
  if (n < 2) {
    console.log(`\n### ${label}: insufficient samples (${n})`);
    return;
  }

  const dt = intervals(t);
  const totalMs = t[n - 1]! - t[0]!;
  const sampleRate = (n - 1) / (totalMs / 1000);
  const dtMean = mean(dt);
  const dtMedian = median(dt);
  const dtP95 = percentile(dt, 95);
  const dtMax = Math.max(...dt);
  const dtStd = std(dt);
  const jitterCv = dtMean > 0 ? (dtStd / dtMean) * 100 : 0;

  const dropoutThreshold = 3 * dtMedian;
  let dropoutCount = 0;
  let dropoutDuration = 0;
  for (const d of dt) {
    if (d > dropoutThreshold) {
      dropoutCount++;
      dropoutDuration += d - dtMedian;
    }
  }

  const duplicates = dt.filter((d) => d === 0).length;

  console.log(`\n### ${label} — Timing`);
  console.log(`| Metric | Value |`);
  console.log(`|---|---|`);
  console.log(`| Samples | ${n} |`);
  console.log(`| Duration | ${(totalMs / 1000).toFixed(2)} s |`);
  console.log(`| Sample rate | ${sampleRate.toFixed(1)} Hz |`);
  console.log(`| Interval mean | ${dtMean.toFixed(3)} ms |`);
  console.log(`| Interval median | ${dtMedian.toFixed(3)} ms |`);
  console.log(`| Interval p95 | ${dtP95.toFixed(3)} ms |`);
  console.log(`| Interval max | ${dtMax.toFixed(3)} ms |`);
  console.log(`| Jitter CV | ${jitterCv.toFixed(2)}% |`);
  console.log(`| Dropouts (>3×median) | ${dropoutCount} (${dropoutDuration.toFixed(1)} ms lost) |`);
  console.log(`| Duplicate timestamps | ${duplicates} |`);

  // Per-axis statistics
  if (ch.data.length > 0 && ch.axes.length > 0) {
    console.log(`\n### ${label} — Per-axis stats`);
    console.log(`| Axis | Mean | Std | Min | Max |`);
    console.log(`|---|---|---|---|---|`);

    for (let a = 0; a < ch.axes.length; a++) {
      const axis = ch.axes[a]!;
      const vals = ch.data[a]!;
      if (!vals || vals.length === 0) continue;
      const m = mean(vals);
      const s = std(vals);
      const mn = Math.min(...vals);
      const mx = Math.max(...vals);
      console.log(`| ${axis} | ${m.toFixed(6)} | ${s.toFixed(6)} | ${mn.toFixed(6)} | ${mx.toFixed(6)} |`);
    }
  }

  // Bias drift for gyro
  if (label.toLowerCase().includes("gyro") && n > 100) {
    const tenSecSamples = Math.min(Math.floor(sampleRate * 10), Math.floor(n / 2));
    if (tenSecSamples > 10) {
      console.log(`\n### ${label} — Bias drift (first vs last ${(tenSecSamples / sampleRate).toFixed(1)}s)`);
      console.log(`| Axis | Mean (first) | Mean (last) | Drift |`);
      console.log(`|---|---|---|---|`);
      for (let a = 0; a < ch.axes.length; a++) {
        const axis = ch.axes[a]!;
        const vals = ch.data[a]!;
        if (!vals) continue;
        const firstSlice = vals.slice(0, tenSecSamples);
        const lastSlice = vals.slice(-tenSecSamples);
        const mFirst = mean(firstSlice);
        const mLast = mean(lastSlice);
        console.log(`| ${axis} | ${mFirst.toFixed(6)} | ${mLast.toFixed(6)} | ${(mFirst - mLast).toFixed(6)} |`);
      }
    }
  }
}

// ── Physics estimators ──

function analyzePendulum(ch: SeanceChannel): void {
  if (!ch || ch.data.length === 0) return;

  // Find dominant axis (highest variance)
  let bestAxis = 0;
  let bestVar = 0;
  for (let a = 0; a < ch.data.length; a++) {
    const v = std(ch.data[a]!);
    if (v > bestVar) {
      bestVar = v;
      bestAxis = a;
    }
  }

  const vals = ch.data[bestAxis]!;
  const t = ch.t;
  const bias = mean(vals);

  // Find zero crossings (after bias subtraction)
  const crossings: number[] = [];
  for (let i = 1; i < vals.length; i++) {
    const prev = vals[i - 1]! - bias;
    const curr = vals[i]! - bias;
    if (prev * curr < 0) {
      // Linear interpolation for precise crossing time
      const frac = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
      const tCross = t[i - 1]! + frac * (t[i]! - t[i - 1]!);
      crossings.push(tCross);
    }
  }

  if (crossings.length < 4) {
    console.log("\n### Pendulum: too few zero crossings");
    return;
  }

  // Period = time between every 2nd crossing (same direction)
  const halfPeriods: number[] = [];
  for (let i = 1; i < crossings.length; i++) {
    halfPeriods.push(crossings[i]! - crossings[i - 1]!);
  }

  const fullPeriods: number[] = [];
  for (let i = 0; i < crossings.length - 2; i += 2) {
    fullPeriods.push(crossings[i + 2]! - crossings[i]!);
  }

  if (fullPeriods.length === 0) {
    console.log("\n### Pendulum: too few full periods");
    return;
  }

  const T = mean(fullPeriods) / 1000; // convert ms to s
  const sigmaT = std(fullPeriods) / 1000 / Math.sqrt(fullPeriods.length);

  console.log(`\n### Pendulum analysis`);
  console.log(`| Metric | Value |`);
  console.log(`|---|---|`);
  console.log(`| Dominant axis | ${ch.axes[bestAxis]} |`);
  console.log(`| Bias | ${bias.toFixed(6)} ${ch.unit} |`);
  console.log(`| Zero crossings | ${crossings.length} |`);
  console.log(`| Full periods measured | ${fullPeriods.length} |`);
  console.log(`| Period T | ${T.toFixed(4)} ± ${sigmaT.toFixed(4)} s |`);
  console.log(`| (For L=0.60m) g estimate | ${((4 * Math.PI * Math.PI * 0.60) / (T * T)).toFixed(3)} m/s² |`);
  console.log(`| (For L=0.65m) g estimate | ${((4 * Math.PI * Math.PI * 0.65) / (T * T)).toFixed(3)} m/s² |`);
}

function analyzeFreeFall(ch: SeanceChannel): void {
  if (!ch || ch.data.length < 3) return;

  const t = ch.t;
  const n = t.length;

  // Compute |accelG| magnitude
  const mag: number[] = [];
  for (let i = 0; i < ch.data[0]!.length; i++) {
    const x = ch.data[0]![i]!;
    const y = ch.data[1]![i]!;
    const z = ch.data[2]![i]!;
    mag.push(Math.sqrt(x * x + y * y + z * z));
  }

  const THRESHOLD = 2.0; // m/s²
  const MIN_DURATION_MS = 100;

  interface FallWindow {
    startMs: number;
    endMs: number;
    durationMs: number;
  }

  const windows: FallWindow[] = [];
  let inFall = false;
  let fallStart = 0;

  for (let i = 0; i < mag.length; i++) {
    if (mag[i]! < THRESHOLD && !inFall) {
      inFall = true;
      fallStart = i;
    } else if ((mag[i]! >= THRESHOLD || i === mag.length - 1) && inFall) {
      inFall = false;
      const startMs = t[fallStart]!;
      const endMs = t[i]!;
      const dur = endMs - startMs;
      if (dur >= MIN_DURATION_MS) {
        // Interpolate edges
        let actualStart = startMs;
        if (fallStart > 0) {
          const prevMag = mag[fallStart - 1]!;
          const currMag = mag[fallStart]!;
          const frac = (THRESHOLD - currMag) / (prevMag - currMag);
          actualStart = t[fallStart]! - frac * (t[fallStart]! - t[fallStart - 1]!);
        }
        let actualEnd = endMs;
        if (i < mag.length) {
          const prevMag = mag[i - 1]!;
          const currMag = mag[i]!;
          const frac = (THRESHOLD - prevMag) / (currMag - prevMag);
          actualEnd = t[i - 1]! + frac * (t[i]! - t[i - 1]!);
        }
        windows.push({
          startMs: actualStart,
          endMs: actualEnd,
          durationMs: actualEnd - actualStart,
        });
      }
    }
  }

  console.log(`\n### Free-fall detection`);
  if (windows.length === 0) {
    console.log("No free-fall windows detected (|accelG| < 2.0 m/s² for > 100 ms)");
    return;
  }

  console.log(`| # | Start (ms) | Duration (ms) | Est. height h=½gt² (cm) |`);
  console.log(`|---|---|---|---|`);
  for (let w = 0; w < windows.length; w++) {
    const win = windows[w]!;
    const tSec = win.durationMs / 1000;
    const h = 0.5 * 9.81 * tSec * tSec * 100; // in cm
    console.log(`| ${w + 1} | ${win.startMs.toFixed(1)} | ${win.durationMs.toFixed(1)} | ${h.toFixed(1)} |`);
  }
}

// ── Entry point ──

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: pnpm tsx tools/sensor-probe/analyze.ts <path-to-trace.seance>");
    console.log("\nReads a .seance v1 JSON trace and prints statistical analysis.");
    process.exit(args.length === 0 ? 1 : 0);
  }

  const filePath = args[0]!;
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    console.error(`Error: cannot read file "${filePath}"`);
    process.exit(1);
  }

  let trace: SeanceTrace;
  try {
    trace = JSON.parse(raw) as SeanceTrace;
  } catch {
    console.error("Error: file is not valid JSON");
    process.exit(1);
  }

  if (trace.format !== "seance-trace" || trace.version !== 1) {
    console.error(`Error: expected format "seance-trace" version 1, got "${trace.format}" v${trace.version}`);
    process.exit(1);
  }

  console.log(`# Trace Analysis: ${basename(filePath)}`);
  console.log(`- **ID:** ${trace.id}`);
  console.log(`- **Label:** ${trace.label}`);
  console.log(`- **Created:** ${trace.createdAt}`);
  console.log(`- **Device:** ${trace.device.model} (${trace.device.platform})`);
  console.log(`- **Channels:** ${Object.keys(trace.channels).join(", ")}`);

  for (const [name, ch] of Object.entries(trace.channels)) {
    analyzeChannel(ch, name);
  }

  // Physics estimators
  if (trace.channels["gyro"]) {
    analyzePendulum(trace.channels["gyro"]);
  }
  if (trace.channels["accelG"]) {
    analyzeFreeFall(trace.channels["accelG"]);
  }

  if (trace.expected) {
    console.log(`\n### Expected reference`);
    console.log(`| Quantity | Value | Unit | Tolerance |`);
    console.log(`|---|---|---|---|`);
    console.log(`| ${trace.expected.quantity} | ${trace.expected.value} | ${trace.expected.unit} | ±${trace.expected.tolerance} |`);
  }
}

main();
