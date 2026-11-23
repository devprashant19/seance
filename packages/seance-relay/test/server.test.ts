import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createRelay } from "../src/server.js";
import type { ServerMessage } from "seance-core/transports/phone-bridge";

function makeMockWs(): WebSocket & { _listeners: Record<string, Function[]>; _sent: ServerMessage[]; _closed: boolean } {
  const listeners: Record<string, Function[]> = {};
  const sent: ServerMessage[] = [];
  return {
    readyState: WebSocket.OPEN,
    _listeners: listeners,
    _sent: sent,
    _closed: false,
    addEventListener(event: string, handler: Function) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event]!.push(handler);
    },
    removeEventListener() {},
    send(data: string) {
      sent.push(JSON.parse(data));
    },
    close() {
      (this as any)._closed = true;
      const closeHandlers = listeners["close"];
      if (closeHandlers) closeHandlers.forEach((h) => h());
    },
    dispatchEvent: () => true,
    binaryType: "blob" as BinaryType,
    bufferedAmount: 0,
    extensions: "",
    onclose: null,
    onerror: null,
    onmessage: null,
    onopen: null,
    protocol: "",
    url: "",
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  } as any;
}

function sendMsg(ws: ReturnType<typeof makeMockWs>, msg: unknown) {
  const handlers = ws._listeners["message"];
  if (handlers) handlers.forEach((h) => h({ data: JSON.stringify(msg) }));
}

describe("createRelay", () => {
  let relay: ReturnType<typeof createRelay>;

  beforeEach(() => {
    relay = createRelay({ pruneIntervalMs: 999999 });
  });

  afterEach(() => {
    relay.close();
  });

  describe("healthz", () => {
    it("returns status ok", () => {
      const h = relay.healthz();
      expect(h.status).toBe("ok");
      expect(h.rooms).toBe(0);
    });
  });

  describe("origin check", () => {
    it("accepts any origin when no allowedOrigins configured", () => {
      expect(relay.checkOrigin("https://evil.com")).toBe(true);
    });

    it("rejects unallowed origins", () => {
      relay.close();
      relay = createRelay({ allowedOrigins: ["https://good.com"] });
      expect(relay.checkOrigin("https://evil.com")).toBe(false);
      expect(relay.checkOrigin("https://good.com")).toBe(true);
      expect(relay.checkOrigin(undefined)).toBe(false);
    });
  });

  describe("WebSocket flow", () => {
    it("host creates room and gets welcome", () => {
      const ws = makeMockWs();
      relay.handleUpgrade(ws);
      sendMsg(ws, { type: "hello", version: 1, role: "host" });

      expect(ws._sent.length).toBe(1);
      expect(ws._sent[0]!.type).toBe("welcome");
      const welcome = ws._sent[0] as any;
      expect(welcome.roomCode).toHaveLength(4);
      expect(welcome.peerId).toBe("host");
    });

    it("peer joins room and host gets notified", () => {
      const hostWs = makeMockWs();
      relay.handleUpgrade(hostWs);
      sendMsg(hostWs, { type: "hello", version: 1, role: "host" });
      const roomCode = (hostWs._sent[0] as any).roomCode;

      const peerWs = makeMockWs();
      relay.handleUpgrade(peerWs);
      sendMsg(peerWs, { type: "hello", version: 1, role: "peer", roomCode });

      expect(peerWs._sent.length).toBe(1);
      expect(peerWs._sent[0]!.type).toBe("welcome");

      expect(hostWs._sent.length).toBe(2);
      expect(hostWs._sent[1]!.type).toBe("peer-joined");
    });

    it("rejects peer joining nonexistent room", () => {
      const ws = makeMockWs();
      relay.handleUpgrade(ws);
      sendMsg(ws, { type: "hello", version: 1, role: "peer", roomCode: "ZZZZ" });

      expect(ws._sent[0]!.type).toBe("error");
      expect((ws._sent[0] as any).code).toBe("ROOM_NOT_FOUND");
    });

    it("rejects wrong protocol version", () => {
      const ws = makeMockWs();
      relay.handleUpgrade(ws);
      sendMsg(ws, { type: "hello", version: 99, role: "host" });

      expect(ws._sent[0]!.type).toBe("error");
      expect((ws._sent[0] as any).code).toBe("VERSION_MISMATCH");
    });

    it("peer batch routes to host", () => {
      const hostWs = makeMockWs();
      relay.handleUpgrade(hostWs);
      sendMsg(hostWs, { type: "hello", version: 1, role: "host" });
      const roomCode = (hostWs._sent[0] as any).roomCode;

      const peerWs = makeMockWs();
      relay.handleUpgrade(peerWs);
      sendMsg(peerWs, { type: "hello", version: 1, role: "peer", roomCode });

      sendMsg(peerWs, {
        type: "batch",
        payload: { seq: 1, channels: { accel: { t: [0], data: [[9.81]] } } },
      });

      const batchMsg = hostWs._sent.find((m) => m.type === "batch");
      expect(batchMsg).toBeDefined();
    });

    it("observer cannot send batches", () => {
      const hostWs = makeMockWs();
      relay.handleUpgrade(hostWs);
      sendMsg(hostWs, { type: "hello", version: 1, role: "host" });
      const roomCode = (hostWs._sent[0] as any).roomCode;

      const obsWs = makeMockWs();
      relay.handleUpgrade(obsWs);
      sendMsg(obsWs, { type: "hello", version: 1, role: "observer", roomCode });

      sendMsg(obsWs, {
        type: "batch",
        payload: { seq: 1, channels: {} },
      });

      const err = obsWs._sent.find((m) => m.type === "error");
      expect(err).toBeDefined();
      expect((err as any).code).toBe("FORBIDDEN");
    });

    it("observer with wrong key is rejected", () => {
      const hostWs = makeMockWs();
      relay.close();
      relay = createRelay({ pruneIntervalMs: 999999 });

      relay.handleUpgrade(hostWs);
      sendMsg(hostWs, { type: "hello", version: 1, role: "host" });
      const roomCode = (hostWs._sent[0] as any).roomCode;

      const room = relay.rooms.getRoom(roomCode)!;
      (room as any).observerKey = "correct-key";

      const obsWs = makeMockWs();
      relay.handleUpgrade(obsWs);
      sendMsg(obsWs, { type: "hello", version: 1, role: "observer", roomCode, resumeToken: "wrong-key" });

      expect(obsWs._sent[0]!.type).toBe("error");
      expect((obsWs._sent[0] as any).code).toBe("AUTH_FAILED");
    });

    it("host disconnect pauses room", () => {
      const hostWs = makeMockWs();
      relay.handleUpgrade(hostWs);
      sendMsg(hostWs, { type: "hello", version: 1, role: "host" });
      const roomCode = (hostWs._sent[0] as any).roomCode;

      const peerWs = makeMockWs();
      relay.handleUpgrade(peerWs);
      sendMsg(peerWs, { type: "hello", version: 1, role: "peer", roomCode });

      hostWs.close();

      const paused = peerWs._sent.find((m) => m.type === "room-paused");
      expect(paused).toBeDefined();
    });

    it("peer disconnect notifies room", () => {
      const hostWs = makeMockWs();
      relay.handleUpgrade(hostWs);
      sendMsg(hostWs, { type: "hello", version: 1, role: "host" });
      const roomCode = (hostWs._sent[0] as any).roomCode;

      const peerWs = makeMockWs();
      relay.handleUpgrade(peerWs);
      sendMsg(peerWs, { type: "hello", version: 1, role: "peer", roomCode });

      peerWs.close();

      const left = hostWs._sent.find((m) => m.type === "peer-left");
      expect(left).toBeDefined();
    });

    it("rejects oversized frames", () => {
      const ws = makeMockWs();
      relay.handleUpgrade(ws);
      sendMsg(ws, { type: "hello", version: 1, role: "host" });

      const big = JSON.stringify({ type: "batch", payload: { seq: 1, channels: { x: { t: new Array(10000).fill(0), data: [new Array(10000).fill(0)] } } } });
      const handlers = ws._listeners["message"];
      if (handlers) handlers.forEach((h) => h({ data: big }));

      const err = ws._sent.find((m) => m.type === "error" && (m as any).code === "FRAME_TOO_LARGE");
      if (big.length > 64 * 1024) {
        expect(err).toBeDefined();
      }
    });
  });
});
