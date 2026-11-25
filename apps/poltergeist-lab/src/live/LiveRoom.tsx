/**
 * One live séance room for the whole Lab app.
 *
 * The first page that needs it opens (or resumes) the room; the connection then stays open while
 * the laptop moves between pages, so the phone joins once and keeps streaming. Leaving for another
 * app on the same origin (e.g. the Choir at /choir/) closes this socket, and that app resumes the
 * same room with the saved host token.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  openHost,
  loadHostSession,
  clearHostSession,
  type DecodedBatch,
} from "seance-core/transports/phone-bridge";
import { relayUrl } from "../relay-url.js";

const RETRY_MS = 3000;
/** Phones announced this soon after resuming were already connected (not a fresh join). */
const RESUME_ANNOUNCE_MS = 750;

export type RoomStatus = "idle" | "connecting" | "ready" | "error";
type BatchListener = (peerId: string, batch: DecodedBatch) => void;

export interface LiveRoom {
  readonly status: RoomStatus;
  readonly code: string | null;
  /** Phones currently streaming into the room. */
  readonly phones: readonly string[];
  /** Time (ms) of the most recent *new* phone join; 0 if none yet. */
  readonly lastJoinAt: number;
  readonly error: string | null;
  /** Start the connection if it isn't running (pages call this via `useLiveRoom`). */
  acquire(): void;
  subscribe(listener: BatchListener): () => void;
  retry(): void;
  /** Forget the current room and open a fresh one (new code / QR). */
  newRoom(): void;
}

const Ctx = createContext<LiveRoom | null>(null);

export function LiveRoomProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [phones, setPhones] = useState<readonly string[]>([]);
  const [lastJoinAt, setLastJoinAt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const closeRef = useRef<(() => void) | null>(null);
  const listenersRef = useRef(new Set<BatchListener>());
  const resumedAtRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback((fresh: boolean) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    closeRef.current?.();
    if (fresh) clearHostSession();
    setStatus("connecting");
    setError(null);
    setPhones([]);
    const resume = loadHostSession();

    closeRef.current = openHost(
      relayUrl(),
      {
        onWelcome: (session, resumed) => {
          setCode(session.code);
          setStatus("ready");
          resumedAtRef.current = resumed ? Date.now() : 0;
        },
        onPeerJoined: (peerId) => {
          setPhones((p) => (p.includes(peerId) ? p : [...p, peerId]));
          const isResumeAnnounce = resumedAtRef.current > 0 && Date.now() - resumedAtRef.current < RESUME_ANNOUNCE_MS;
          if (!isResumeAnnounce) setLastJoinAt(Date.now());
        },
        onPeerLeft: (peerId) => setPhones((p) => p.filter((id) => id !== peerId)),
        onBatch: (peerId, batch) => {
          for (const l of listenersRef.current) l(peerId, batch);
        },
        onError: (errCode, message) => {
          if (errCode === "HOST_RESUME_FAILED") {
            // The saved room is gone (relay restarted or expired): start a fresh one.
            connect(true);
            return;
          }
          setStatus("error");
          setError(message);
        },
        onClose: () => {
          setStatus((s) => (s === "error" ? s : "error"));
          setError((e) => e ?? "Lost the connection to the séance server.");
          retryTimerRef.current = setTimeout(() => connect(false), RETRY_MS);
        },
      },
      resume,
    );
  }, []);

  const acquire = useCallback(() => {
    if (!closeRef.current) connect(false);
  }, [connect]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      closeRef.current?.();
      closeRef.current = null;
    },
    [],
  );

  const subscribe = useCallback((listener: BatchListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<LiveRoom>(
    () => ({
      status,
      code,
      phones,
      lastJoinAt,
      error,
      acquire,
      subscribe,
      retry: () => connect(false),
      newRoom: () => connect(true),
    }),
    [status, code, phones, lastJoinAt, error, acquire, subscribe, connect],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Use the shared live room; starts the connection on first use. */
export function useLiveRoom(): LiveRoom {
  const room = useContext(Ctx);
  if (!room) throw new Error("useLiveRoom must be used inside <LiveRoomProvider>");
  useEffect(() => {
    room.acquire();
  }, [room]);
  return room;
}

/** Subscribe to phone batches for the lifetime of the calling component. */
export function useLiveBatches(listener: BatchListener): void {
  const room = useLiveRoom();
  const ref = useRef(listener);
  ref.current = listener;
  useEffect(() => room.subscribe((peerId, batch) => ref.current(peerId, batch)), [room.subscribe]);
}
