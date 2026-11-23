import { describe, expect, it, vi } from "vitest";
import { TokenBucket, checkFrameSize, MAX_FRAME_BYTES } from "../src/limits.js";

describe("TokenBucket", () => {
  it("allows burst up to capacity", () => {
    const bucket = new TokenBucket({ ratePerSecond: 60, burst: 120 });
    for (let i = 0; i < 120; i++) {
      expect(bucket.consume()).toBe(true);
    }
    expect(bucket.consume()).toBe(false);
  });

  it("refills over time", () => {
    vi.useFakeTimers();
    const bucket = new TokenBucket({ ratePerSecond: 60, burst: 120 });
    for (let i = 0; i < 120; i++) bucket.consume();
    expect(bucket.consume()).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(bucket.consume()).toBe(true);
    vi.useRealTimers();
  });

  it("caps at burst limit", () => {
    vi.useFakeTimers();
    const bucket = new TokenBucket({ ratePerSecond: 60, burst: 10 });
    vi.advanceTimersByTime(10000);
    expect(bucket.tokens).toBeLessThanOrEqual(10);
    vi.useRealTimers();
  });
});

describe("checkFrameSize", () => {
  it("accepts frames under 64KB", () => {
    expect(checkFrameSize("hello")).toBe(true);
  });

  it("rejects frames over 64KB", () => {
    const big = "x".repeat(MAX_FRAME_BYTES + 1);
    expect(checkFrameSize(big)).toBe(false);
  });

  it("checks ArrayBuffer size", () => {
    const buf = new ArrayBuffer(100);
    expect(checkFrameSize(buf)).toBe(true);

    const bigBuf = new ArrayBuffer(MAX_FRAME_BYTES + 1);
    expect(checkFrameSize(bigBuf)).toBe(false);
  });
});
