import type { Room } from "./rooms.js";
import type {
  ClientMessage,
  ServerMessage,
  Role,
} from "seance-core/transports/phone-bridge";

export interface Connection {
  readonly role: Role;
  readonly peerId: string | undefined;
  send(msg: ServerMessage): void;
}

export class Router {
  private readonly _connections = new Map<WebSocket, Connection>();
  private readonly _roomSockets = new Map<string, Set<WebSocket>>();

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
      default:
        return undefined;
    }
  }

  roomSocketCount(roomCode: string): number {
    return this._roomSockets.get(roomCode)?.size ?? 0;
  }
}
