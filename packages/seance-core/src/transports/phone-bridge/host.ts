import type { ServerMessage, BatchPayload } from "./protocol.js";
import { decodeBatch } from "./protocol.js";

export interface PeerInfo {
  readonly peerId: string;
  readonly capabilities: readonly string[];
  connected: boolean;
}

export interface HostTransportEvents {
  onPeerJoined?: (peer: PeerInfo) => void;
  onPeerLeft?: (peerId: string, reason: string) => void;
  onBatch?: (peerId: string, decoded: ReturnType<typeof decodeBatch>) => void;
  onRoomPaused?: (reason: string) => void;
  onSyncReply?: (peerId: string, t0: number, t1: number, t2: number, t3: number) => void;
  onError?: (code: string, message: string) => void;
}

export class HostTransport {
  private readonly _peers = new Map<string, PeerInfo>();
  private readonly _events: HostTransportEvents;
  private _roomCode: string | undefined;

  constructor(events: HostTransportEvents = {}) {
    this._events = events;
  }

  get roomCode(): string | undefined {
    return this._roomCode;
  }

  get peers(): ReadonlyMap<string, PeerInfo> {
    return this._peers;
  }

  get peerCount(): number {
    return this._peers.size;
  }

  handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "welcome":
        this._roomCode = msg.roomCode;
        break;

      case "peer-joined": {
        const peer: PeerInfo = {
          peerId: msg.peerId,
          capabilities: msg.capabilities,
          connected: true,
        };
        this._peers.set(msg.peerId, peer);
        this._events.onPeerJoined?.(peer);
        break;
      }

      case "peer-left": {
        const peer = this._peers.get(msg.peerId);
        if (peer) {
          peer.connected = false;
        }
        this._peers.delete(msg.peerId);
        this._events.onPeerLeft?.(msg.peerId, msg.reason);
        break;
      }

      case "batch": {
        const decoded = decodeBatch(msg.payload);
        this._events.onBatch?.(msg.peerId, decoded);
        break;
      }

      case "room-paused":
        this._events.onRoomPaused?.(msg.reason);
        break;

      case "sync-reply":
        this._events.onSyncReply?.(msg.peerId, msg.t0, msg.t1, msg.t2, msg.t3);
        break;

      case "error":
        this._events.onError?.(msg.code, msg.message);
        break;

      default:
        break;
    }
  }

  reset(): void {
    this._peers.clear();
    this._roomCode = undefined;
  }
}
