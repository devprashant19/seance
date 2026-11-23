import { useState, useCallback } from "react";
import { Singer } from "./Singer.js";
import { SCALE_NAMES, type ScaleName } from "../audio/index.js";

const VOICE_COLORS = ["#6688ff", "#88aaff", "#aa88ff", "#66ddaa", "#ffaa66", "#ff6688"];

interface SingerState {
  id: string;
  name: string;
  amplitude: number;
  muted: boolean;
  solo: boolean;
}

interface StageProps {
  singers: SingerState[];
  scaleName: ScaleName;
  masterVolume: number;
  droneMode: boolean;
  audioUnlocked: boolean;
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
  onScaleChange,
  onVolumeChange,
  onDroneModeChange,
  onMuteSinger,
  onSoloSinger,
  onUnlockAudio,
}: StageProps) {
  const [muted, setMuted] = useState(false);

  const handleMuteToggle = useCallback(() => {
    setMuted((prev) => !prev);
    onVolumeChange(muted ? masterVolume : 0);
  }, [muted, masterVolume, onVolumeChange]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {!audioUnlocked && (
        <button
          onClick={onUnlockAudio}
          style={{
            width: "100%", padding: "16px 24px", marginBottom: 16,
            background: "linear-gradient(135deg, #223 0%, #335 100%)",
            border: "1px solid #557", borderRadius: 8, color: "#aaccff",
            fontSize: 16, cursor: "pointer", letterSpacing: 1,
          }}
        >
          Click to start the s&eacute;ance audio
        </button>
      )}

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
        padding: "8px 12px", background: "#111122", borderRadius: 8,
        marginBottom: 16, border: "1px solid #223",
      }}>
        <label style={labelStyle}>
          Scale
          <select
            value={scaleName}
            onChange={(e) => onScaleChange(e.target.value as ScaleName)}
            style={selectStyle}
          >
            {SCALE_NAMES.map((s) => (
              <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </label>

        <button onClick={handleMuteToggle} style={toggleStyle(muted)}>
          {muted ? "Unmute" : "Mute"}
        </button>

        <button onClick={() => onDroneModeChange(!droneMode)} style={toggleStyle(droneMode)}>
          {droneMode ? "Drone ON" : "Drone"}
        </button>
      </div>

      <div style={{
        display: "flex", justifyContent: "center", flexWrap: "wrap",
        gap: 8, minHeight: 160, alignItems: "flex-end",
      }}>
        {singers.length === 0 && (
          <p style={{ color: "#556", fontStyle: "italic" }}>Waiting for phones to join...</p>
        )}
        {singers.map((s, i) => (
          <Singer
            key={s.id}
            name={s.name}
            color={VOICE_COLORS[i % VOICE_COLORS.length]!}
            amplitude={s.amplitude}
            muted={s.muted}
            solo={s.solo}
            onMute={() => onMuteSinger(s.id)}
            onSolo={() => onSoloSinger(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#889",
};

const selectStyle: React.CSSProperties = {
  padding: "4px 8px", background: "#1a1a2e", border: "1px solid #334",
  borderRadius: 4, color: "#ddd", fontSize: 12,
};

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 12px", background: active ? "#335" : "#1a1a2e",
    border: "1px solid #445", borderRadius: 4, color: active ? "#aaccff" : "#667",
    cursor: "pointer", fontSize: 12,
  };
}
