import type { ChannelInfo } from "../../spirit.js";
import type { ClientMessage, ServerMessage } from "./protocol.js";
import { PROTOCOL_VERSION, encodeBatch, isServerMessage } from "./protocol.js";
import { ClockSync } from "./clock-sync.js";
import { ReconnectManager, type ReconnectConfig } from "./reconnect.js";

export type PhoneClientState = "disconnected" | "connecting" | "connected" | "reconnecting" | "closed";

export interface PhoneClientConfig {
  readonly url: string;
  readonly roomCode: string;
  readonly role?: "peer" | "observer";
  readonly resumeToken?: string;
  readonly reconnect?: ReconnectConfig;
}

export interface PhoneClientEvents {
  onStateChange?: (state: PhoneClientState) => void;
  onMessage?: (msg: ServerMessage) => void;
  onInstruct?: (instruction: { from: string; to: string; text: string; step?: number }) => void;
  onSyncReady?: () => void;
  onError?: (error: string) => void;
}

export class PhoneClient {
  private _ws: WebSocket | undefined;
  private _state: PhoneClientState = "disconnected";
  private readonly _config: PhoneClientConfig;
  private readonly _events: PhoneClientEvents;
  private readonly _clockSync = new ClockSync();
  private readonly _reconnect: ReconnectManager;
  private _peerId: string | undefined;
  private _resumeToken: string | undefined;
  private _syncTimer: ReturnType<typeof setInterval> | undefined;

  constructor(config: PhoneClientConfig, events: PhoneClientEvents = {}) {
    this._config = config;
    this._events = events;
    this._resumeToken = config.resumeToken;
    this._reconnect = new ReconnectManager(config.reconnect ?? {}, {
      onStateChange: (s) => {
        if (s === "exhausted") this._setState("closed");
        else if (s === "backoff" || s === "connecting") this._setState("reconnecting");
      },
    });
  }

  get state(): PhoneClientState {
    return this._state;
  }

  get peerId(): string | undefined {
    return this._peerId;
  }

  get clockSync(): ClockSync {
    return this._clockSync;
  }

  connect(): void {
    this._setState("connecting");
    this._openSocket();
  }

  send(msg: ClientMessage): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    }
  }

  sendBatch(
    seq: number,
    channels: Record<string, { t: Float64Array; values: Float32Array[] }>,
  ): void {
    const payload = encodeBatch(seq, channels);
    this.send({ type: "batch", payload });
  }

  sendReady(capabilities: readonly string[]): void {
    this.send({ type: "ready", capabilities });
  }

  close(): void {
    this._reconnect.dispose();
    this._stopSync();
    if (this._ws) {
      this._ws.close();
      this._ws = undefined;
    }
    this._setState("closed");
  }

  private _openSocket(): void {
    const ws = new WebSocket(this._config.url);
    this._ws = ws;

    ws.addEventListener("open", () => {
      const hello: ClientMessage = {
        type: "hello",
        version: PROTOCOL_VERSION,
        role: this._config.role ?? "peer",
        roomCode: this._config.roomCode,
        resumeToken: this._resumeToken,
      };
      ws.send(JSON.stringify(hello));
    });

    ws.addEventListener("message", (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (!isServerMessage(parsed)) return;
      const msg = parsed as ServerMessage;
      this._handleMessage(msg);
    });

    ws.addEventListener("close", () => {
      if (this._state === "closed") return;
      this._stopSync();
      this._reconnect.onDisconnect(() => this._tryReconnect());
    });

    ws.addEventListener("error", () => {
      this._events.onError?.("WebSocket error");
    });
  }

  private _handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "welcome":
        this._peerId = msg.peerId;
        this._resumeToken = msg.resumeToken || this._resumeToken;
        this._setState("connected");
        this._reconnect.onConnected();
        this._startSync();
        break;

      case "sync": {
        const t1 = performance.now();
        const reply: ClientMessage = {
          type: "sync-reply",
          t0: msg.t0,
          t1,
          t2: performance.now(),
          t3: 0,
        };
        (reply as { t3: number }).t3 = performance.now();
        this.send(reply);
        break;
      }

      case "instruct": {
        this._events.onInstruct?.({
          from: msg.from,
          to: msg.to,
          text: msg.text,
          step: msg.step,
        });
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(msg.text);
            window.speechSynthesis.speak(utter);
          } catch {}
        }
        break;
      }

      default:
        break;
    }

    this._events.onMessage?.(msg);
  }

  private _startSync(): void {
    this._syncTimer = setInterval(() => {
      const probe = this._clockSync.createProbe();
      this.send({
        type: "sync-reply",
        t0: probe.t0,
        t1: 0,
        t2: 0,
        t3: performance.now(),
      });
    }, this._clockSync.syncIntervalMs);
  }

  private _stopSync(): void {
    if (this._syncTimer !== undefined) {
      clearInterval(this._syncTimer);
      this._syncTimer = undefined;
    }
  }

  private async _tryReconnect(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        const ws = new WebSocket(this._config.url);
        this._ws = ws;

        ws.addEventListener("open", () => {
          const hello: ClientMessage = {
            type: "hello",
            version: PROTOCOL_VERSION,
            role: this._config.role ?? "peer",
            roomCode: this._config.roomCode,
            resumeToken: this._resumeToken,
          };
          ws.send(JSON.stringify(hello));
        });

        ws.addEventListener("message", (event) => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(event.data as string);
          } catch {
            return;
          }
          if (!isServerMessage(parsed)) return;
          const msg = parsed as ServerMessage;

          if (msg.type === "welcome") {
            this._peerId = msg.peerId;
            this._resumeToken = msg.resumeToken || this._resumeToken;
            this._setState("connected");
            this._startSync();
            resolve(true);
          } else if (msg.type === "error") {
            resolve(false);
          }

          this._handleMessage(msg);
        });

        ws.addEventListener("close", () => resolve(false));
        ws.addEventListener("error", () => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  private _setState(s: PhoneClientState): void {
    if (this._state !== s) {
      this._state = s;
      this._events.onStateChange?.(s);
    }
  }
}
