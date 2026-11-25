import { it, expect } from "vitest";
import { motionSample, buildPhoneChannels, encodeBatch, decodeBatch, toTimeSamples } from "seance-core/transports/phone-bridge";
import { analyzeSpinFindChip } from "../src/experiments/spin-find-chip/analysis.js";
import { totalAccel } from "../src/experiments/spin-find-chip/theory.js";

it("spin: a sudden (flick) start through the real phone pipeline still finds the sensor exactly", () => {
  const rx = 0.012, ry = -0.025, D = 180 / Math.PI;
  const gyro: { t: number; v: number[] }[] = [], accel: { t: number; v: number[] }[] = [];
  let motion: ReturnType<typeof motionSample>[] = [];
  for (let i = 0; i < 600; i++) {
    const t = i / 60, ts = t - 0.5, w = ts < 0 ? 0 : 9.4 * Math.exp(-ts / 10), a = ts < 0 ? 0 : -w / 10;
    const [ax, ay] = totalAccel(w, a, rx, ry);
    motion.push(motionSample(t * 1000, { x: ax, y: ay, z: 9.81 }, { x: ax, y: ay, z: 0 }, { alpha: w * D, beta: 0, gamma: 0 }));
    if (motion.length === 3) {
      const dec = decodeBatch(encodeBatch(i, buildPhoneChannels(motion, [])));
      gyro.push(...(toTimeSamples(dec.channels["gyro"]!) as any));
      accel.push(...(toTimeSamples(dec.channels["accelG"]!) as any));
      motion = [];
    }
  }
  const r = analyzeSpinFindChip(gyro, accel, 0.071, 0.147);
  expect(r.rx * 1000).toBeCloseTo(12, 0);
  expect(r.ry * 1000).toBeCloseTo(-25, 0);
  expect(Math.abs(r.distance - Math.hypot(rx, ry)) * 1000).toBeLessThan(0.3);
});
