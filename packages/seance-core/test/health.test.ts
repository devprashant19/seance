import { describe, expect, it } from "vitest";
import { MoodMachine, HealthMonitor, DEFAULT_THRESHOLDS } from "../src/health.js";

describe("MoodMachine", () => {
  it("starts calm", () => {
    const mm = new MoodMachine();
    expect(mm.mood).toBe("calm");
  });

  it("worsens immediately to uneasy on jitter alone", () => {
    const mm = new MoodMachine();
    mm.evaluate({ rateHz: 100, jitterPct: 20, dropoutsInWindow: 0 }, 1000);
    expect(mm.mood).toBe("uneasy");
  });

  it("worsens to restless on low rate (score +2)", () => {
    const mm = new MoodMachine();
    mm.evaluate({ rateHz: 10, jitterPct: 5, dropoutsInWindow: 0 }, 1000);
    expect(mm.mood).toBe("restless");
  });

  it("escalates to fading with all issues", () => {
    const mm = new MoodMachine();
    mm.evaluate({ rateHz: 10, jitterPct: 20, dropoutsInWindow: 10 }, 1000);
    expect(mm.mood).toBe("fading");
  });

  it("does NOT improve before minMoodHoldMs", () => {
    const mm = new MoodMachine({ minMoodHoldMs: 3000 });
    mm.evaluate({ rateHz: 100, jitterPct: 20, dropoutsInWindow: 0 }, 1000);
    expect(mm.mood).toBe("uneasy");

    mm.evaluate({ rateHz: 100, jitterPct: 2, dropoutsInWindow: 0 }, 2000);
    expect(mm.mood).toBe("uneasy");
  });

  it("improves after minMoodHoldMs elapses", () => {
    const mm = new MoodMachine({ minMoodHoldMs: 3000 });
    mm.evaluate({ rateHz: 100, jitterPct: 20, dropoutsInWindow: 0 }, 1000);
    expect(mm.mood).toBe("uneasy");

    mm.evaluate({ rateHz: 100, jitterPct: 2, dropoutsInWindow: 0 }, 5000);
    expect(mm.mood).toBe("calm");
  });

  it("reset returns to calm", () => {
    const mm = new MoodMachine();
    mm.evaluate({ rateHz: 5, jitterPct: 50, dropoutsInWindow: 20 }, 1000);
    expect(mm.mood).toBe("fading");
    mm.reset();
    expect(mm.mood).toBe("calm");
  });
});

describe("HealthMonitor", () => {
  it("reports calm with good metrics", () => {
    const hm = new HealthMonitor();
    const report = hm.update(100, 3, 1000);
    expect(report.mood).toBe("calm");
    expect(report.calibrated).toBe(true);
    expect(report.reason).toBe("Signal nominal");
  });

  it("tracks dropouts within window", () => {
    const hm = new HealthMonitor();
    hm.recordDropout(1000);
    hm.recordDropout(2000);
    hm.recordDropout(3000);
    const report = hm.update(100, 3, 4000);
    expect(report.dropouts).toBe(3);
  });

  it("prunes dropouts outside the 60s window", () => {
    const hm = new HealthMonitor();
    hm.recordDropout(1000);
    hm.recordDropout(2000);
    const report = hm.update(100, 3, 70_000);
    expect(report.dropouts).toBe(0);
  });

  it("integrates mood with dropout count", () => {
    const hm = new HealthMonitor();
    for (let i = 0; i < 10; i++) {
      hm.recordDropout(1000 + i * 100);
    }
    const report = hm.update(10, 20, 2000);
    expect(report.mood).toBe("fading");
  });

  it("reset clears state", () => {
    const hm = new HealthMonitor();
    hm.recordDropout(1000);
    hm.update(10, 20, 2000);
    hm.reset();
    expect(hm.mood).toBe("calm");
  });
});

describe("DEFAULT_THRESHOLDS", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_THRESHOLDS.maxJitterPct).toBe(15);
    expect(DEFAULT_THRESHOLDS.minRateHz).toBe(30);
    expect(DEFAULT_THRESHOLDS.maxDropoutsPerMin).toBe(5);
    expect(DEFAULT_THRESHOLDS.minMoodHoldMs).toBe(3000);
  });
});
