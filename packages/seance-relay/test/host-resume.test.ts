import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { createRelay } from "../src/server.js";
import { isValidBatchPayload } from "../src/routing.js";
import { encodeBatch, decodeBatch, PROTOCOL_VERSION } from "seance-core/transports/phone-bridge";

/**
 * The judge path hands a room from the landing page (host #1) to the possession view (host #2)
 * while the phone keeps streaming. These tests pin that behaviour down.
 */
describe("relay: host resume + batch validation", () => {
  let server: Server;
  let wss: WebSocketServer;
  let relay: ReturnType<typeof createRelay>;
  let url = "";

  beforeAll(async () => {
    relay = createRelay({ pruneIntervalMs: 60_000 });
    server = createServer((_req, res) => res.end("ok"));
    wss = new WebSocketServer({ noServer: true });
    server.on("upgrade", (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => relay.handleUpgrade(ws as unknown as globalThis.WebSocket));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (typeof addr === "object" && addr) url = `ws://127.0.0.1:${addr.port}`;
        resolve();
      }),
    );
  });

  afterAll(async () => {
    relay.close();
    wss.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  type Msg = Record<string, unknown> & { type: string };
  async function client(): Promise<{ ws: WebSocket; msgs: Msg[]; send: (m: object) => void }> {
    const ws = new WebSocket(url);
    const msgs: Msg[] = [];
    ws.on("message", (d) => msgs.push(JSON.parse(d.toString()) as Msg));
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", reject);
    });
    return { ws, msgs, send: (m) => ws.send(JSON.stringify(m)) };
  }
  const find = (msgs: Msg[], type: string) => msgs.find((m) => m.type === type);

  function gyroBatch(seq: number) {
    return encodeBatch(seq, {
      gyro: { t: new Float64Array([seq * 10]), values: [new Float32Array([0.1]), new Float32Array([0.2]), new Float32Array([0.3])] },
    });
  }

  it("passes each player's cleaned name and choir instrument to the host, including after a resume", async () => {
    const host = await client();
    host.send({ type: "hello", version: PROTOCOL_VERSION, role: "host" });
    await vi.waitFor(() => expect(find(host.msgs, "welcome")).toBeDefined());
    const { roomCode, resumeToken } = find(host.msgs, "welcome") as unknown as { roomCode: string; resumeToken: string };

    const phone = await client();
    phone.send({ type: "hello", version: PROTOCOL_VERSION, role: "peer", roomCode });
    await vi.waitFor(() => expect(find(phone.msgs, "welcome")).toBeDefined());
    phone.send({ type: "ready", capabilities: ["accel"], name: "  <i>Asha</i>  ", instrument: "organ" });
    await vi.waitFor(() =>
      expect(host.msgs.find((m) => m.type === "peer-joined" && m["name"] === "iAsha/i")).toBeDefined(),
    );
    expect(host.msgs.find((m) => m.type === "peer-joined" && m["name"])!["instrument"]).toBe("organ");

    // Switching instrument = another ready; unknown instruments are dropped.
    phone.send({ type: "ready", capabilities: ["accel"], name: "Asha", instrument: "kazoo" });
    await vi.waitFor(() =>
      expect(host.msgs.filter((m) => m.type === "peer-joined" && m["name"] === "Asha")).toHaveLength(1),
    );
    expect(host.msgs.filter((m) => m.type === "peer-joined" && m["name"] === "Asha")[0]!["instrument"]).toBeUndefined();
    phone.send({ type: "ready", capabilities: ["accel"], name: "Asha", instrument: "bells" });
    await vi.waitFor(() => expect(host.msgs.find((m) => m["instrument"] === "bells")).toBeDefined());

    // A resumed host (e.g. the Choir) learns the name and instrument without the phone resending.
    host.ws.close();
    const choir = await client();
    choir.send({ type: "hello", version: PROTOCOL_VERSION, role: "host", roomCode, resumeToken });
    await vi.waitFor(() => expect(find(choir.msgs, "peer-joined")).toBeDefined());
    expect(find(choir.msgs, "peer-joined")!["name"]).toBe("Asha");
    expect(find(choir.msgs, "peer-joined")!["instrument"]).toBe("bells");
    phone.ws.close();
    choir.ws.close();
  });

  it("gives the host a non-empty secret token", async () => {
    const host = await client();
    host.send({ type: "hello", version: PROTOCOL_VERSION, role: "host" });
    await vi.waitFor(() => expect(find(host.msgs, "welcome")).toBeDefined());
    const w = find(host.msgs, "welcome")!;
    expect(typeof w["resumeToken"]).toBe("string");
    expect((w["resumeToken"] as string).length).toBeGreaterThan(8);
    host.ws.close();
  });

  it("keeps the phone in the room while the laptop switches apps (room-paused, then room-resumed)", async () => {
    const lab = await client();
    lab.send({ type: "hello", version: PROTOCOL_VERSION, role: "host" });
    await vi.waitFor(() => expect(find(lab.msgs, "welcome")).toBeDefined());
    const { roomCode, resumeToken } = find(lab.msgs, "welcome") as unknown as { roomCode: string; resumeToken: string };

    const phone = await client();
    phone.send({ type: "hello", version: PROTOCOL_VERSION, role: "peer", roomCode });
    await vi.waitFor(() => expect(find(phone.msgs, "welcome")).toBeDefined());

    // Laptop leaves the Lab (full page load to /choir/): the host socket closes.
    lab.ws.close();
    await vi.waitFor(() => expect(find(phone.msgs, "room-paused")).toBeDefined());
    expect(phone.ws.readyState).toBe(WebSocket.OPEN);

    // The Choir resumes the same room with the saved token; the phone is told and keeps going.
    const choir = await client();
    choir.send({ type: "hello", version: PROTOCOL_VERSION, role: "host", roomCode, resumeToken });
    await vi.waitFor(() => expect(find(phone.msgs, "room-resumed")).toBeDefined());
    await vi.waitFor(() => expect(find(choir.msgs, "peer-joined")).toBeDefined());

    phone.send({ type: "batch", payload: gyroBatch(7) });
    await vi.waitFor(() => expect(find(choir.msgs, "batch")).toBeDefined());
    phone.ws.close();
    choir.ws.close();
  });

  it("resumes the same room with the token, announces existing phones, and routes data to the NEW host only", async () => {
    const host1 = await client();
    host1.send({ type: "hello", version: PROTOCOL_VERSION, role: "host" });
    await vi.waitFor(() => expect(find(host1.msgs, "welcome")).toBeDefined());
    const { roomCode, resumeToken } = find(host1.msgs, "welcome") as unknown as { roomCode: string; resumeToken: string };

    const phone = await client();
    phone.send({ type: "hello", version: PROTOCOL_VERSION, role: "peer", roomCode });
    await vi.waitFor(() => expect(find(phone.msgs, "welcome")).toBeDefined());
    phone.send({ type: "ready", capabilities: ["gyro", "orientation"] });

    // Second page takes over hosting while host #1 is still connected.
    const host2 = await client();
    host2.send({ type: "hello", version: PROTOCOL_VERSION, role: "host", roomCode, resumeToken });
    await vi.waitFor(() => expect(find(host2.msgs, "welcome")).toBeDefined());
    expect(find(host2.msgs, "welcome")!["roomCode"]).toBe(roomCode);
    await vi.waitFor(() => expect(find(host2.msgs, "peer-joined")).toBeDefined());

    const before1 = host1.msgs.filter((m) => m.type === "batch").length;
    phone.send({ type: "batch", payload: gyroBatch(1) });
    await vi.waitFor(() => expect(find(host2.msgs, "batch")).toBeDefined());
    const decoded = decodeBatch((find(host2.msgs, "batch") as unknown as { payload: Parameters<typeof decodeBatch>[0] }).payload);
    expect(decoded.channels["gyro"]?.values[0]?.[0]).toBeCloseTo(0.1, 5);
    expect(host1.msgs.filter((m) => m.type === "batch").length).toBe(before1); // old host gets nothing

    // The phone must NOT be told the room paused when the evicted host socket closes.
    await new Promise((r) => setTimeout(r, 100));
    expect(find(phone.msgs, "room-paused")).toBeUndefined();

    phone.ws.close();
    host2.ws.close();
  });

  it("refuses to resume with a wrong token (no silent new room)", async () => {
    const host1 = await client();
    host1.send({ type: "hello", version: PROTOCOL_VERSION, role: "host" });
    await vi.waitFor(() => expect(find(host1.msgs, "welcome")).toBeDefined());
    const roomCode = find(host1.msgs, "welcome")!["roomCode"];

    const intruder = await client();
    intruder.send({ type: "hello", version: PROTOCOL_VERSION, role: "host", roomCode, resumeToken: "wrong" });
    await vi.waitFor(() => expect(find(intruder.msgs, "error")).toBeDefined());
    expect(find(intruder.msgs, "error")!["code"]).toBe("HOST_RESUME_FAILED");
    expect(find(intruder.msgs, "welcome")).toBeUndefined();
    host1.ws.close();
  });

  it("rejects a batch without a valid payload with INVALID_BATCH instead of forwarding nothing", async () => {
    const host = await client();
    host.send({ type: "hello", version: PROTOCOL_VERSION, role: "host" });
    await vi.waitFor(() => expect(find(host.msgs, "welcome")).toBeDefined());
    const roomCode = find(host.msgs, "welcome")!["roomCode"];
    const phone = await client();
    phone.send({ type: "hello", version: PROTOCOL_VERSION, role: "peer", roomCode });
    await vi.waitFor(() => expect(find(phone.msgs, "welcome")).toBeDefined());

    // The exact shape the old phone pages sent:
    phone.send({ type: "batch", channels: { orientation: [{ t: 1, v: [1, 2, 3] }] } });
    await vi.waitFor(() => expect(find(phone.msgs, "error")).toBeDefined());
    expect(find(phone.msgs, "error")!["code"]).toBe("INVALID_BATCH");
    expect(find(host.msgs, "batch")).toBeUndefined();
    phone.ws.close();
    host.ws.close();
  });

  it("isValidBatchPayload accepts encodeBatch output and rejects malformed shapes", () => {
    expect(isValidBatchPayload(gyroBatch(3))).toBe(true);
    expect(isValidBatchPayload(undefined)).toBe(false);
    expect(isValidBatchPayload({ channels: {} })).toBe(false); // no seq
    expect(isValidBatchPayload({ seq: 1, channels: { gyro: { t: [1, 2], data: [[1]] } } })).toBe(false); // length mismatch
  });
});
