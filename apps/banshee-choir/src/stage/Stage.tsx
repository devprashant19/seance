import { useState, useCallback } from "react";
import { GhostChoir } from "seance-avatars";
import { INSTRUMENTS, instrumentInfo, type InstrumentId } from "seance-core/transports/phone-bridge";
import { SCALE_NAMES, type ScaleName } from "../audio/index.js";

export interface SingerView {
  id: string;
  name: string;
  color: string;
  instrument: InstrumentId;
  amplitude: number;
  /** Silenced by mute or by someone else's solo. */
  muted: boolean;
  solo: boolean;
  isKeyboard: boolean;
  /** Bumped when this singer shakes their phone (ghost gets dizzy). */
  dizzy: number;
}

interface StageProps {
  singers: SingerView[];
  scaleName: ScaleName;
  masterVolume: number;
  droneMode: boolean;
  audioUnlocked: boolean;
  keyboardInstrument: InstrumentId;
  onKeyboardInstrument: (id: InstrumentId) => void;
  onScaleChange: (scale: ScaleName) => void;
  onVolumeChange: (vol: number) => void;
  onDroneModeChange: (drone: boolean) => void;
  onMuteSinger: (id: string) => void;
  onSoloSinger: (id: string) => void;
  onUnlockAudio: () => void;
}

export function Stage({
  singers,
  scaleName,
  masterVolume,
  droneMode,
  audioUnlocked,
  keyboardInstrument,
  onKeyboardInstrument,
  onScaleChange,
  onVolumeChange,
  onDroneModeChange,
  onMuteSinger,
  onSoloSinger,
  onUnlockAudio,
}: StageProps) {
  const [allMuted, setAllMuted] = useState(false);
  const [savedVolume, setSavedVolume] = useState(masterVolume);

  const handleMuteToggle = useCallback(() => {
    if (allMuted) {
      onVolumeChange(savedVolume);
    } else {
      setSavedVolume(masterVolume);
      onVolumeChange(0);
    }
    setAllMuted(!allMuted);
  }, [allMuted, masterVolume, savedVolume, onVolumeChange]);

  return (
    <div style={{ width: "100%", maxWidth: 980, margin: "0 auto" }}>
      {!audioUnlocked && (
        <button onClick={onUnlockAudio} className="sx-btn" style={{ width: "100%", marginBottom: 16, fontSize: 13 }}>
          ▶ Start the séance audio
        </button>
      )}

      <div className="sx-box" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", padding: "10px 14px", marginBottom: 12 }}>
        <label style={labelStyle}>
          Scale
          <select value={scaleName} onChange={(e) => onScaleChange(e.target.value as ScaleName)} style={selectStyle}>
            {SCALE_NAMES.map((s) => (
              <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Volume
          <input type="range" min={0} max={1} step={0.01} value={masterVolume} onChange={(e) => onVolumeChange(Number(e.target.value))} style={{ width: 90 }} />
        </label>

        <label style={labelStyle}>
          Keyboard
          <select value={keyboardInstrument} onChange={(e) => onKeyboardInstrument(e.target.value as InstrumentId)} style={selectStyle}>
            {INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>{i.emoji} {i.label}</option>
            ))}
          </select>
        </label>

        <button onClick={handleMuteToggle} className={allMuted ? "sx-ghost-btn sx-ghost-btn--pink" : "sx-ghost-btn"}>
          {allMuted ? "Unmute all" : "Mute all"}
        </button>
        <button
          onClick={() => onDroneModeChange(!droneMode)}
          className={droneMode ? "sx-ghost-btn sx-ghost-btn--pink" : "sx-ghost-btn"}
          title="Drone: phones sing while shaken instead of while held"
        >
          {droneMode ? "Drone ON" : "Drone"}
        </button>
      </div>

      <div className="sx-box" style={{ padding: 0, marginBottom: 12 }}>
        {singers.length === 0 ? (
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
            <p className="sx-glow-cyan sx-pulse" style={{ fontFamily: "var(--sx-font-pixel)", fontSize: 12, margin: 0 }}>WAITING FOR GHOSTS…</p>
            <p className="sx-muted" style={{ margin: 0 }}>Scan the QR code with a phone, or start the audio to play from the keyboard.</p>
          </div>
        ) : (
          <GhostChoir
            ghosts={singers.map((s) => ({ id: s.id, name: s.name, color: s.color, amplitude: s.amplitude, muted: s.muted, dizzy: s.dizzy }))}
            height={singers.length > 5 ? 440 : 380}
          />
        )}
      </div>

      {singers.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
          {singers.map((s) => {
            const info = instrumentInfo(s.instrument);
            return (
              <li
                key={s.id}
                className="sx-card"
                style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, borderLeft: `3px solid ${s.color}`, opacity: s.muted ? 0.55 : 1 }}
              >
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, boxShadow: s.amplitude > 0 ? `0 0 12px ${s.color}` : "none", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                  <span className="sx-muted" style={{ fontSize: 13 }}>{info.emoji} {info.label}</span>
                </span>
                <button onClick={() => onMuteSinger(s.id)} aria-pressed={s.muted && !s.solo} title="Mute" style={miniBtn(s.muted)}>M</button>
                <button onClick={() => onSoloSinger(s.id)} aria-pressed={s.solo} title="Solo" style={miniBtn(s.solo)}>S</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--sx-muted)",
};

const selectStyle: React.CSSProperties = {
  padding: "5px 8px", fontSize: 14,
};

function miniBtn(active: boolean): React.CSSProperties {
  return {
    width: 30, height: 30, cursor: "pointer", fontSize: 10, padding: 0,
    fontFamily: "var(--sx-font-pixel)",
    border: `1px solid ${active ? "var(--sx-pink)" : "var(--sx-line)"}`,
    background: active ? "rgba(255,0,255,0.3)" : "rgba(10,5,20,0.8)",
    color: active ? "#fff" : "var(--sx-dim)",
    boxShadow: active ? "0 0 8px var(--sx-pink)" : "none",
  };
}
