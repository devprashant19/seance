import type { Room } from "./rooms.js";
import type {
  ClientMessage,
  ServerMessage,
  Role,
} from "seance-core/transports/phone-bridge";
import { validateInstruct } from "seance-core/transports/phone-bridge";

export interface Connection {
  readonly role: Role;
  readonly peerId: string | undefined;
  send(msg: ServerMessage): void;
}

export class Router {
  private readonly _connections = new Map<WebSocket, Connection>();
  private readonly _roomSockets = new Map<string, Set<WebSocket>>();
  private readonly _lastInstructTimes = new Map<string, number>();

  register(ws: WebSocket, roomCode: string, conn: Connection): void {
    this._connections.set(ws, conn);
    let sockets = this._roomSockets.get(roomCode);
    if (!sockets) {
      sockets = new Set();
      this._roomSockets.set(roomCode, sockets);
    }
    sockets.add(ws);
  }

  unregister(ws: WebSocket, roomCode: string): Connection | undefined {
    const conn = this._connections.get(ws);
    this._connections.delete(ws);
    const sockets = this._roomSockets.get(roomCode);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) this._roomSockets.delete(roomCode);
    }
    return conn;
  }

  getConnection(ws: WebSocket): Connection | undefined {
    return this._connections.get(ws);
  }

  /** All sockets currently registered as host of `roomCode`. */
  hostSockets(roomCode: string): WebSocket[] {
    const sockets = this._roomSockets.get(roomCode);
    if (!sockets) return [];
    return [...sockets].filter((ws) => this._connections.get(ws)?.role === "host");
  }

  broadcastToRoom(
    roomCode: string,
    msg: ServerMessage,
    exclude?: WebSocket,
  ): void {
    const sockets = this._roomSockets.get(roomCode);
    if (!sockets) return;
    for (const ws of sockets) {
      if (ws === exclude) continue;
      const conn = this._connections.get(ws);
      if (conn) conn.send(msg);
    }
  }

  sendToHost(roomCode: string, msg: ServerMessage): void {
    const sockets = this._roomSockets.get(roomCode);
    if (!sockets) return;
    for (const ws of sockets) {
      const conn = this._connections.get(ws);
      if (conn?.role === "host") {
        conn.send(msg);
        return;
      }
    }
  }

  sendToPeer(roomCode: string, peerId: string, msg: ServerMessage): void {
    const sockets = this._roomSockets.get(roomCode);
    if (!sockets) return;
    for (const ws of sockets) {
      const conn = this._connections.get(ws);
      if (conn?.peerId === peerId) {
        conn.send(msg);
        return;
      }
    }
  }

  routeClientMessage(
    ws: WebSocket,
    roomCode: string,
    _room: Room,
    msg: ClientMessage,
  ): ServerMessage | undefined {
    const conn = this._connections.get(ws);
    if (!conn) {
      return { type: "error", code: "NOT_REGISTERED", message: "Not registered" };
    }

    switch (msg.type) {
      case "batch": {
        if (conn.role === "observer") {
          return { type: "error", code: "FORBIDDEN", message: "Observers cannot send batches" };
        }
        if (!isValidBatchPayload(msg.payload)) {
          // Fail loudly: a silently dropped batch looks like "the ghost doesn't move".
          return {
            type: "error",
            code: "INVALID_BATCH",
            message: "batch needs payload {seq:number, channels:{<id>:{t:number[], data:number[][]}}} (use encodeBatch)",
          };
        }
        const serverBatch: ServerMessage = {
          type: "batch",
          peerId: conn.peerId ?? "host",
          payload: msg.payload,
        };
        if (conn.role === "peer") {
          this.sendToHost(roomCode, serverBatch);
        } else {
          this.broadcastToRoom(roomCode, serverBatch, ws);
        }
        return undefined;
      }
      case "sync-reply": {
        const serverSyncReply: ServerMessage = {
          type: "sync-reply",
          peerId: conn.peerId ?? "peer",
          t0: msg.t0,
          t1: msg.t1,
          t2: msg.t2,
          t3: msg.t3,
        };
        this.sendToHost(roomCode, serverSyncReply);
        return undefined;
      }
      case "instruct": {
        if (conn.role !== "host" && conn.role !== "observer") {
          return { type: "error", code: "FORBIDDEN", message: "Only host or observer can send instructions" };
        }
        const validation = validateInstruct(msg);
        if (!validation.valid) {
          return { type: "error", code: "INVALID_INSTRUCTION", message: validation.reason ?? "Invalid instruction" };
        }
        const now = Date.now();
        const lastTime = this._lastInstructTimes.get(msg.to) ?? 0;
        if (now - lastTime < 1000) {
          return { type: "error", code: "RATE_LIMITED", message: "Instructions are rate limited to 1 per second per peer" };
        }
        this._lastInstructTimes.set(msg.to, now);

        const serverInstruct: ServerMessage = {
          type: "instruct",
          from: conn.peerId ?? conn.role,
          to: msg.to,
          text: msg.text,
          step: msg.step,
        };
        this.sendToPeer(roomCode, msg.to, serverInstruct);
        return undefined;
      }
      default:
        return undefined;
    }
  }

  roomSocketCount(roomCode: string): number {
    return this._roomSockets.get(roomCode)?.size ?? 0;
  }
}

/** Structural check that a batch payload matches what `encodeBatch` produces. */
export function isValidBatchPayload(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as { seq?: unknown; channels?: unknown };
  if (typeof p.seq !== "number" || !Number.isFinite(p.seq)) return false;
  if (typeof p.channels !== "object" || p.channels === null) return false;
  for (const ch of Object.values(p.channels as Record<string, unknown>)) {
    if (typeof ch !== "object" || ch === null) return false;
    const c = ch as { t?: unknown; data?: unknown };
    if (!Array.isArray(c.t) || !Array.isArray(c.data)) return false;
    if (!c.data.every((axis) => Array.isArray(axis) && axis.length === (c.t as unknown[]).length)) return false;
  }
  return true;
}
