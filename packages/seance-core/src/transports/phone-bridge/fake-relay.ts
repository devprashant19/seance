import type { ClientMessage, ServerMessage } from "./protocol.js";
import { isClientMessage } from "./protocol.js";

export interface FakeClient {
  readonly role: "host" | "peer" | "observer";
  readonly peerId: string;
  readonly sent: ServerMessage[];
  sendToServer(msg: ClientMessage): void;
  close(): void;
}

export class FakeRelay {
  private _peerCounter = 0;
  private readonly _clients = new Map<string, FakeClient>();
  private _roomCode = "TEST";

  get roomCode(): string {
    return this._roomCode;
  }

  createClient(role: "host" | "peer" | "observer"): FakeClient {
    this._peerCounter++;
    const peerId = role === "host" ? "host" : `p${this._peerCounter}`;
    const sent: ServerMessage[] = [];

    const client: FakeClient = {
      role,
      peerId,
      sent,
      sendToServer: (msg: ClientMessage) => {
        this._handleMessage(client, msg);
      },
      close: () => {
        this._clients.delete(peerId);
        for (const other of this._clients.values()) {
          if (other.peerId !== peerId) {
            if (role === "host") {
              other.sent.push({ type: "room-paused", reason: "Host disconnected" });
            } else {
              other.sent.push({ type: "peer-left", peerId, reason: "disconnect" });
            }
          }
        }
      },
    };

    this._clients.set(peerId, client);

    client.sent.push({
      type: "welcome",
      roomCode: this._roomCode,
      peerId,
      resumeToken: `tok-${peerId}`,
    });

    for (const other of this._clients.values()) {
      if (other.peerId !== peerId && role === "peer") {
        const hostClient = this._clients.get("host");
        if (hostClient) {
          hostClient.sent.push({ type: "peer-joined", peerId, capabilities: [] });
        }
      }
    }

    return client;
  }

  private _handleMessage(from: FakeClient, msg: ClientMessage): void {
    if (!isClientMessage(msg)) return;

    switch (msg.type) {
      case "batch": {
        if (from.role === "peer") {
          const host = this._clients.get("host");
          if (host) {
            host.sent.push({ type: "batch", peerId: from.peerId, payload: msg.payload });
          }
        } else if (from.role === "host") {
          for (const c of this._clients.values()) {
            if (c.peerId !== "host" && c.role !== "observer") {
              c.sent.push({ type: "batch", peerId: "host", payload: msg.payload });
            }
          }
        }
        break;
      }
      case "sync-reply": {
        const host = this._clients.get("host");
        if (host) {
          host.sent.push({
            type: "sync-reply",
            peerId: from.peerId,
            t0: msg.t0,
            t1: msg.t1,
            t2: msg.t2,
            t3: msg.t3,
          });
        }
        break;
      }
      default:
        break;
    }
  }
}
