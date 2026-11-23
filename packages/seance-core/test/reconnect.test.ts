import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { ReconnectManager } from "../src/transports/phone-bridge/reconnect.js";

describe("ReconnectManager", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts idle", () => {
    const rm = new ReconnectManager();
    expect(rm.state).toBe("idle");
    expect(rm.attempt).toBe(0);
  });

  it("computes exponential backoff delays", () => {
    const rm = new ReconnectManager({ baseDelayMs: 100, maxDelayMs: 10000, jitterFactor: 0 });
    expect(rm.computeDelay(0)).toBe(100);
    expect(rm.computeDelay(1)).toBe(200);
    expect(rm.computeDelay(2)).toBe(400);
    expect(rm.computeDelay(3)).toBe(800);
  });

  it("caps delay at maxDelayMs", () => {
    const rm = new ReconnectManager({ baseDelayMs: 1000, maxDelayMs: 5000, jitterFactor: 0 });
    expect(rm.computeDelay(10)).toBe(5000);
  });

  it("transitions to exhausted after maxRetries", async () => {
    const states: string[] = [];
    const rm = new ReconnectManager(
      { maxRetries: 2, baseDelayMs: 10, jitterFactor: 0 },
      { onStateChange: (s) => states.push(s) },
    );

    const connectFail = () => Promise.resolve(false);

    rm.scheduleRetry(connectFail);
    expect(rm.state).toBe("backoff");

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);
    await vi.advanceTimersByTimeAsync(50);

    expect(states).toContain("exhausted");
  });

  it("resets attempt on successful connect", async () => {
    let calls = 0;
    const connectOk = () => {
      calls++;
      return Promise.resolve(true);
    };

    const rm = new ReconnectManager({ maxRetries: 5, baseDelayMs: 10, jitterFactor: 0 });
    rm.scheduleRetry(connectOk);

    await vi.advanceTimersByTimeAsync(15);

    expect(rm.state).toBe("connected");
    expect(rm.attempt).toBe(0);
    expect(calls).toBe(1);
  });

  it("reset clears state", () => {
    const rm = new ReconnectManager();
    rm.scheduleRetry(() => Promise.resolve(false));
    rm.reset();
    expect(rm.state).toBe("idle");
    expect(rm.attempt).toBe(0);
  });

  it("onConnected resets attempt", () => {
    const rm = new ReconnectManager();
    (rm as any)._attempt = 3;
    rm.onConnected();
    expect(rm.state).toBe("connected");
    expect(rm.attempt).toBe(0);
  });

  it("property: delay is always non-negative and at most maxDelay + jitter", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 10, max: 10000 }),
        fc.integer({ min: 100, max: 60000 }),
        (attempt, base, max) => {
          const rm = new ReconnectManager({ baseDelayMs: base, maxDelayMs: max, jitterFactor: 0.3 });
          const delay = rm.computeDelay(attempt);
          expect(delay).toBeGreaterThanOrEqual(0);
          expect(delay).toBeLessThanOrEqual(max * 1.3 + 1);
        },
      ),
    );
  });

  it("property: zero jitter means exact exponential", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: 10, max: 1000 }),
        (attempt, base) => {
          const max = 100000;
          const rm = new ReconnectManager({ baseDelayMs: base, maxDelayMs: max, jitterFactor: 0 });
          const expected = Math.min(base * Math.pow(2, attempt), max);
          expect(rm.computeDelay(attempt)).toBe(expected);
        },
      ),
    );
  });
});
