/**
 * One live séance room for the whole Lab app.
 *
 * The first page that needs it opens (or resumes) the room; the connection then stays open while
 * the laptop moves between pages, so the phone joins once and keeps streaming. Leaving for another
 * app on the same origin (e.g. the Choir at /choir/) closes this socket, and that app resumes the
 * same room with the saved host token.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  openHost,
  loadHostSession,
  clearHostSession,
  type DecodedBatch,
  type HostHandle,
  type HostMode,
} from "seance-core/transports/phone-bridge";
import { relayUrl } from "../relay-url.js";

const RETRY_MS = 3000;
/** Phones announced this soon after resuming were already connected (not a fresh join). */
const RESUME_ANNOUNCE_MS = 750;

export type RoomStatus = "idle" | "connecting" | "ready" | "error";

export interface Player {
  readonly id: string;
  /** Name typed on the phone; undefined until the phone's "ready" arrives (or if left blank). */
  readonly name: string | undefined;
}

/** Display label for a player: their name, or "Spirit N" by join order. */
export function playerLabel(players: readonly Player[], id: string): string {
  const i = players.findIndex((p) => p.id === id);
  const p = players[i];
  return p?.name ?? `Spirit ${i >= 0 ? i + 1 : "?"}`;
}
type BatchListener = (peerId: string, batch: DecodedBatch) => void;

export interface LiveRoom {
  readonly status: RoomStatus;
  readonly code: string | null;
  /** Phones currently in the room (ids), in join order. */
  readonly phones: readonly string[];
  /** Same phones with their players' names. */
  readonly players: readonly Player[];
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

/** What the phones should show for the laptop's current page. */
export function modeForPath(pathname: string): HostMode {
  if (pathname.startsWith("/session")) return "lobby";
  if (pathname.startsWith("/possession")) return "possession";
  if (pathname.startsWith("/lab")) return "lab";
  return "other";
}

export function LiveRoomProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<readonly Player[]>([]);
  const phones = useMemo(() => players.map((p) => p.id), [players]);
  const [lastJoinAt, setLastJoinAt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const closeRef = useRef<HostHandle | null>(null);
  const location = useLocation();
  const mode = modeForPath(location.pathname);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Tell the phones whenever the laptop changes page.
  useEffect(() => {
    closeRef.current?.setMode(mode);
  }, [mode]);
  const listenersRef = useRef(new Set<BatchListener>());
  const resumedAtRef = useRef(0);
  const knownRef = useRef(new Set<string>());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback((fresh: boolean) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    closeRef.current?.();
    if (fresh) clearHostSession();
    setStatus("connecting");
    setError(null);
    setPlayers([]);
    knownRef.current = new Set();
    const resume = loadHostSession();

    closeRef.current = openHost(
      relayUrl(),
      {
        onWelcome: (session, resumed) => {
          setCode(session.code);
          setStatus("ready");
          resumedAtRef.current = resumed ? Date.now() : 0;
        },
        onPeerJoined: (peerId, _caps, name) => {
          const known = knownRef.current.has(peerId);
          knownRef.current.add(peerId);
          setPlayers((list) => {
            const i = list.findIndex((p) => p.id === peerId);
            if (i < 0) return [...list, { id: peerId, name }];
            if (!name || list[i]!.name === name) return list;
            const next = [...list];
            next[i] = { id: peerId, name };
            return next;
          });
          if (known) return; // re-announcement (e.g. the player's name arrived), not a new join
          const isResumeAnnounce = resumedAtRef.current > 0 && Date.now() - resumedAtRef.current < RESUME_ANNOUNCE_MS;
          if (!isResumeAnnounce) setLastJoinAt(Date.now());
        },
        onPeerLeft: (peerId) => {
          knownRef.current.delete(peerId);
          setPlayers((list) => list.filter((p) => p.id !== peerId));
        },
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
      () => modeRef.current,
    );
  }, []);

  const acquire = useCallback(() => {
    if (!closeRef.current) connect(false);
  }, [connect]);

  // If this tab already runs a séance, stay connected on every page (not only pages that use the
  // phone), so phones always know what the laptop is showing.
  useEffect(() => {
    if (loadHostSession()) connect(false);
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      closeRef.current?.();
      closeRef.current = null;
    };
  }, [connect]);

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
      players,
      lastJoinAt,
      error,
      acquire,
      subscribe,
      retry: () => connect(false),
      newRoom: () => connect(true),
    }),
    [status, code, phones, players, lastJoinAt, error, acquire, subscribe, connect],
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
