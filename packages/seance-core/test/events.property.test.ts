import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  detectEnergyEvents,
  extractEventWindow,
  generateReplayRegressionTestCode,
} from "../src/events/index.js";
import { validateInstruct } from "../src/transports/phone-bridge/protocol.js";
import type { GhostTrace } from "../src/trace.js";

describe("Events & Instruct Property Tests", () => {
  it("Property 5: instruct message validation rejects > 200 chars or missing fields", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 201, maxLength: 500 }), (longText) => {
        const res = validateInstruct({
          type: "instruct",
          to: "spirit-1",
          text: longText,
        });
        expect(res.valid).toBe(false);
        expect(res.reason).toContain("exceeds 200 character limit");
      }),
    );

    expect(validateInstruct({ type: "instruct", to: "", text: "hi" }).valid).toBe(false);
    expect(validateInstruct({ type: "other", to: "p", text: "hi" }).valid).toBe(false);
    expect(validateInstruct(null).valid).toBe(false);
    expect(validateInstruct({ type: "instruct", to: "peer-1", text: "Hello phone" }).valid).toBe(true);
  });

  it("Property 6: deterministic event triggering on identical replay", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -10, max: 10, noNaN: true }), { minLength: 50, maxLength: 200 }),
        (data) => {
          const t: number[] = [];
          for (let i = 0; i < data.length; i++) {
            t.push(i * 20); // 50 Hz
          }
          // Inject a strong transient pulse
          const pulseIdx = Math.floor(data.length / 2);
          data[pulseIdx] = 50.0;
          data[pulseIdx + 1] = 50.0;

          const events1 = detectEnergyEvents(t, data);
          const events2 = detectEnergyEvents(t, data);

          expect(events1.length).toBe(events2.length);
          for (let i = 0; i < events1.length; i++) {
            expect(events1[i]!.sampleIndex).toBe(events2[i]!.sampleIndex);
            expect(events1[i]!.tMs).toBe(events2[i]!.tMs);
          }
        },
      ),
    );
  });

  it("Property 7: extracted event window has constant duration within inner bounds", () => {
    const t: number[] = [];
    const vals: number[] = [];
    for (let i = 0; i < 200; i++) {
      t.push(i * 20); // 0 to 4000 ms
      vals.push(0);
    }

    const trace: GhostTrace = {
      format: "seance",
      version: 1,
      id: "trace-win",
      channels: [
        {
          id: "accel",
          unit: "m/s^2",
          axes: ["x"],
          t,
          data: [vals],
        },
      ],
    };

    const triggerMs = 2000;
    const windowed = extractEventWindow(trace, triggerMs, { preMs: 500, postMs: 1500 });
    expect(windowed.channels.length).toBe(1);
    expect(windowed.durationMs).toBe(2000); // 1500 - (-500) = 2000 ms
  });

  it("generates faithful regression test code without loosening tolerance", () => {
    const code = generateReplayRegressionTestCode("fixtures/events/drop.seance", "peak-accel", 9.81, 0.05);
    expect(code).toContain("tolerance bound == 0.05");
    expect(code).toContain("9.81");
    expect(code).toContain("vitest");
  });
});
