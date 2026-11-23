import { describe, expect, it } from "vitest";
import { FakeRelay } from "../src/transports/phone-bridge/fake-relay.js";
import { HostTransport } from "../src/transports/phone-bridge/host.js";
import { PhoneSpirit } from "../src/transports/phone-bridge/phone-spirit.js";
import { encodeBatch } from "../src/transports/phone-bridge/protocol.js";
import type { ServerMessage } from "../src/transports/phone-bridge/protocol.js";

describe("HostTransport", () => {
  it("tracks peers joining and leaving", () => {
    const joined: string[] = [];
    const left: string[] = [];
    const host = new HostTransport({
      onPeerJoined: (p) => joined.push(p.peerId),
      onPeerLeft: (id) => left.push(id),
    });

    host.handleServerMessage({ type: "welcome", roomCode: "ABCD", peerId: "host", resumeToken: "" });
    expect(host.roomCode).toBe("ABCD");

    host.handleServerMessage({ type: "peer-joined", peerId: "p1", capabilities: ["accel"] });
    expect(host.peerCount).toBe(1);
    expect(joined).toEqual(["p1"]);

    host.handleServerMessage({ type: "peer-left", peerId: "p1", reason: "disconnect" });
    expect(host.peerCount).toBe(0);
    expect(left).toEqual(["p1"]);
  });

  it("decodes incoming batches", () => {
    const batches: Array<{ peerId: string; seq: number }> = [];
    const host = new HostTransport({
      onBatch: (peerId, decoded) => batches.push({ peerId, seq: decoded.seq }),
    });

    const payload = encodeBatch(42, {
      accel: { t: Float64Array.of(0, 10), values: [Float32Array.of(9.81, 9.82)] },
    });
    host.handleServerMessage({ type: "batch", peerId: "p1", payload });

    expect(batches).toHaveLength(1);
    expect(batches[0]!.peerId).toBe("p1");
    expect(batches[0]!.seq).toBe(42);
  });

  it("fires room-paused event", () => {
    let paused = false;
    const host = new HostTransport({ onRoomPaused: () => { paused = true; } });
    host.handleServerMessage({ type: "room-paused", reason: "Host disconnected" });
    expect(paused).toBe(true);
  });

  it("resets state", () => {
    const host = new HostTransport();
    host.handleServerMessage({ type: "welcome", roomCode: "ABCD", peerId: "host", resumeToken: "" });
    host.handleServerMessage({ type: "peer-joined", peerId: "p1", capabilities: [] });
    host.reset();
    expect(host.peerCount).toBe(0);
    expect(host.roomCode).toBeUndefined();
  });
});

describe("PhoneSpirit", () => {
  it("starts idle and transitions through summon", async () => {
    const messages: unknown[] = [];
    const spirit = new PhoneSpirit({
      peerId: "p1",
      roomCode: "TEST",
      sendMessage: (msg) => messages.push(msg),
    });

    expect(spirit.state).toBe("idle");
    expect(spirit.id).toBe("phone-p1");
    expect(spirit.kind).toBe("poltergeist");
    expect(spirit.transport).toBe("phone-bridge");
    expect(spirit.capabilities.length).toBeGreaterThan(0);

    await spirit.summon();
    expect(spirit.state).toBe("present");
    expect(messages).toHaveLength(1);
    expect((messages[0] as any).type).toBe("ready");
  });

  it("sends batches via sendMessage", async () => {
    const messages: unknown[] = [];
    const spirit = new PhoneSpirit({
      peerId: "p1",
      roomCode: "TEST",
      sendMessage: (msg) => messages.push(msg),
    });
    await spirit.summon();
    messages.length = 0;

    spirit.sendBatch({
      accel: {
        t: Float64Array.of(0, 16.7),
        values: [Float32Array.of(9.81, 9.82)],
      },
    });

    expect(messages).toHaveLength(1);
    expect((messages[0] as any).type).toBe("batch");
    expect((messages[0] as any).payload.seq).toBe(1);
  });

  it("emits batches to local subscribers", async () => {
    const spirit = new PhoneSpirit({
      peerId: "p1",
      roomCode: "TEST",
      sendMessage: () => {},
    });
    await spirit.summon();

    const received: number[] = [];
    const stream = spirit.stream("accel");
    stream.subscribe((batch) => received.push(batch.seq));

    spirit.sendBatch({
      accel: {
        t: Float64Array.of(0),
        values: [Float32Array.of(9.81)],
      },
    });

    expect(received).toEqual([1]);
  });

  it("handles incoming server batch messages", async () => {
    const spirit = new PhoneSpirit({
      peerId: "p1",
      roomCode: "TEST",
      sendMessage: () => {},
    });
    await spirit.summon();

    const received: number[] = [];
    const stream = spirit.stream("gyro");
    stream.subscribe((batch) => received.push(batch.seq));

    const payload = encodeBatch(99, {
      gyro: { t: Float64Array.of(0), values: [Float32Array.of(0.5)] },
    });
    spirit.handleServerMessage({ type: "batch", peerId: "host", payload });

    expect(received).toEqual([99]);
  });

  it("transitions to fading on room-paused", async () => {
    const spirit = new PhoneSpirit({
      peerId: "p1",
      roomCode: "TEST",
      sendMessage: () => {},
    });
    await spirit.summon();
    spirit.handleServerMessage({ type: "room-paused", reason: "Host disconnected" });
    expect(spirit.state).toBe("fading");
  });

  it("banishes cleanly", async () => {
    const spirit = new PhoneSpirit({
      peerId: "p1",
      roomCode: "TEST",
      sendMessage: () => {},
    });
    await spirit.summon();
    await spirit.banish();
    expect(spirit.state).toBe("banished");
  });
});

describe("FakeRelay integration", () => {
  it("routes batches from peer to host", () => {
    const relay = new FakeRelay();
    const hostClient = relay.createClient("host");
    const peerClient = relay.createClient("peer");

    expect(hostClient.sent[0]!.type).toBe("welcome");

    const payload = encodeBatch(1, {
      accel: { t: Float64Array.of(0), values: [Float32Array.of(9.81)] },
    });
    peerClient.sendToServer({ type: "batch", payload });

    const batch = hostClient.sent.find((m) => m.type === "batch");
    expect(batch).toBeDefined();
    expect((batch as any).peerId).toBe(peerClient.peerId);
  });

  it("notifies host when peer joins", () => {
    const relay = new FakeRelay();
    const hostClient = relay.createClient("host");
    relay.createClient("peer");

    const joined = hostClient.sent.find((m) => m.type === "peer-joined");
    expect(joined).toBeDefined();
  });

  it("notifies peers when host disconnects", () => {
    const relay = new FakeRelay();
    const hostClient = relay.createClient("host");
    const peerClient = relay.createClient("peer");

    hostClient.close();

    const paused = peerClient.sent.find((m) => m.type === "room-paused");
    expect(paused).toBeDefined();
  });
});
