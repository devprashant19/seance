import { RoomManager } from "./rooms.js";
import { Router, type Connection } from "./routing.js";
import { TokenBucket, checkFrameSize } from "./limits.js";
import {
  PROTOCOL_VERSION,
  isClientMessage,
  sanitizeName,
  isInstrumentId,
  type ServerMessage,
  type ClientMessage,
  type Role,
} from "seance-core/transports/phone-bridge";

export interface RelayConfig {
  readonly port?: number;
  readonly allowedOrigins?: readonly string[];
  readonly pruneIntervalMs?: number;
  /** Optional event log (room/peer lifecycle, first batch, errors). Never logs sensor values. */
  readonly log?: (line: string) => void;
}

const DEFAULT_PORT = 4000;
const DEFAULT_PRUNE_INTERVAL_MS = 60_000;

export function createRelay(config: RelayConfig = {}) {
  const port = config.port ?? DEFAULT_PORT;
  const allowedOrigins = new Set(config.allowedOrigins ?? []);
  const pruneInterval = config.pruneIntervalMs ?? DEFAULT_PRUNE_INTERVAL_MS;
  const log = config.log ?? (() => {});
  const batchCounts = new WeakMap<WebSocket, number>();

  const rooms = new RoomManager();
  const router = new Router();
  const buckets = new WeakMap<WebSocket, TokenBucket>();
  const socketRooms = new WeakMap<WebSocket, string>();

  function checkOrigin(origin: string | undefined): boolean {
    if (allowedOrigins.size === 0) return true;
    return origin !== undefined && allowedOrigins.has(origin);
  }

  function sendJson(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function handleHello(ws: WebSocket, msg: ClientMessage & { type: "hello" }): void {
    if (msg.version !== PROTOCOL_VERSION) {
      sendJson(ws, { type: "error", code: "VERSION_MISMATCH", message: `Expected v${PROTOCOL_VERSION}` });
      ws.close();
      return;
    }

    const role: Role = msg.role;

    if (role === "host") {
      // Resume hosting an existing room (e.g. the laptop moves from the landing page to the
      // possession view). Requires the secret host token from the original welcome.
      if (msg.roomCode) {
        const existing = rooms.getRoom(msg.roomCode);
        if (!existing || !msg.resumeToken || msg.resumeToken !== existing.hostToken) {
          log(`host resume FAILED for room ${msg.roomCode} (${existing ? "wrong token" : "room not found"})`);
          sendJson(ws, {
            type: "error",
            code: "HOST_RESUME_FAILED",
            message: "Cannot resume this séance: unknown room or wrong host token",
          });
          ws.close();
          return;
        }
        // Evict any previous host socket so data is routed to the new page only.
        for (const old of router.hostSockets(existing.code)) {
          router.unregister(old, existing.code);
          socketRooms.delete(old);
          buckets.delete(old);
          try {
            old.close();
          } catch {
            /* already closed */
          }
        }
        rooms.reconnectHost(existing);
        log(`host resumed room ${existing.code} (${[...existing.peers.values()].filter((p) => p.connected).length} phone(s) connected)`);
        const conn: Connection = { role: "host", peerId: undefined, send: (m) => sendJson(ws, m) };
        router.register(ws, existing.code, conn);
        socketRooms.set(ws, existing.code);
        sendJson(ws, { type: "welcome", roomCode: existing.code, peerId: "host", resumeToken: existing.hostToken });
        // Phones were told "room-paused" when the previous host page closed: tell them it is back.
        router.broadcastToRoom(existing.code, { type: "room-resumed" }, ws);
        // Tell the resumed host which phones are already in the room.
        for (const peer of existing.peers.values()) {
          if (peer.connected) {
            sendJson(ws, { type: "peer-joined", peerId: peer.peerId, capabilities: peer.capabilities, name: peer.name, instrument: peer.instrument });
          }
        }
        return;
      }

      const room = rooms.createRoom();
      log(`host created room ${room.code}`);
      const conn: Connection = { role: "host", peerId: undefined, send: (m) => sendJson(ws, m) };
      router.register(ws, room.code, conn);
      socketRooms.set(ws, room.code);
      sendJson(ws, { type: "welcome", roomCode: room.code, peerId: "host", resumeToken: room.hostToken });
      return;
    }

    const roomCode = msg.roomCode;
    if (!roomCode) {
      sendJson(ws, { type: "error", code: "MISSING_ROOM", message: "roomCode required for peer/observer" });
      ws.close();
      return;
    }

    const room = rooms.getRoom(roomCode);
    if (!room) {
      log(`${role} tried to join unknown room ${roomCode}`);
      sendJson(ws, { type: "error", code: "ROOM_NOT_FOUND", message: "Room does not exist" });
      ws.close();
      return;
    }

    if (role === "observer") {
      if (room.observerKey && msg.resumeToken !== room.observerKey) {
        sendJson(ws, { type: "error", code: "AUTH_FAILED", message: "Invalid observer key" });
        ws.close();
        return;
      }
      const conn: Connection = { role: "observer", peerId: undefined, send: (m) => sendJson(ws, m) };
      router.register(ws, roomCode, conn);
      socketRooms.set(ws, roomCode);
      sendJson(ws, { type: "welcome", roomCode, peerId: "observer", resumeToken: "" });
      return;
    }

    if (msg.resumeToken) {
      const existing = rooms.findByResumeToken(room, msg.resumeToken);
      if (existing) {
        existing.connected = true;
        existing.disconnectedAt = undefined;
        const conn: Connection = { role: "peer", peerId: existing.peerId, send: (m) => sendJson(ws, m) };
        router.register(ws, roomCode, conn);
        socketRooms.set(ws, roomCode);
        sendJson(ws, { type: "welcome", roomCode, peerId: existing.peerId, resumeToken: existing.resumeToken });
        router.sendToHost(roomCode, { type: "peer-joined", peerId: existing.peerId, capabilities: existing.capabilities, name: existing.name, instrument: existing.instrument });
        return;
      }
    }

    try {
      const peer = rooms.addPeer(room, []);
      log(`phone ${peer.peerId} joined room ${roomCode} (host ${room.hostConnected ? "connected" : "DISCONNECTED"})`);
      const conn: Connection = { role: "peer", peerId: peer.peerId, send: (m) => sendJson(ws, m) };
      router.register(ws, roomCode, conn);
      socketRooms.set(ws, roomCode);
      sendJson(ws, { type: "welcome", roomCode, peerId: peer.peerId, resumeToken: peer.resumeToken });
      router.sendToHost(roomCode, { type: "peer-joined", peerId: peer.peerId, capabilities: [] });
    } catch {
      sendJson(ws, { type: "error", code: "ROOM_FULL", message: "Room is full" });
      ws.close();
    }
  }

  function handleMessage(ws: WebSocket, data: string | ArrayBuffer): void {
    if (!checkFrameSize(data)) {
      sendJson(ws, { type: "error", code: "FRAME_TOO_LARGE", message: "Max 64KB" });
      return;
    }

    const bucket = buckets.get(ws);
    if (bucket && !bucket.consume()) {
      sendJson(ws, { type: "error", code: "RATE_LIMIT", message: "Slow down" });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data));
    } catch {
      sendJson(ws, { type: "error", code: "PARSE_ERROR", message: "Invalid JSON" });
      return;
    }

    if (!isClientMessage(parsed)) {
      sendJson(ws, { type: "error", code: "INVALID_MESSAGE", message: "Unknown message type" });
      return;
    }

    const msg = parsed as ClientMessage;

    if (msg.type === "hello") {
      handleHello(ws, msg as ClientMessage & { type: "hello" });
      return;
    }

    const roomCode = socketRooms.get(ws);
    if (!roomCode) {
      sendJson(ws, { type: "error", code: "NOT_IN_ROOM", message: "Send hello first" });
      return;
    }

    const room = rooms.getRoom(roomCode);
    if (!room) return;

    if (msg.type === "ready") {
      const conn = router.getConnection(ws);
      if (conn?.peerId) {
        const peer = room.peers.get(conn.peerId);
        const name = sanitizeName(msg.name);
        const instrument = isInstrumentId(msg.instrument) ? msg.instrument : undefined;
        if (peer) {
          peer.capabilities = [...msg.capabilities];
          peer.name = name;
          peer.instrument = instrument;
        }
        if (name) log(`phone ${conn.peerId} in room ${roomCode} is "${name}"`);
        router.sendToHost(roomCode, {
          type: "peer-joined",
          peerId: conn.peerId,
          capabilities: msg.capabilities,
          name,
          instrument,
        });
      }
      return;
    }

    if (msg.type === "batch") {
      const n = (batchCounts.get(ws) ?? 0) + 1;
      batchCounts.set(ws, n);
      if (n === 1 || n % 200 === 0) log(`room ${roomCode}: ${n} batch(es) from ${router.getConnection(ws)?.peerId ?? "?"}`);
    }
    const errorMsg = router.routeClientMessage(ws, roomCode, room, msg);
    if (errorMsg) {
      log(`room ${roomCode}: rejected ${msg.type} (${errorMsg.type === "error" ? errorMsg.code : "?"})`);
      sendJson(ws, errorMsg);
    }
  }

  function handleClose(ws: WebSocket): void {
    const roomCode = socketRooms.get(ws);
    if (!roomCode) return;

    const conn = router.unregister(ws, roomCode);
    if (!conn) return;

    const room = rooms.getRoom(roomCode);
    if (!room) return;

    log(`${conn.role}${conn.peerId ? " " + conn.peerId : ""} left room ${roomCode}`);
    if (conn.role === "host") {
      rooms.disconnectHost(room);
      router.broadcastToRoom(roomCode, { type: "room-paused", reason: "Host disconnected" });
    } else if (conn.role === "peer" && conn.peerId) {
      rooms.disconnectPeer(room, conn.peerId);
      router.broadcastToRoom(roomCode, { type: "peer-left", peerId: conn.peerId, reason: "disconnect" });
    }

    socketRooms.delete(ws);
    buckets.delete(ws);
  }

  const pruneTimer = setInterval(() => rooms.pruneExpired(), pruneInterval);

  return {
    rooms,
    router,
    port,
    checkOrigin,

    handleUpgrade(ws: WebSocket, origin?: string): boolean {
      if (!checkOrigin(origin)) {
        sendJson(ws, { type: "error", code: "ORIGIN_REJECTED", message: "Origin not allowed" });
        ws.close();
        return false;
      }
      buckets.set(ws, new TokenBucket());
      ws.addEventListener("message", (event) => handleMessage(ws, event.data as string | ArrayBuffer));
      ws.addEventListener("close", () => handleClose(ws));
      return true;
    },

    healthz(): { status: string; rooms: number } {
      return { status: "ok", rooms: rooms.roomCount };
    },

    close(): void {
      clearInterval(pruneTimer);
    },
  };
}

export type Relay = ReturnType<typeof createRelay>;
