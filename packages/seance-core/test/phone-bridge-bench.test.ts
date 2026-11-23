import { describe, expect, it } from "vitest";
import { FakeRelay } from "../src/transports/phone-bridge/fake-relay.js";
import { HostTransport } from "../src/transports/phone-bridge/host.js";
import { PhoneSpirit } from "../src/transports/phone-bridge/phone-spirit.js";
import { encodeBatch, decodeBatch } from "../src/transports/phone-bridge/protocol.js";
import { ClockSync } from "../src/transports/phone-bridge/clock-sync.js";

describe("phone-bridge latency benchmark", () => {
  it("batch encode→decode round-trip under 1ms for typical payload", () => {
    const channels = {
      accel: {
        t: Float64Array.from({ length: 60 }, (_, i) => i * 16.67),
        values: [
          Float32Array.from({ length: 60 }, () => 9.81 + Math.random() * 0.01),
          Float32Array.from({ length: 60 }, () => Math.random() * 0.01),
          Float32Array.from({ length: 60 }, () => Math.random() * 0.01),
        ],
      },
      gyro: {
        t: Float64Array.from({ length: 60 }, (_, i) => i * 16.67),
        values: [
          Float32Array.from({ length: 60 }, () => Math.random() * 0.1),
          Float32Array.from({ length: 60 }, () => Math.random() * 0.1),
          Float32Array.from({ length: 60 }, () => Math.random() * 0.1),
        ],
      },
    };

    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const encoded = encodeBatch(i, channels);
      decodeBatch(encoded);
    }
    const elapsed = performance.now() - start;
    const perOp = elapsed / iterations;

    expect(perOp).toBeLessThan(1);
  });

  it("FakeRelay routes 1000 batches without dropping", () => {
    const relay = new FakeRelay();
    const hostClient = relay.createClient("host");
    const peerClient = relay.createClient("peer");

    let received = 0;
    const originalSent = hostClient.sent;

    for (let i = 0; i < 1000; i++) {
      const payload = encodeBatch(i, {
        accel: {
          t: Float64Array.of(i * 16.67),
          values: [Float32Array.of(9.81)],
        },
      });
      peerClient.sendToServer({ type: "batch", payload });
    }

    received = originalSent.filter((m) => m.type === "batch").length;
    expect(received).toBe(1000);
  });

  it("clock sync converges within 5ms of true offset after 5 samples", () => {
    const trueOffset = 150;
    const cs = new ClockSync();

    for (let i = 0; i < 5; i++) {
      const rtt = 20 + Math.random() * 10;
      const halfRtt = rtt / 2;
      cs.addSample({
        t0: i * 1000,
        t1: i * 1000 + halfRtt + trueOffset,
        t2: i * 1000 + halfRtt + 5 + trueOffset,
        t3: i * 1000 + rtt + 5,
      });
    }

    expect(cs.isReady).toBe(true);
    expect(Math.abs(cs.estimate!.offsetMs - trueOffset)).toBeLessThan(5);
  });

  it("PhoneSpirit→HostTransport end-to-end via FakeRelay", async () => {
    const relay = new FakeRelay();
    const hostClient = relay.createClient("host");
    const peerClient = relay.createClient("peer");

    const batches: Array<{ peerId: string; seq: number }> = [];
    const host = new HostTransport({
      onBatch: (peerId, decoded) => batches.push({ peerId, seq: decoded.seq }),
    });

    for (const msg of hostClient.sent) {
      host.handleServerMessage(msg);
    }

    const spirit = new PhoneSpirit({
      peerId: peerClient.peerId,
      roomCode: relay.roomCode,
      sendMessage: (msg) => peerClient.sendToServer(msg as any),
    });
    await spirit.summon();

    spirit.sendBatch({
      accel: {
        t: Float64Array.of(0, 16.67, 33.33),
        values: [
          Float32Array.of(9.81, 9.82, 9.80),
          Float32Array.of(0.01, -0.01, 0.02),
          Float32Array.of(0, 0.01, -0.01),
        ],
      },
    });

    for (const msg of hostClient.sent.slice(host.peerCount)) {
      host.handleServerMessage(msg);
    }

    const batchMsgs = hostClient.sent.filter((m) => m.type === "batch");
    for (const msg of batchMsgs) {
      host.handleServerMessage(msg);
    }

    expect(batches.length).toBeGreaterThanOrEqual(1);
    expect(batches[0]!.peerId).toBe(peerClient.peerId);
  });

  it("batch payload size stays under 64KB for 1s of 6-axis 60Hz data", () => {
    const samples = 60;
    const channels = {
      accel: {
        t: Float64Array.from({ length: samples }, (_, i) => i * 16.67),
        values: [
          Float32Array.from({ length: samples }, () => 9.81),
          Float32Array.from({ length: samples }, () => 0),
          Float32Array.from({ length: samples }, () => 0),
        ],
      },
      gyro: {
        t: Float64Array.from({ length: samples }, (_, i) => i * 16.67),
        values: [
          Float32Array.from({ length: samples }, () => 0),
          Float32Array.from({ length: samples }, () => 0),
          Float32Array.from({ length: samples }, () => 0),
        ],
      },
    };

    const encoded = encodeBatch(1, channels);
    const json = JSON.stringify({ type: "batch", payload: encoded });
    const bytes = new TextEncoder().encode(json).byteLength;
    expect(bytes).toBeLessThan(64 * 1024);
  });
});
