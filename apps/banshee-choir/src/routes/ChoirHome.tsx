import { useState, useCallback, useEffect, useRef } from "react";
import { QrCode, SpiritTrouble, playerNeon } from "seance-avatars";
import {
  openHost,
  loadHostSession,
  clearHostSession,
  InstrumentCooldown,
  DEFAULT_INSTRUMENT,
  type InstrumentId,
} from "seance-core/transports/phone-bridge";
import { Stage, type SingerView } from "../stage/index.js";
import { SCALES, createInstrumentVoice, createMasterBus, type ScaleName, type Voice, type MasterBus, type InstrumentVoice } from "../audio/index.js";
import { updateVoice, type BansheeState } from "../instrument/index.js";
import { sensorFrameFromBatch } from "../live/frames.js";
import { peakShake, SHAKE_THRESHOLD, DIZZY_HOLD_MS } from "../live/shake.js";
import { relayUrl } from "../relay-url.js";

const NOTE_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k"];
const KEYBOARD_ID = "keyboard";
const RETRY_MS = 3000;

/** A voice that also remembers whether it's sounding (drives the ghost's mouth). */
interface TrackedVoice {
  voice: InstrumentVoice;
  gated: boolean;
  state: BansheeState;
}

function track(voice: InstrumentVoice, state: BansheeState): TrackedVoice {
  const tracked: TrackedVoice = { voice, gated: false, state };
  const gateOn = voice.gateOn.bind(voice);
  const gateOff = voice.gateOff.bind(voice);
  (voice as Voice).gateOn = () => { tracked.gated = true; gateOn(); };
  (voice as Voice).gateOff = () => { tracked.gated = false; gateOff(); };
  return tracked;
}

/** Everyone in the room: phones (with the name and instrument they chose) plus the laptop keyboard. */
interface Member {
  name: string;
  instrument: InstrumentId;
  color: string;
  /** Stereo slot. */
  slot: number;
}

export function ChoirHome() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [scaleName, setScaleName] = useState<ScaleName>("graveyard");
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [droneMode, setDroneMode] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [relayError, setRelayError] = useState(false);
  const [singers, setSingers] = useState<SingerView[]>([]);
  const [muted, setMuted] = useState<ReadonlySet<string>>(new Set());
  const [solo, setSolo] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [keyboardInstrument, setKeyboardInstrument] = useState<InstrumentId>("organ");
  const [phoneCount, setPhoneCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const busRef = useRef<MasterBus | null>(null);
  const voicesRef = useRef(new Map<string, TrackedVoice>());
  const membersRef = useRef(new Map<string, Member>());
  const cooldownRef = useRef(new InstrumentCooldown());
  const slotRef = useRef(0);
  /** Per singer: how many times they made their ghost dizzy, and when the current spin ends. */
  const dizzyRef = useRef(new Map<string, { count: number; until: number }>());
  const settingsRef = useRef({ scaleName, droneMode, muted, solo });
  settingsRef.current = { scaleName, droneMode, muted, solo };

  const isSilenced = (id: string) => {
    const s = settingsRef.current;
    return s.muted.has(id) || (s.solo !== null && s.solo !== id);
  };

  /** (Re)build the voice for a member with their current instrument, if audio is unlocked. */
  const buildVoice = useCallback((id: string) => {
    const ctx = ctxRef.current;
    const bus = busRef.current;
    const m = membersRef.current.get(id);
    if (!ctx || !bus || !m) return;
    const old = voicesRef.current.get(id);
    if (old && old.voice.instrument === m.instrument) return;
    const state = old?.state ?? { scaleName: settingsRef.current.scaleName, droneMode: settingsRef.current.droneMode, currentNoteIndex: -1 };
    if (old) {
      old.voice.gateOff();
      old.voice.destroy();
    }
    const voice = createInstrumentVoice(ctx, bus.inputNode, m.instrument, m.slot);
    voice.setPan(((m.slot % 5) - 2) / 3); // spread singers across the stereo field
    voicesRef.current.set(id, track(voice, state));
  }, []);

  const removeVoice = useCallback((id: string) => {
    const v = voicesRef.current.get(id);
    if (v) {
      v.voice.gateOff();
      v.voice.destroy();
      voicesRef.current.delete(id);
    }
  }, []);

  // --- Relay: this laptop hosts the room; every phone in it becomes a singer. ---
  // If this tab already runs a séance (started in the Poltergeist Lab on the same site), resume that
  // room with its host token: phones that joined there keep streaming and simply start singing.
  const upsertPeer = useCallback((peerId: string, name: string | undefined, instrument: InstrumentId | undefined) => {
    const members = membersRef.current;
    const existing = members.get(peerId);
    if (!existing) {
      const phoneIndex = [...members.keys()].filter((k) => k !== KEYBOARD_ID).length;
      members.set(peerId, {
        name: name ?? `Banshee ${phoneIndex + 1}`,
        instrument: instrument ?? DEFAULT_INSTRUMENT,
        color: playerNeon(phoneIndex + 1),
        slot: slotRef.current++,
      });
      cooldownRef.current.seed(peerId);
      setPhoneCount((n) => n + 1);
      buildVoice(peerId);
      return;
    }
    if (name && name !== existing.name) existing.name = name;
    if (instrument && instrument !== existing.instrument) {
      // Players may switch once every 10 s; the phone shows the same countdown.
      if (cooldownRef.current.trySwitch(peerId, Date.now())) {
        existing.instrument = instrument;
        buildVoice(peerId);
        setToast(`${existing.name} switched to ${instrument}`);
      }
    }
  }, [buildVoice]);

  const dropPeer = useCallback((peerId: string) => {
    removeVoice(peerId);
    if (membersRef.current.delete(peerId)) setPhoneCount((n) => Math.max(0, n - 1));
    cooldownRef.current.forget(peerId);
  }, [removeVoice]);

  const [connectNonce, setConnectNonce] = useState(0);
  const reconnect = useCallback((fresh = false) => {
    if (fresh) clearHostSession();
    setConnectNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    setRelayError(false);
    let retry: ReturnType<typeof setTimeout> | undefined;
    const close = openHost(
      relayUrl(),
      {
        onWelcome: (session) => setRoomCode(session.code),
        onPeerJoined: (peerId, _caps, name, instrument) => upsertPeer(peerId, name, instrument),
        onPeerLeft: dropPeer,
        onBatch: (peerId, batch) => {
          const now = Date.now();
          const d = dizzyRef.current.get(peerId) ?? { count: 0, until: 0 };
          if (now > d.until && peakShake(batch) > SHAKE_THRESHOLD) {
            dizzyRef.current.set(peerId, { count: d.count + 1, until: now + DIZZY_HOLD_MS });
          }
          const v = voicesRef.current.get(peerId);
          const frame = sensorFrameFromBatch(batch);
          if (!v || !frame) return;
          const s = settingsRef.current;
          v.state = updateVoice(v.voice, frame, { ...v.state, scaleName: s.scaleName, droneMode: s.droneMode });
          if (isSilenced(peerId)) v.voice.gateOff();
        },
        onError: (code) => {
          if (code === "HOST_RESUME_FAILED") {
            reconnect(true); // the saved room is gone: open a fresh one
            return;
          }
          setRelayError(true);
        },
        onClose: () => {
          setRelayError(true);
          retry = setTimeout(() => reconnect(), RETRY_MS);
        },
      },
      loadHostSession(),
    );
    return () => {
      if (retry) clearTimeout(retry);
      close();
      for (const id of [...membersRef.current.keys()]) if (id !== KEYBOARD_ID) dropPeer(id);
    };
  }, [connectNonce, upsertPeer, dropPeer, reconnect]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Audio: created inside the user's click (browser autoplay rules). ---
  const handleUnlock = useCallback(() => {
    if (ctxRef.current) return;
    const ctx = new AudioContext();
    void ctx.resume();
    const bus = createMasterBus(ctx);
    bus.setVolume(masterVolume);
    ctxRef.current = ctx;
    busRef.current = bus;
    membersRef.current.set(KEYBOARD_ID, { name: "You (keyboard)", instrument: keyboardInstrument, color: playerNeon(0), slot: slotRef.current++ });
    for (const id of membersRef.current.keys()) buildVoice(id);
    setAudioUnlocked(true);
  }, [buildVoice, masterVolume, keyboardInstrument]);

  const onKeyboardInstrument = useCallback((id: InstrumentId) => {
    setKeyboardInstrument(id);
    const m = membersRef.current.get(KEYBOARD_ID);
    if (m) {
      m.instrument = id;
      buildVoice(KEYBOARD_ID);
      voicesRef.current.get(KEYBOARD_ID)?.voice.setFrequency(SCALES[settingsRef.current.scaleName][0]!);
    }
  }, [buildVoice]);

  useEffect(() => { busRef.current?.setVolume(masterVolume); }, [masterVolume]);

  useEffect(() => () => {
    for (const id of [...voicesRef.current.keys()]) removeVoice(id);
    busRef.current?.destroy();
    void ctxRef.current?.close();
  }, [removeVoice]);

  // --- Keyboard voice: Space sings, A–K pick notes of the current scale. ---
  useEffect(() => {
    if (!audioUnlocked) return;
    const kb = () => voicesRef.current.get(KEYBOARD_ID);
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || (e.target instanceof HTMLElement && e.target.closest("input, select, textarea"))) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!isSilenced(KEYBOARD_ID)) kb()?.voice.gateOn();
      }
      const i = NOTE_KEYS.indexOf(e.key.toLowerCase());
      if (i >= 0) {
        const scale = SCALES[settingsRef.current.scaleName];
        kb()?.voice.setFrequency(scale[Math.min(i, scale.length - 1)]!);
        setActiveNote(NOTE_KEYS[i]!);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " ") kb()?.voice.gateOff();
      if (NOTE_KEYS.includes(e.key.toLowerCase())) setActiveNote(null);
    }
    kb()?.voice.setFrequency(SCALES[settingsRef.current.scaleName][0]!);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [audioUnlocked]);

  // Refresh the stage ~10×/s from voice state (not once per sensor batch).
  useEffect(() => {
    const t = setInterval(() => {
      const s = settingsRef.current;
      setSingers(
        [...membersRef.current.entries()].map(([id, m]) => {
          const v = voicesRef.current.get(id);
          return {
            id,
            name: m.name,
            color: m.color,
            instrument: m.instrument,
            amplitude: v?.gated ? 0.8 : 0,
            muted: s.muted.has(id) || (s.solo !== null && s.solo !== id),
            solo: s.solo === id,
            isKeyboard: id === KEYBOARD_ID,
            dizzy: dizzyRef.current.get(id)?.count ?? 0,
          };
        }),
      );
    }, 100);
    return () => clearInterval(t);
  }, []);

  const onMuteSinger = useCallback((id: string) => {
    const willMute = !settingsRef.current.muted.has(id);
    if (willMute) voicesRef.current.get(id)?.voice.gateOff();
    setMuted((prev) => {
      const next = new Set(prev);
      if (willMute) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const onSoloSinger = useCallback((id: string) => {
    const next = settingsRef.current.solo === id ? null : id;
    if (next) for (const [vid, v] of voicesRef.current) if (vid !== next) v.voice.gateOff();
    setSolo(next);
  }, []);

  const joinUrl = roomCode ? `${window.location.origin}${import.meta.env.BASE_URL}join/${roomCode}` : "";

  return (
    <main className="sx-page" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <a href="/session" className="sx-ghost-btn" style={{ position: "absolute", top: 16, left: 16 }}>
        &larr; Séance lobby
      </a>

      <p className="sx-kicker" style={{ marginTop: 40 }}>Séance · Multiplayer</p>
      <h1 className="sx-glitch" style={{ fontSize: "clamp(18px, 4vw, 30px)", margin: "8px 0 10px", textAlign: "center" }}>
        Banshee Choir
      </h1>
      <p className="sx-muted" style={{ marginTop: 0, marginBottom: 20, textAlign: "center", maxWidth: 560 }}>
        Every phone becomes a singing ghost. Enter a name, pick an instrument, then hold to sing, tilt to change the
        note and shake for tremolo. No phone? Hold <kbd>Space</kbd> and play <kbd>A</kbd>–<kbd>K</kbd>.
      </p>

      {relayError && !roomCode && <SpiritTrouble code="relay-unreachable-host" onAction={() => reconnect()} />}

      {roomCode && (
        <div className="sx-box" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, padding: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <div className="sx-qr">
            <QrCode text={joinUrl} size={150} />
          </div>
          <div style={{ textAlign: "left" }}>
            <p className="sx-muted" style={{ fontSize: 14, margin: 0 }}>Scan to join the choir</p>
            <p className="sx-code" style={{ fontSize: 28, margin: "8px 0" }}>{roomCode}</p>
            <p role="status" className={phoneCount > 0 ? "sx-status-live" : "sx-muted"} style={{ fontSize: 14, margin: 0 }}>
              {phoneCount === 0 ? "No phones yet" : `${phoneCount} phone${phoneCount > 1 ? "s" : ""} in the choir`}
            </p>
            <p className="sx-muted" style={{ fontSize: 12, margin: "6px 0 0", maxWidth: 220 }}>
              Phones already in the séance sing right away.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <p role="status" className="sx-chip" style={{ marginBottom: 12 }}>
          🎶 {toast}
        </p>
      )}

      <Stage
        singers={singers}
        scaleName={scaleName}
        masterVolume={masterVolume}
        droneMode={droneMode}
        audioUnlocked={audioUnlocked}
        keyboardInstrument={keyboardInstrument}
        onKeyboardInstrument={onKeyboardInstrument}
        onScaleChange={setScaleName}
        onVolumeChange={setMasterVolume}
        onDroneModeChange={setDroneMode}
        onMuteSinger={onMuteSinger}
        onSoloSinger={onSoloSinger}
        onUnlockAudio={handleUnlock}
      />

      {audioUnlocked && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p className="sx-muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Hold <kbd>Space</kbd> to sing. Press <kbd>A</kbd>–<kbd>K</kbd> to change note.
          </p>
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            {NOTE_KEYS.map((k) => (
              <div
                key={k}
                style={{
                  width: 40, height: 48,
                  border: `1px solid ${activeNote === k ? "var(--sx-pink)" : "var(--sx-line)"}`,
                  background: activeNote === k ? "rgba(255,0,255,0.25)" : "rgba(10,5,20,0.8)",
                  boxShadow: activeNote === k ? "0 0 12px var(--sx-pink)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: activeNote === k ? "#fff" : "var(--sx-dim)",
                  fontSize: 12, fontFamily: "var(--sx-font-pixel)", textTransform: "uppercase",
                }}
              >
                {k}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
