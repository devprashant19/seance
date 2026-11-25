/**
 * The laptop ("host") side of a séance room, shared by every app on the same origin.
 *
 * The first page creates the room; every later page — another route, or another app such as the
 * Choir under /choir/ — resumes it with the secret host token the relay issued. The phone joins
 * once and keeps streaming while the laptop moves between pages and apps.
 *
 * Browser-only (uses WebSocket and sessionStorage when present); no React.
 */
import { decodeBatch, sanitizeName, PROTOCOL_VERSION, type BatchPayload, type HostMode } from "./protocol.js";
import { isInstrumentId, type InstrumentId } from "./instruments.js";

const STORAGE_KEY = "seance-host-session";

export interface HostSession {
  readonly code: string;
  readonly token: string;
}

function storage(): Storage | undefined {
  try {
    return (globalThis as { sessionStorage?: Storage }).sessionStorage;
  } catch {
    return undefined;
  }
}

/** Remember this tab's room (sessionStorage: per tab, shared by all apps on the same origin). */
export function saveHostSession(session: HostSession): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked: later pages create a new room instead of resuming */
  }
}

export function loadHostSession(code?: string): HostSession | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as HostSession;
    if (typeof s.code !== "string" || typeof s.token !== "string" || !s.token) return null;
    if (code && s.code !== code) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearHostSession(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type DecodedBatch = ReturnType<typeof decodeBatch>;

export interface HostEvents {
  /** `resumed` = an existing room was re-attached (phones already in it are announced next). */
  onWelcome?: (session: HostSession, resumed: boolean) => void;
  /**
   * A phone joined, or re-announced itself (e.g. its "ready" arrived with the player's name).
   * Treat it as an upsert keyed by `peerId`.
   */
  onPeerJoined?: (peerId: string, capabilities: readonly string[], name?: string, instrument?: InstrumentId) => void;
  onPeerLeft?: (peerId: string) => void;
  onBatch?: (peerId: string, batch: DecodedBatch) => void;
  onError?: (code: string, message: string) => void;
  onClose?: () => void;
}

/** Closes the connection when called; `setMode` tells the room's phones what the laptop shows. */
export type HostHandle = (() => void) & { setMode(mode: HostMode): void };

/**
 * Open a host connection to `url`. With `resume`, re-attach to that room (needs its token);
 * without, create a room. Saves the session for later pages. `mode()` is sent to the phones as soon
 * as the room is ready (and again on every `setMode`). Returns a handle that closes it when called.
 */
export function openHost(
  url: string,
  rawEvents: HostEvents,
  resume?: HostSession | null,
  mode?: () => HostMode | undefined,
): HostHandle {
  // Once closed by the caller, swallow everything the socket emits afterwards. (React StrictMode
  // mounts effects twice in dev; closing a still-connecting socket fires "error", which must not be
  // mistaken for a relay failure and trigger retries or new rooms.)
  let disposed = false;
  const guard = <A extends unknown[]>(fn?: (...args: A) => void) =>
    (...args: A) => {
      if (!disposed) fn?.(...args);
    };
  const ev: HostEvents = {
    onWelcome: guard(rawEvents.onWelcome),
    onPeerJoined: guard(rawEvents.onPeerJoined),
    onPeerLeft: guard(rawEvents.onPeerLeft),
    onBatch: guard(rawEvents.onBatch),
    onError: guard(rawEvents.onError),
    onClose: guard(rawEvents.onClose),
  };

  let ws: WebSocket;
  let ready = false;
  let lastMode: HostMode | undefined;
  const sendMode = (m: HostMode | undefined) => {
    lastMode = m ?? lastMode;
    if (ready && lastMode && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "mode", mode: lastMode }));
  };
  try {
    ws = new WebSocket(url);
  } catch {
    ev.onError?.("RELAY_UNREACHABLE", "Cannot reach the séance server.");
    return Object.assign(() => {}, { setMode: () => {} });
  }

  ws.addEventListener("open", () => {
    ws.send(
      JSON.stringify(
        resume
          ? { type: "hello", version: PROTOCOL_VERSION, role: "host", roomCode: resume.code, resumeToken: resume.token }
          : { type: "hello", version: PROTOCOL_VERSION, role: "host" },
      ),
    );
  });

  ws.addEventListener("message", (e) => {
    let msg: { type?: string; [k: string]: unknown };
    try {
      msg = JSON.parse(String(e.data));
    } catch {
      return;
    }
    switch (msg.type) {
      case "welcome": {
        const session = { code: String(msg["roomCode"]), token: String(msg["resumeToken"] ?? "") };
        if (session.token) saveHostSession(session);
        ready = true;
        sendMode(mode?.());
        ev.onWelcome?.(session, Boolean(resume));
        break;
      }
      case "peer-joined":
        ev.onPeerJoined?.(
          String(msg["peerId"]),
          (msg["capabilities"] as string[] | undefined) ?? [],
          sanitizeName(msg["name"]),
          isInstrumentId(msg["instrument"]) ? msg["instrument"] : undefined,
        );
        break;
      case "peer-left":
        ev.onPeerLeft?.(String(msg["peerId"]));
        break;
      case "batch":
        try {
          ev.onBatch?.(String(msg["peerId"]), decodeBatch(msg["payload"] as BatchPayload));
        } catch {
          /* malformed batch: the relay already rejects these */
        }
        break;
      case "error":
        ev.onError?.(String(msg["code"] ?? "ERROR"), String(msg["message"] ?? "Relay error"));
        break;
    }
  });

  ws.addEventListener("error", () => ev.onError?.("RELAY_UNREACHABLE", "Cannot reach the séance server."));
  ws.addEventListener("close", () => ev.onClose?.());

  const close = () => {
    disposed = true;
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  };
  return Object.assign(close, { setMode: (m: HostMode) => sendMode(m) });
}
