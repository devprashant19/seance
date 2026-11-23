import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateTrace, decodeTrace } from "../src/trace.js";
import { createReplaySpirit } from "../src/transports/replay.js";
import { linearResample } from "../src/dsp/resample.js";
import { detectZeroCrossings } from "../src/dsp/events.js";
import type { SampleBatch } from "../src/spirit.js";

const FIXTURES_DIR = join(__dirname, "../../../fixtures/traces/raw");

function loadFixture(filename: string): unknown {
  const raw = readFileSync(join(FIXTURES_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

describe("fixture decode", () => {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".seance"));

  it("has 10 fixture files", () => {
    expect(files.length).toBe(10);
  });

  for (const file of files) {
    it(`validates ${file}`, () => {
      const raw = loadFixture(file);
      expect(validateTrace(raw)).toBe(true);
    });

    it(`decodes ${file} without error`, () => {
      const raw = loadFixture(file);
      const trace = decodeTrace(raw);
      expect(trace.format).toMatch(/^seance/);
      expect(trace.version).toBe(1);
      expect(trace.id).toBeTruthy();
      expect(trace.channels.length).toBeGreaterThan(0);
    });
  }
});

describe("pendulum replay integration", () => {
  it("reproduces period T ≈ 1.58s and g ≈ 9.8 m/s² from gyro zero-crossings", async () => {
    const raw = loadFixture(
      "2026-11-22T10-00-00Z_probe-pendulum_phoneA.seance",
    );
    const trace = decodeTrace(raw);

    const replay = createReplaySpirit(trace, { clock: "manual" });
    await replay.summon();

    const gyroBatches: SampleBatch[] = [];
    const stream = replay.stream("gyro");
    stream.subscribe((b) => gyroBatches.push(b));

    replay.advance(10000);

    const allT: number[] = [];
    const allGyroX: number[] = [];
    for (const batch of gyroBatches) {
      for (let i = 0; i < batch.t.length; i++) {
        allT.push(batch.t[i]!);
        allGyroX.push(batch.values[0]![i]!);
      }
    }

    expect(allT.length).toBeGreaterThan(100);

    const { t: uniformT, values: uniformV } = linearResample(
      allT,
      allGyroX,
      50,
    );

    expect(uniformT.length).toBeGreaterThan(100);

    const crossings = detectZeroCrossings(uniformV, uniformT, 0.05);

    expect(crossings.length).toBeGreaterThan(10);

    const halfPeriods: number[] = [];
    for (let i = 1; i < crossings.length; i++) {
      halfPeriods.push(crossings[i]!.tMs - crossings[i - 1]!.tMs);
    }

    const medianHalf = [...halfPeriods]
      .sort((a, b) => a - b)[Math.floor(halfPeriods.length / 2)]!;
    const T = (medianHalf * 2) / 1000;

    const expectedT = 1.58;
    const tolerance = 0.02;
    expect(T).toBeGreaterThan(expectedT - tolerance);
    expect(T).toBeLessThan(expectedT + tolerance);

    const L = 0.62;
    const g = (4 * Math.PI ** 2 * L) / T ** 2;

    expect(g).toBeGreaterThan(9.0);
    expect(g).toBeLessThan(10.5);

    await replay.banish();
  });
});
