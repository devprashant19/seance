import { describe, it, expect } from "vitest";
import { TROUBLE_CATALOG, type SpiritTroubleCode } from "../src/components/trouble.js";

describe("TROUBLE_CATALOG", () => {
  it("contains all core permission and failure error codes", () => {
    const requiredCodes: SpiritTroubleCode[] = [
      "insecure-context",
      "motion-denied",
      "motion-gesture-required",
      "motion-silent",
      "in-app-browser",
      "no-sensors",
      "room-not-found",
      "room-full",
      "relay-unreachable-phone",
      "phone-hidden",
      "relay-unreachable-host",
      "relay-dropped",
      "webgl-unavailable",
      "replay-load-failed",
      "analysis-insufficient",
    ];

    for (const code of requiredCodes) {
      const entry = TROUBLE_CATALOG[code];
      expect(entry, `Missing entry for ${code}`).toBeDefined();
      expect(entry.spooky.length).toBeGreaterThan(5);
      expect(entry.plain.length).toBeGreaterThan(10);
      expect(entry.actionLabel.length).toBeGreaterThan(0);
    }
  });

  it("marks replay fallback on user-facing failures", () => {
    expect(TROUBLE_CATALOG["relay-unreachable-host"].replayFallback).toBe(true);
    expect(TROUBLE_CATALOG["motion-denied"].replayFallback).toBe(true);
  });
});

