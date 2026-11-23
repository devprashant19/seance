import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { traceStats } from "../src/tools/trace-stats.js";
import { listSpirits } from "../src/tools/list-spirits.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "../../..", "fixtures/traces/raw");

describe("trace_stats", () => {
  it("computes timing stats for a pendulum trace", () => {
    const path = resolve(FIXTURES_DIR, "2026-11-22T10-00-00Z_probe-pendulum_phoneA.seance");
    const result = traceStats({ path });

    expect(result.id).toBeTruthy();
    expect(result.channels).toBeGreaterThan(0);
    expect(result.totalSamples).toBeGreaterThan(0);
    expect(result.timing.meanHz).toBeGreaterThan(0);
    expect(typeof result.timing.jitterCv).toBe("number");
    expect(typeof result.timing.dropouts).toBe("number");
  });

  it("throws for invalid trace path", () => {
    expect(() => traceStats({ path: "/nonexistent/trace.seance" })).toThrow();
  });
});

describe("list_spirits", () => {
  it("returns offline mode when relay is unreachable", async () => {
    const original = process.env["SEANCE_RELAY_URL"];
    process.env["SEANCE_RELAY_URL"] = "ws://127.0.0.1:19999";

    try {
      const result = await listSpirits();
      expect(result.mode).toBe("offline");
      expect(result.spirits).toEqual([]);
    } finally {
      if (original !== undefined) {
        process.env["SEANCE_RELAY_URL"] = original;
      } else {
        delete process.env["SEANCE_RELAY_URL"];
      }
    }
  });
});
