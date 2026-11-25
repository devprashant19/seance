import { useState, useCallback, useEffect, useRef } from "react";
import { QrCode, SpiritTrouble } from "seance-avatars";
import { openHost, loadHostSession, clearHostSession } from "seance-core/transports/phone-bridge";
import { Stage } from "../stage/index.js";
import { SCALES, createVoice, createMasterBus, type ScaleName, type Voice, type MasterBus } from "../audio/index.js";
import { updateVoice, type BansheeState } from "../instrument/index.js";
import { sensorFrameFromBatch } from "../live/frames.js";
import { relayUrl } from "../relay-url.js";

const NOTE_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k"];
const KEYBOARD_ID = "keyboard";
const RETRY_MS = 3000;

/** A Voice that also remembers whether it's currently sounding (for the singer's mouth animation). */
interface TrackedVoice {
  voice: Voice;
  gated: boolean;
  state: BansheeState;
  name: string;
}

function track(voice: Voice, name: string, state: BansheeState): TrackedVoice {
  const tracked: TrackedVoice = { voice, gated: false, state, name };
  const gateOn = voice.gateOn.bind(voice);
  const gateOff = voice.gateOff.bind(voice);
  voice.gateOn = () => { tracked.gated = true; gateOn(); };
  voice.gateOff = () => { tracked.gated = false; gateOff(); };
  return tracked;
}

interface SingerView { id: string; name: string; amplitude: number; muted: boolean; solo: boolean }

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

  const ctxRef = useRef<AudioContext | null>(null);
  const busRef = useRef<MasterBus | null>(null);
  const voicesRef = useRef(new Map<string, TrackedVoice>());
  const peerNamesRef = useRef(new Map<string, string>());
  const settingsRef = useRef({ scaleName, droneMode, muted, solo });
  settingsRef.current = { scaleName, droneMode, muted, solo };

  const isSilenced = (id: string) => {
    const s = settingsRef.current;
    return s.muted.has(id) || (s.solo !== null && s.solo !== id);
  };

  /** Create (once) the voice for a singer, if audio is unlocked. */
  const ensureVoice = useCallback((id: string, name: string) => {
    const ctx = ctxRef.current;
    const bus = busRef.current;
    if (!ctx || !bus || voicesRef.current.has(id)) return;
    const index = voicesRef.current.size;
    const voice = createVoice(ctx, bus.inputNode, index);
    voice.setPan(((index % 5) - 2) / 3); // spread singers across the stereo field
    voicesRef.current.set(id, track(voice, name, { scaleName: settingsRef.current.scaleName, droneMode: settingsRef.current.droneMode, currentNoteIndex: -1 }));
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
  const [phoneIds, setPhoneIds] = useState<readonly string[]>([]);
  const addPeer = useCallback((peerId: string) => {
    const name = peerNamesRef.current.get(peerId) ?? `Banshee ${peerNamesRef.current.size + 1}`;
    peerNamesRef.current.set(peerId, name);
    ensureVoice(peerId, name);
    setPhoneIds((p) => (p.includes(peerId) ? p : [...p, peerId]));
  }, [ensureVoice]);
  const dropPeer = useCallback((peerId: string) => {
    removeVoice(peerId);
    peerNamesRef.current.delete(peerId);
    setPhoneIds((p) => p.filter((id) => id !== peerId));
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
        onPeerJoined: addPeer,
        onPeerLeft: dropPeer,
        onBatch: (peerId, batch) => {
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
      for (const id of [...peerNamesRef.current.keys()]) dropPeer(id);
    };
  }, [connectNonce, addPeer, dropPeer, reconnect]);

  // --- Audio: created inside the user's click (browser autoplay rules). ---
  const handleUnlock = useCallback(() => {
    if (ctxRef.current) return;
    const ctx = new AudioContext();
    void ctx.resume();
    const bus = createMasterBus(ctx);
    bus.setVolume(masterVolume);
    ctxRef.current = ctx;
    busRef.current = bus;
    ensureVoice(KEYBOARD_ID, "You (keyboard)");
    for (const [id, name] of peerNamesRef.current) ensureVoice(id, name);
    setAudioUnlocked(true);
  }, [ensureVoice, masterVolume]);

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
      if (e.repeat) return;
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
      const ids = audioUnlocked ? [...voicesRef.current.keys()] : [...peerNamesRef.current.keys()];
      setSingers(
        ids.map((id) => {
          const v = voicesRef.current.get(id);
          return {
            id,
            name: v?.name ?? peerNamesRef.current.get(id) ?? id,
            amplitude: v?.gated ? 0.7 : 0,
            muted: s.muted.has(id),
            solo: s.solo === id,
          };
        }),
      );
    }, 100);
    return () => clearInterval(t);
  }, [audioUnlocked]);

  const onMuteSinger = useCallback((id: string) => {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        voicesRef.current.get(id)?.voice.gateOff();
      }
      return next;
    });
  }, []);

  const onSoloSinger = useCallback((id: string) => {
    setSolo((prev) => {
      const next = prev === id ? null : id;
      if (next) for (const [vid, v] of voicesRef.current) if (vid !== next) v.voice.gateOff();
      return next;
    });
  }, []);

  const joinUrl = roomCode ? `${window.location.origin}${import.meta.env.BASE_URL}join/${roomCode}` : "";
  const phoneCount = phoneIds.length;

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", padding: 16, position: "relative",
      background: "radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 70%)",
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: 2, marginBottom: 8 }}>Banshee Choir</h1>
      <p style={{ color: "#778", marginBottom: 20, textAlign: "center", maxWidth: 480 }}>
        Every phone becomes a singing ghost: hold to sing, tilt to change the note, shake for tremolo.
        No phone? Hold <kbd style={kbdStyle}>Space</kbd> and use the keyboard.
      </p>

      <a href="/" style={{ position: "absolute", top: 16, left: 16, color: "#88a", fontSize: 13, textDecoration: "none" }}>
        &larr; Poltergeist Lab
      </a>

      {relayError && !roomCode && <SpiritTrouble code="relay-unreachable-host" onAction={() => reconnect()} />}

      {roomCode && (
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
          <QrCode text={joinUrl} size={180} />
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 13, color: "#889" }}>Scan to join the choir (phones already in the séance sing right away)</p>
            <p style={{ fontSize: 36, fontFamily: "monospace", letterSpacing: 6, color: "#aabbff" }}>{roomCode}</p>
            <p role="status" style={{ fontSize: 13, color: phoneCount > 0 ? "#6c9" : "#889" }}>
              {phoneCount === 0 ? "No phones yet" : `${phoneCount} phone${phoneCount > 1 ? "s" : ""} singing`}
            </p>
          </div>
        </div>
      )}

      <Stage
        singers={singers}
        scaleName={scaleName}
        masterVolume={masterVolume}
        droneMode={droneMode}
        audioUnlocked={audioUnlocked}
        onScaleChange={setScaleName}
        onVolumeChange={setMasterVolume}
        onDroneModeChange={setDroneMode}
        onMuteSinger={onMuteSinger}
        onSoloSinger={onSoloSinger}
        onUnlockAudio={handleUnlock}
      />

      {audioUnlocked && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#667", marginBottom: 8 }}>
            Hold <kbd style={kbdStyle}>Space</kbd> to sing. Press <kbd style={kbdStyle}>A</kbd>–<kbd style={kbdStyle}>K</kbd> to change note.
          </p>
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            {NOTE_KEYS.map((k) => (
              <div
                key={k}
                style={{
                  width: 40, height: 48, borderRadius: 4,
                  border: `1px solid ${activeNote === k ? "#6688ff" : "#334"}`,
                  background: activeNote === k ? "#223355" : "#111122",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: activeNote === k ? "#aaccff" : "#556",
                  fontSize: 14, fontFamily: "monospace", textTransform: "uppercase",
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

const kbdStyle: React.CSSProperties = {
  padding: "2px 6px", background: "#223", border: "1px solid #445",
  borderRadius: 3, fontFamily: "monospace", fontSize: 11,
};
