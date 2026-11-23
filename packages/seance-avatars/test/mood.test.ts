import { describe, expect, it } from "vitest";
import { moodVisuals } from "../src/mood/visuals.js";
import { MOOD_COPY } from "../src/mood/copy.js";
import type { Mood } from "seance-core";

const MOOD_ORDER: Mood[] = ["calm", "uneasy", "restless", "fading"];

describe("moodVisuals", () => {
  it("returns valid config for each mood", () => {
    for (const mood of MOOD_ORDER) {
      const v = moodVisuals(mood);
      expect(v.glow).toBeGreaterThanOrEqual(0);
      expect(v.glow).toBeLessThanOrEqual(1);
      expect(v.opacity).toBeGreaterThanOrEqual(0);
      expect(v.opacity).toBeLessThanOrEqual(1);
      expect(v.lanternScale).toBeGreaterThanOrEqual(0.2);
      expect(v.lanternScale).toBeLessThanOrEqual(1);
      expect(v.hue).toBeGreaterThanOrEqual(0);
      expect(v.hue).toBeLessThan(360);
    }
  });

  it("glow decreases monotonically as mood worsens", () => {
    const glows = MOOD_ORDER.map((m) => moodVisuals(m).glow);
    for (let i = 1; i < glows.length; i++) {
      expect(glows[i]!).toBeLessThanOrEqual(glows[i - 1]!);
    }
  });

  it("opacity decreases monotonically as mood worsens", () => {
    const opacities = MOOD_ORDER.map((m) => moodVisuals(m).opacity);
    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]!).toBeLessThanOrEqual(opacities[i - 1]!);
    }
  });

  it("lantern scale clamps to [0.2, 1.0]", () => {
    expect(moodVisuals("calm", 0, 60).lanternScale).toBe(0.2);
    expect(moodVisuals("calm", 60, 60).lanternScale).toBe(1.0);
    expect(moodVisuals("calm", 120, 60).lanternScale).toBe(1.0);
    expect(moodVisuals("calm", 30, 60).lanternScale).toBeCloseTo(0.5);
  });
});

describe("MOOD_COPY", () => {
  it("has entries for all moods", () => {
    for (const mood of MOOD_ORDER) {
      const copy = MOOD_COPY[mood];
      expect(copy.spooky).toBeTruthy();
      expect(copy.plain).toBeTruthy();
      expect(copy.action).toBeTruthy();
    }
  });
});
