import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { sensorPassport } from "../src/tools/sensor-passport.js";
import { compareDeviceProfiles } from "../src/tools/compare-device-profiles.js";
import { extractEventWindowTool } from "../src/tools/extract-event-window.js";
import { instructTool } from "../src/tools/instruct.js";
import { writeFileSync, mkdirSync } from "node:fs";

describe("MCP Reality Loop Tools", () => {
  const FIXTURES_DIR = resolve(import.meta.dirname, "../../..", "fixtures/traces/raw");
  const fixtureTracePath = resolve(FIXTURES_DIR, "2026-11-22T10-00-00Z_probe-pendulum_phoneA.seance");
  const tmpDir = resolve(import.meta.dirname, "../../..", "fixtures/passports");

  mkdirSync(tmpDir, { recursive: true });

  it("sensorPassport computes passport stats from a real fixture trace", () => {
    const passport = sensorPassport({ tracePath: fixtureTracePath });
    expect(passport.schemaVersion).toBe("1.0");
    expect(passport.channels["gyro"]).toBeDefined();
    expect(passport.channels["gyro"]!.fsHz).toBeGreaterThan(0);
    expect(passport.channels["gyro"]!.sampleCount).toBeGreaterThan(0);
  });

  it("compareDeviceProfiles evaluates sample against baseline tolerances", () => {
    const passport = sensorPassport({ tracePath: fixtureTracePath });
    const passportPath = resolve(tmpDir, "sample-passport.json");
    const baselinePath = resolve(tmpDir, "baseline-profile.json");

    writeFileSync(passportPath, JSON.stringify(passport, null, 2), "utf-8");

    const baseline = {
      deviceModel: passport.model,
      tolerances: {
        gyro: {
          minFsHz: 10,
          maxJitterCvPercent: 50,
          maxDropouts: 5,
        },
      },
      baselineStats: {
        gyro: {
          fsHz: passport.channels["gyro"]!.fsHz,
          jitterCvPercent: passport.channels["gyro"]!.jitterCvPercent,
          dropoutCount: passport.channels["gyro"]!.dropoutCount,
        },
      },
    };
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), "utf-8");

    const verdict = compareDeviceProfiles({
      samplePassportPath: passportPath,
      baselinePath,
    });
    expect(verdict.verdict).toBe("pass");
    expect(verdict.reasons.length).toBeGreaterThan(0);
  });

  it("extractEventWindowTool slices a 2.0s window and returns regression test template", () => {
    const result = extractEventWindowTool({
      tracePath: fixtureTracePath,
      tMs: 2000,
    });
    expect(result.eventTrace.channels.length).toBeGreaterThan(0);
    expect(result.testTemplate).toContain("Regression Replay");
  });

  it("instructTool validates instruction limits", () => {
    const valid = instructTool({
      spiritId: "peer-abc",
      text: "Lie flat on desk for 3 seconds",
      step: 1,
    });
    expect(valid.success).toBe(true);

    const invalid = instructTool({
      spiritId: "peer-abc",
      text: "a".repeat(250),
    });
    expect(invalid.success).toBe(false);
    expect(invalid.error).toBeDefined();
  });
});
