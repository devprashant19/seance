const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;
const MAX_PEERS = 8;
const HOST_GRACE_MS = 10 * 60 * 1000;
const HARD_EXPIRY_MS = 4 * 60 * 60 * 1000;
const RESUME_WINDOW_MS = 2 * 60 * 1000;

export interface Peer {
  readonly peerId: string;
  /** Channels the phone says it can stream (set by its "ready" message). */
  capabilities: readonly string[];
  connected: boolean;
  resumeToken: string;
  disconnectedAt: number | undefined;
}

export interface Room {
  readonly code: string;
  readonly createdAt: number;
  hostConnected: boolean;
  hostDisconnectedAt: number | undefined;
  observerKey: string | undefined;
  /** Secret given only to the host that created the room; required to resume hosting it. */
  readonly hostToken: string;
  readonly peers: Map<string, Peer>;
}

export class RoomManager {
  private readonly _rooms = new Map<string, Room>();
  private _counter = 0;

  generateCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = "";
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]!;
      }
      attempts++;
      if (attempts > 1000) throw new Error("Code space exhausted");
    } while (this._rooms.has(code));
    return code;
  }

  createRoom(observerKey?: string): Room {
    const code = this.generateCode();
    const room: Room = {
      code,
      createdAt: Date.now(),
      hostConnected: true,
      hostDisconnectedAt: undefined,
      observerKey,
      hostToken: this._generateToken(),
      peers: new Map(),
    };
    this._rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this._rooms.get(code);
  }

  addPeer(room: Room, capabilities: readonly string[]): Peer {
    if (room.peers.size >= MAX_PEERS) {
      throw new Error("Room is full");
    }
    this._counter++;
    const peerId = `p${this._counter}`;
    const resumeToken = this._generateToken();
    const peer: Peer = {
      peerId,
      capabilities,
      connected: true,
      resumeToken,
      disconnectedAt: undefined,
    };
    room.peers.set(peerId, peer);
    return peer;
  }

  findByResumeToken(room: Room, token: string): Peer | undefined {
    const now = Date.now();
    for (const peer of room.peers.values()) {
      if (
        peer.resumeToken === token &&
        !peer.connected &&
        peer.disconnectedAt !== undefined &&
        now - peer.disconnectedAt < RESUME_WINDOW_MS
      ) {
        return peer;
      }
    }
    return undefined;
  }

  disconnectPeer(room: Room, peerId: string): void {
    const peer = room.peers.get(peerId);
    if (peer) {
      peer.connected = false;
      peer.disconnectedAt = Date.now();
    }
  }

  removePeer(room: Room, peerId: string): void {
    room.peers.delete(peerId);
  }

  disconnectHost(room: Room): void {
    room.hostConnected = false;
    room.hostDisconnectedAt = Date.now();
  }

  reconnectHost(room: Room): void {
    room.hostConnected = true;
    room.hostDisconnectedAt = undefined;
  }

  pruneExpired(): string[] {
    const now = Date.now();
    const removed: string[] = [];
    for (const [code, room] of this._rooms) {
      const hardExpired = now - room.createdAt > HARD_EXPIRY_MS;
      const hostGraceExpired =
        !room.hostConnected &&
        room.hostDisconnectedAt !== undefined &&
        now - room.hostDisconnectedAt > HOST_GRACE_MS;

      if (hardExpired || hostGraceExpired) {
        this._rooms.delete(code);
        removed.push(code);
      }

      for (const [peerId, peer] of room.peers) {
        if (
          !peer.connected &&
          peer.disconnectedAt !== undefined &&
          now - peer.disconnectedAt > RESUME_WINDOW_MS
        ) {
          room.peers.delete(peerId);
        }
      }
    }
    return removed;
  }

  get roomCount(): number {
    return this._rooms.size;
  }

  private _generateToken(): string {
    const bytes = new Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0");
    }
    return bytes.join("");
  }
}
