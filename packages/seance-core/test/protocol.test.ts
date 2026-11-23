import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  PROTOCOL_VERSION,
  encodeBatch,
  decodeBatch,
  isClientMessage,
  isServerMessage,
  validateProtocolMessage,
} from "../src/transports/phone-bridge/protocol.js";

describe("protocol constants", () => {
  it("has version 1", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});

describe("type guards", () => {
  it("identifies client messages", () => {
    expect(isClientMessage({ type: "hello", version: 1, role: "peer" })).toBe(true);
    expect(isClientMessage({ type: "ready", capabilities: ["accel"] })).toBe(true);
    expect(isClientMessage({ type: "batch", payload: {} })).toBe(true);
    expect(isClientMessage({ type: "peer-hidden" })).toBe(true);
    expect(isClientMessage({ type: "peer-visible" })).toBe(true);
    expect(isClientMessage({ type: "sync-reply", t0: 0, t1: 1, t2: 2, t3: 3 })).toBe(true);
  });

  it("identifies server messages", () => {
    expect(isServerMessage({ type: "welcome", roomCode: "ABCD", peerId: "p1", resumeToken: "tok" })).toBe(true);
    expect(isServerMessage({ type: "peer-joined", peerId: "p1", capabilities: [] })).toBe(true);
    expect(isServerMessage({ type: "peer-left", peerId: "p1", reason: "disconnect" })).toBe(true);
    expect(isServerMessage({ type: "sync", t0: 100 })).toBe(true);
    expect(isServerMessage({ type: "error", code: "RATE_LIMIT", message: "slow down" })).toBe(true);
    expect(isServerMessage({ type: "room-paused", reason: "host disconnected" })).toBe(true);
  });

  it("rejects non-messages", () => {
    expect(validateProtocolMessage(null)).toBe(false);
    expect(validateProtocolMessage("string")).toBe(false);
    expect(validateProtocolMessage({ type: "unknown" })).toBe(false);
    expect(validateProtocolMessage({})).toBe(false);
  });
});

describe("batch encode/decode", () => {
  it("round-trips a single-channel batch", () => {
    const t = Float64Array.of(0, 10, 20);
    const values = [Float32Array.of(1, 2, 3), Float32Array.of(4, 5, 6), Float32Array.of(7, 8, 9)];
    const encoded = encodeBatch(42, { accel: { t, values } });

    expect(encoded.seq).toBe(42);
    expect(encoded.channels.accel).toBeDefined();
    expect(encoded.channels.accel!.t).toEqual([0, 10, 20]);

    const decoded = decodeBatch(encoded);
    expect(decoded.seq).toBe(42);
    expect(decoded.channels.accel!.t.length).toBe(3);
    expect(decoded.channels.accel!.values.length).toBe(3);

    for (let a = 0; a < 3; a++) {
      for (let i = 0; i < 3; i++) {
        expect(decoded.channels.accel!.values[a]![i]).toBeCloseTo(values[a]![i]!);
      }
    }
  });

  it("round-trips multi-channel batches", () => {
    const encoded = encodeBatch(1, {
      accel: { t: Float64Array.of(0, 16.7), values: [Float32Array.of(9.81, 9.82)] },
      gyro: { t: Float64Array.of(0, 16.7), values: [Float32Array.of(0.01, 0.02)] },
    });

    const decoded = decodeBatch(encoded);
    expect(Object.keys(decoded.channels).length).toBe(2);
    expect(decoded.channels.accel!.t.length).toBe(2);
    expect(decoded.channels.gyro!.values[0]![0]).toBeCloseTo(0.01);
  });

  it("property: encode→decode preserves values", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.array(
          fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
          { minLength: 1, maxLength: 20 },
        ),
        (seq, data) => {
          const t = Float64Array.from(data.map((_, i) => i * 10));
          const vals = [Float32Array.from(data)];
          const encoded = encodeBatch(seq, { test: { t, values: vals } });
          const decoded = decodeBatch(encoded);
          expect(decoded.seq).toBe(seq);
          expect(decoded.channels.test!.t.length).toBe(data.length);
          for (let i = 0; i < data.length; i++) {
            expect(decoded.channels.test!.values[0]![i]).toBeCloseTo(data[i]!, 4);
          }
        },
      ),
    );
  });
});
