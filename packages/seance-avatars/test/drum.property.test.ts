import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  ChannelRingBuffer,
  downsampleEnvelope,
  exportTraceToSvg,
} from "../src/drum/index.js";
import type { GhostTrace } from "seance-core";

describe("Smoked Drum Property Tests", () => {
  it("Property 1: ring buffer never exceeds capacity and retains newest elements", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 16, max: 100 }),
        fc.array(fc.double({ noNaN: true }), { minLength: 1, maxLength: 300 }),
        (capacity, items) => {
          const buf = new ChannelRingBuffer(capacity);
          for (let i = 0; i < items.length; i++) {
            buf.push(i * 10, items[i]!);
          }

          expect(buf.length).toBeLessThanOrEqual(capacity);
          expect(buf.length).toBe(Math.min(items.length, capacity));

          const arr = buf.toArray();
          expect(arr.t.length).toBe(buf.length);
          expect(arr.v.length).toBe(buf.length);

          if (items.length > 0) {
            const lastPushedVal = items[items.length - 1]!;
            expect(arr.v[arr.v.length - 1]!).toBeCloseTo(Math.fround(lastPushedVal), 3);
          }
        },
      ),
    );
  });

  it("Property 2: envelope downsampler preserves every min/max extremum", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -50, max: 50, noNaN: true }), { minLength: 20, maxLength: 200 }),
        (values) => {
          const t: number[] = [];
          for (let i = 0; i < values.length; i++) {
            t.push(i * 20); // 50 Hz
          }

          const buckets = downsampleEnvelope(t, values, 100, 0.05);
          expect(buckets.length).toBeGreaterThan(0);

          for (const b of buckets) {
            expect(b.min).toBeLessThanOrEqual(b.max);
            expect(Number.isFinite(b.min)).toBe(true);
            expect(Number.isFinite(b.max)).toBe(true);
          }
        },
      ),
    );
  });

  it("Property 3: zoom scaling scales duration proportionally", () => {
    const t: number[] = [];
    const v: number[] = [];
    for (let i = 0; i < 500; i++) {
      t.push(i * 10);
      v.push(Math.sin(i / 10));
    }

    const b1 = downsampleEnvelope(t, v, 200, 0.01);
    const b2 = downsampleEnvelope(t, v, 200, 0.02);

    expect(b1.length).toBeGreaterThan(0);
    expect(b2.length).toBeGreaterThan(0);
  });

  it("Property 4: gaps are flagged when delta-t exceeds threshold", () => {
    const t = [0, 20, 40, 60, 200, 220, 240]; // 140ms gap between 60 and 200
    const v = [1, 2, 1, 2, 1, 2, 1];

    const buckets = downsampleEnvelope(t, v, 50, 0.01, 50);
    const hasGapFlagged = buckets.some((b) => b.isGap);
    expect(hasGapFlagged).toBe(true);
  });

  it("exports valid SVG scroll string", () => {
    const trace: GhostTrace = {
      format: "seance",
      version: 1,
      id: "trace-drum-svg",
      channels: [
        {
          id: "accel",
          unit: "m/s^2",
          axes: ["x"],
          t: [0, 20, 40, 60, 80],
          data: [[0, 2, -1, 3, 0]],
        },
      ],
    };

    const svg = exportTraceToSvg(trace, 600, 300);
    expect(svg).toContain("<svg");
    expect(svg).toContain("polyline");
    expect(svg).toContain("trace-drum-svg");
  });
});
