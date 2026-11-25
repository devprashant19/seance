import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { createRelay } from "../src/server.js";
import {
  encodeBatch,
  decodeBatch,
  PROTOCOL_VERSION,
  type ServerMessage,
} from "seance-core/transports/phone-bridge";

describe("Join Standalone Phone Bridge E2E Test", () => {
  let server: Server;
  let wss: WebSocketServer;
  let relay: ReturnType<typeof createRelay>;
  let relayUrl: string;

  beforeAll(async () => {
    relay = createRelay({ pruneIntervalMs: 60000 });
    server = createServer((_req, res) => {
      res.writeHead(200);
      res.end("OK");
    });

    wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        relay.handleUpgrade(ws as unknown as globalThis.WebSocket);
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (typeof addr === "object" && addr !== null) {
          relayUrl = `ws://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    relay.close();
    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("completes full handshake, ready capabilities, sync exchange, and batch gyro decoding", async () => {
    const hostWs = new WebSocket(relayUrl);
    const hostMessages: ServerMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      hostWs.on("open", () => resolve());
      hostWs.on("error", reject);
    });

    hostWs.on("message", (data) => {
      hostMessages.push(JSON.parse(data.toString()));
    });

    // 1. Host sends hello
    hostWs.send(
      JSON.stringify({
        type: "hello",
        version: PROTOCOL_VERSION,
        role: "host",
      }),
    );

    // Wait for host welcome
    await vi.waitFor(() => {
      expect(hostMessages.some((m) => m.type === "welcome")).toBe(true);
    });

    const welcomeMsg = hostMessages.find((m) => m.type === "welcome") as {
      roomCode: string;
      peerId: string;
    };
    const roomCode = welcomeMsg.roomCode;
    expect(roomCode).toBeDefined();

    // 2. Simulated join-standalone phone client connects
    const phoneWs = new WebSocket(relayUrl);
    const phoneMessages: ServerMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      phoneWs.on("open", () => resolve());
      phoneWs.on("error", reject);
    });

    phoneWs.on("message", (data) => {
      phoneMessages.push(JSON.parse(data.toString()));
    });

    // Phone sends hello
    phoneWs.send(
      JSON.stringify({
        type: "hello",
        version: PROTOCOL_VERSION,
        role: "peer",
        roomCode,
      }),
    );

    // Wait for phone welcome
    await vi.waitFor(() => {
      expect(phoneMessages.some((m) => m.type === "welcome")).toBe(true);
    });

    // 3. On welcome, phone sends "ready" with capabilities as specified in join-standalone.ts
    phoneWs.send(
      JSON.stringify({
        type: "ready",
        capabilities: ["accelG", "accel", "gyro", "orientation"],
      }),
    );

    // Host receives peer-joined with capabilities
    await vi.waitFor(() => {
      const joined = hostMessages.find(
        (m) =>
          m.type === "peer-joined" &&
          m.capabilities?.includes("gyro") &&
          m.capabilities?.includes("accelG"),
      );
      expect(joined).toBeDefined();
    });

    // 4. Test sync exchange: host or test sends sync probe to phone
    phoneWs.send(
      JSON.stringify({
        type: "sync-reply",
        t0: 1000,
        t1: 1005,
        t2: 1006,
        t3: 1010,
      }),
    );

    await vi.waitFor(() => {
      const syncReply = hostMessages.find((m) => m.type === "sync-reply");
      expect(syncReply).toBeDefined();
    });

    // 5. Phone sends batch with gyro samples converted from deg/s to rad/s
    const DEG_TO_RAD = Math.PI / 180;
    const testDegS_X = 15.0;
    const testDegS_Y = -30.0;
    const testDegS_Z = 45.0;

    const radS_X = testDegS_X * DEG_TO_RAD;
    const radS_Y = testDegS_Y * DEG_TO_RAD;
    const radS_Z = testDegS_Z * DEG_TO_RAD;

    const channels = {
      accelG: {
        t: new Float64Array([1500.0]),
        values: [new Float32Array([0.05]), new Float32Array([-0.02]), new Float32Array([9.81])],
      },
      gyro: {
        t: new Float64Array([1500.0]),
        values: [new Float32Array([radS_X]), new Float32Array([radS_Y]), new Float32Array([radS_Z])],
      },
      orientation: {
        t: new Float64Array([1500.0]),
        values: [
          new Float32Array([90.0 * DEG_TO_RAD]),
          new Float32Array([10.0 * DEG_TO_RAD]),
          new Float32Array([-5.0 * DEG_TO_RAD]),
        ],
      },
    };

    const seq = 1;
    const batchPayload = encodeBatch(seq, channels);

    phoneWs.send(
      JSON.stringify({
        type: "batch",
        payload: batchPayload,
      }),
    );

    // 6. Host decodes incoming batch and asserts non-empty gyro samples
    await vi.waitFor(() => {
      const hostBatch = hostMessages.find((m) => m.type === "batch");
      expect(hostBatch).toBeDefined();
    });

    const receivedBatch = hostMessages.find((m) => m.type === "batch") as {
      type: "batch";
      peerId: string;
      payload: any;
    };

    const decoded = decodeBatch(receivedBatch.payload);
    expect(decoded.seq).toBe(1);
    expect(decoded.channels.gyro).toBeDefined();

    const gyroChannel = decoded.channels.gyro!;
    expect(gyroChannel.values).toHaveLength(3);
    expect(gyroChannel.values[0]!.length).toBeGreaterThan(0);
    expect(gyroChannel.values[1]!.length).toBeGreaterThan(0);
    expect(gyroChannel.values[2]!.length).toBeGreaterThan(0);

    // Verify converted rad/s values match expected physics
    expect(gyroChannel.values[0]![0]).toBeCloseTo(radS_X, 4);
    expect(gyroChannel.values[1]![0]).toBeCloseTo(radS_Y, 4);
    expect(gyroChannel.values[2]![0]).toBeCloseTo(radS_Z, 4);

    // Verify accelG and orientation channels are also decoded cleanly
    expect(decoded.channels.accelG).toBeDefined();
    expect(decoded.channels.accelG!.values[2]![0]).toBeCloseTo(9.81, 2);

    expect(decoded.channels.orientation).toBeDefined();
    expect(decoded.channels.orientation!.values[0]![0]).toBeCloseTo(90.0 * DEG_TO_RAD, 4);

    // Clean up
    phoneWs.close();
    hostWs.close();
  });
});
