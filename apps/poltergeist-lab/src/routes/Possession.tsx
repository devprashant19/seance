import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  deviceOrientationToQuaternion,
  computeGhostRotation,
  smoothStep,
  moodVisuals,
  MOOD_COPY,
} from "seance-avatars";
import { Quaternion, Euler } from "three";
import type { Mood } from "seance-core";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "ws://localhost:4000";

type TutorialStep = "summoning" | "tilt" | "shake" | "still" | "doors";
type ViewState = "connecting" | "summoning" | "possessed" | "fading" | "relay_down";

interface OrientationFrame {
  readonly alpha: number;
  readonly beta: number;
  readonly gamma: number;
}

interface ShakeFrame {
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
}

const STILL_DURATION_MS = 2000;
const SHAKE_THRESHOLD = 15;
const TILT_THRESHOLD = 20;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function TutorialGuide({
  step,
  shakeValue,
  stillProgress,
  onSkip,
}: {
  step: TutorialStep;
  shakeValue: number;
  stillProgress: number;
  onSkip: () => void;
}) {
  const copy = {
    tilt: { spooky: "Tilt me.", plain: "I follow your phone's motion sensors." },
    shake: { spooky: "Shake me.", plain: `Peak: ${shakeValue.toFixed(1)} m/s²` },
    still: { spooky: "Hold still.", plain: "Measuring the sensor's resting bias." },
    doors: { spooky: "The spirit is calm.", plain: "Calibrated. You can start an experiment." },
    summoning: { spooky: "A spirit approaches...", plain: "Waiting for connection." },
  };
  const c = copy[step];
  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <p style={{ fontSize: 24, fontWeight: 300, marginBottom: 4, letterSpacing: 1 }}>{c.spooky}</p>
      <p style={{ fontSize: 14, color: "#888" }}>{c.plain}</p>
      {step === "still" && (
        <div style={{ marginTop: 12, width: 200, height: 6, background: "#222", borderRadius: 3, margin: "12px auto 0" }}>
          <div style={{
            width: `${Math.min(stillProgress, 100)}%`, height: "100%",
            background: "rgba(100,140,255,0.6)", borderRadius: 3, transition: "width 0.1s",
          }} />
        </div>
      )}
      {step !== "doors" && step !== "summoning" && (
        <button onClick={onSkip} style={{
          marginTop: 16, background: "none", border: "none", color: "#555",
          fontSize: 12, cursor: "pointer", textDecoration: "underline",
        }}>Skip tutorial</button>
      )}
    </div>
  );
}

function GhostVisual({
  rotation,
  mood,
  reducedMotion,
  shakeIntensity,
}: {
  rotation: { x: number; y: number; z: number };
  mood: Mood;
  reducedMotion: boolean;
  shakeIntensity: number;
}) {
  const visuals = moodVisuals(mood, 60, 60);
  const hueRotate = visuals.hue - 165;
  const jitter = Math.min(shakeIntensity * 0.3, 8);

  if (reducedMotion) {
    return (
      <div style={{
        width: 200, height: 240, display: "flex", alignItems: "center",
        justifyContent: "center", opacity: visuals.opacity,
        transform: `rotate(${rotation.z}deg)`,
        filter: `hue-rotate(${hueRotate}deg)`,
        transition: "transform 0.15s ease-out, opacity 0.3s",
      }}>
        <svg viewBox="0 0 100 130" width={160} height={200}>
          <defs>
            <radialGradient id="ghost-glow" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor={`hsl(${visuals.hue}, 60%, 80%)`} stopOpacity={visuals.glow} />
              <stop offset="100%" stopColor={`hsl(${visuals.hue}, 60%, 40%)`} stopOpacity={0.1} />
            </radialGradient>
          </defs>
          <ellipse cx={50} cy={50} rx={30} ry={40} fill="url(#ghost-glow)" />
          <path d="M20 50 Q20 110 30 120 Q35 105 40 120 Q45 105 50 120 Q55 105 60 120 Q65 105 70 120 Q80 110 80 50"
            fill="url(#ghost-glow)" opacity={0.6} />
          <circle cx={40} cy={42} r={4} fill="#fff" opacity={0.9} />
          <circle cx={60} cy={42} r={4} fill="#fff" opacity={0.9} />
          <circle cx={50} cy={35} r={6} fill={`hsl(${visuals.hue}, 70%, 70%)`} opacity={visuals.glow * 0.8}>
            <animate attributeName="opacity" values={`${visuals.glow * 0.5};${visuals.glow};${visuals.glow * 0.5}`}
              dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    );
  }

  return (
    <div style={{
      width: 240, height: 300, display: "flex", alignItems: "center",
      justifyContent: "center", opacity: visuals.opacity,
      transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg) translate(${jitter * (Math.random() - 0.5)}px, ${jitter * (Math.random() - 0.5)}px)`,
      filter: `hue-rotate(${hueRotate}deg) drop-shadow(0 0 ${visuals.glow * 30}px hsl(${visuals.hue}, 60%, 50%))`,
      transition: "opacity 0.3s",
      perspective: 800,
    }}>
      <svg viewBox="0 0 100 140" width={200} height={260}>
        <defs>
          <radialGradient id="ghost-body" cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor={`hsl(${visuals.hue}, 50%, 85%)`} stopOpacity={0.9} />
            <stop offset="70%" stopColor={`hsl(${visuals.hue}, 50%, 55%)`} stopOpacity={0.4} />
            <stop offset="100%" stopColor={`hsl(${visuals.hue}, 50%, 30%)`} stopOpacity={0.1} />
          </radialGradient>
          <filter id="ghost-blur">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>
        <ellipse cx={50} cy={45} rx={32} ry={42} fill="url(#ghost-body)" filter="url(#ghost-blur)" />
        <path d="M18 45 Q18 115 28 130 Q33 112 38 130 Q43 112 50 130 Q57 112 62 130 Q67 112 72 130 Q82 115 82 45"
          fill="url(#ghost-body)" opacity={0.5} />
        <circle cx={40} cy={38} r={5} fill="#fff" opacity={0.95}>
          <animate attributeName="r" values="5;4.5;5" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={60} cy={38} r={5} fill="#fff" opacity={0.95}>
          <animate attributeName="r" values="5;4.5;5" dur="3s" begin="0.2s" repeatCount="indefinite" />
        </circle>
        <circle cx={50} cy={28} r={8} fill={`hsl(${visuals.hue}, 70%, 70%)`} opacity={visuals.glow}>
          <animate attributeName="opacity" values={`${visuals.glow * 0.4};${visuals.glow};${visuals.glow * 0.4}`}
            dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="r" values="8;9;8" dur="2s" repeatCount="indefinite" />
        </circle>
        <ellipse cx={50} cy={58} rx={7} ry={4} fill="none" stroke={`hsl(${visuals.hue}, 50%, 70%)`}
          strokeWidth={1.2} opacity={0.6} />
      </svg>
    </div>
  );
}

function Doors({ roomCode, onLab }: { roomCode: string; onLab: () => void }) {
  const doorStyle = (bg: string): React.CSSProperties => ({
    flex: 1, maxWidth: 260, padding: "32px 24px", background: bg,
    border: "1px solid #334", borderRadius: 12, cursor: "pointer",
    textAlign: "center", transition: "transform 0.2s, box-shadow 0.2s",
  });
  return (
    <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
      <button onClick={onLab} style={doorStyle("linear-gradient(180deg, #1a1a3a 0%, #0d0d2a 100%)")}>
        <p style={{ fontSize: 20, fontWeight: 400, marginBottom: 8 }}>Poltergeist Lab</p>
        <p style={{ fontSize: 13, color: "#889" }}>Measure the world with your phone.</p>
      </button>
      <a href={`/choir?room=${roomCode}`} style={{ ...doorStyle("linear-gradient(180deg, #2a1a2a 0%, #1a0d1a 100%)"), textDecoration: "none", color: "inherit" }}>
        <p style={{ fontSize: 20, fontWeight: 400, marginBottom: 8 }}>Banshee Choir</p>
        <p style={{ fontSize: 13, color: "#988" }}>Turn motion into music, together.</p>
      </a>
    </div>
  );
}

function DisconnectOverlay({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", zIndex: 100, padding: 24,
    }}>
      <p style={{ fontSize: 18, marginBottom: 12, color: "#ff8866" }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: "10px 24px", background: "#223355",
          border: "1px solid #446", color: "#ccd", borderRadius: 6, cursor: "pointer",
        }}>Try Again</button>
      )}
    </div>
  );
}

export function Possession() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [viewState, setViewState] = useState<ViewState>("connecting");
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>("summoning");
  const [mood, setMood] = useState<Mood>("uneasy");
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [shakeValue, setShakeValue] = useState(0);
  const [stillProgress, setStillProgress] = useState(0);
  const [peakShake, setPeakShake] = useState(0);
  const [disconnectMsg, setDisconnectMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const refPoseRef = useRef<Quaternion | null>(null);
  const stillStartRef = useRef<number | null>(null);
  const prevQuatRef = useRef(new Quaternion());
  const tiltDetectedRef = useRef(false);
  const shakeDetectedRef = useRef(false);

  const handleSkipTutorial = useCallback(() => {
    setTutorialStep("doors");
    setMood("calm");
  }, []);

  const handleGoToLab = useCallback(() => {
    navigate(`/lab?room=${code}`);
  }, [navigate, code]);

  useEffect(() => {
    if (!code) {
      setDisconnectMsg("No room code.");
      return;
    }

    const ws = new WebSocket(RELAY_URL);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "hello", version: 1, role: "host", roomCode: code }));
    });

    ws.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data as string);

        if (msg.type === "welcome") {
          setViewState("summoning");
          return;
        }

        if (msg.type === "peer-joined") {
          setViewState("possessed");
          if (tutorialStep === "summoning") setTutorialStep("tilt");
          return;
        }

        if (msg.type === "room-paused" || msg.type === "peer-left") {
          setViewState("fading");
          setMood("fading");
          return;
        }

        if (msg.type === "batch" && msg.channels) {
          const orientationSamples = msg.channels.orientation as Array<{ t: number; v: number[] }> | undefined;
          const accelSamples = msg.channels.accel as Array<{ t: number; v: number[] }> | undefined;

          if (orientationSamples && orientationSamples.length > 0) {
            const last = orientationSamples[orientationSamples.length - 1]!;
            const [alpha, beta, gamma] = last.v as [number, number, number];

            const qNow = deviceOrientationToQuaternion(alpha, beta, gamma);
            let displayQuat: Quaternion;

            if (refPoseRef.current) {
              const yHeading = new Quaternion();
              displayQuat = computeGhostRotation(qNow, refPoseRef.current, yHeading);
            } else {
              displayQuat = qNow;
            }

            const smoothed = smoothStep(prevQuatRef.current, displayQuat, 1 / 60);
            prevQuatRef.current = smoothed;

            const euler = new Euler().setFromQuaternion(smoothed, "YXZ");
            const pitch = euler.x * (180 / Math.PI);
            const yaw = euler.y * (180 / Math.PI);
            const roll = euler.z * (180 / Math.PI);

            setRotation({ x: pitch, y: yaw, z: roll });

            const totalRotation = Math.abs(pitch) + Math.abs(yaw) + Math.abs(roll);
            if (!tiltDetectedRef.current && totalRotation > TILT_THRESHOLD && tutorialStep === "tilt") {
              tiltDetectedRef.current = true;
              setTimeout(() => setTutorialStep("shake"), 1500);
            }

            if (tutorialStep === "still") {
              if (totalRotation < 5) {
                if (!stillStartRef.current) stillStartRef.current = Date.now();
                const elapsed = Date.now() - stillStartRef.current;
                setStillProgress((elapsed / STILL_DURATION_MS) * 100);
                if (elapsed >= STILL_DURATION_MS) {
                  refPoseRef.current = qNow.clone();
                  setTutorialStep("doors");
                  setMood("calm");
                }
              } else {
                stillStartRef.current = null;
                setStillProgress(0);
              }
            }
          }

          if (accelSamples && accelSamples.length > 0) {
            const last = accelSamples[accelSamples.length - 1]!;
            const [ax, ay, az] = last.v as [number, number, number];
            const mag = Math.sqrt(ax * ax + ay * ay + az * az);
            const shakeAboveGravity = Math.max(0, mag - 9.81);
            setShakeValue(shakeAboveGravity);
            if (shakeAboveGravity > peakShake) setPeakShake(shakeAboveGravity);

            if (!shakeDetectedRef.current && shakeAboveGravity > SHAKE_THRESHOLD && tutorialStep === "shake") {
              shakeDetectedRef.current = true;
              setTimeout(() => setTutorialStep("still"), 1500);
            }
          }

          if (viewState === "fading") {
            setViewState("possessed");
            setMood("uneasy");
          }
        }
      } catch { /* ignore parse errors */ }
    });

    ws.addEventListener("error", () => {
      setViewState("relay_down");
      setDisconnectMsg("The veil is thick tonight. We can't reach the séance server.");
    });

    ws.addEventListener("close", () => {
      if (viewState !== "relay_down") {
        setViewState("fading");
      }
    });

    return () => { ws.close(); };
  }, [code]);

  const handleDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (viewState !== "summoning") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setRotation({ x: dy * -30, y: dx * 30, z: 0 });
  }, [viewState]);

  const moodCopy = MOOD_COPY[mood];

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 16,
      background: "radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 70%)",
      color: "#ddd", position: "relative", overflow: "hidden",
    }}>
      {disconnectMsg && (
        <DisconnectOverlay
          message={disconnectMsg}
          onRetry={() => window.location.reload()}
        />
      )}

      {viewState === "connecting" && (
        <p style={{ fontSize: 18, color: "#888" }}>Opening the circle...</p>
      )}

      {viewState === "summoning" && (
        <div style={{ textAlign: "center" }}>
          <div aria-hidden="true" style={{
            width: 200, height: 200, borderRadius: "50%",
            border: "2px solid rgba(100,140,255,0.3)",
            boxShadow: "0 0 60px rgba(100,140,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", animation: "pulse 3s ease-in-out infinite",
          }}>
            <span style={{ fontSize: 14, color: "#667" }}>The circle is open</span>
          </div>
          <p style={{ fontSize: 18, color: "#889" }}>Waiting for a spirit to join...</p>
          <p style={{ fontSize: 13, color: "#556", marginTop: 8 }}>
            Scan the QR code on the landing page, or drag the ghost below.
          </p>
          <div
            onMouseMove={handleDrag}
            style={{ marginTop: 24, cursor: "grab" }}
          >
            <GhostVisual rotation={rotation} mood="calm" reducedMotion={reducedMotion} shakeIntensity={0} />
          </div>
        </div>
      )}

      {(viewState === "possessed" || viewState === "fading") && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <TutorialGuide
            step={tutorialStep}
            shakeValue={peakShake}
            stillProgress={stillProgress}
            onSkip={handleSkipTutorial}
          />

          <div style={{ position: "relative" }}>
            <GhostVisual
              rotation={rotation}
              mood={mood}
              reducedMotion={reducedMotion}
              shakeIntensity={shakeValue}
            />
            {viewState === "fading" && (
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  border: "2px solid rgba(100,140,255,0.3)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}
            title={moodCopy.plain}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: mood === "calm" ? "#4a8" : mood === "uneasy" ? "#a84" : mood === "restless" ? "#a44" : "#66a",
              display: "inline-block",
            }} />
            <span style={{ fontSize: 13, color: "#889" }}>{moodCopy.spooky}</span>
          </div>

          {tutorialStep === "doors" && code && (
            <Doors roomCode={code} onLab={handleGoToLab} />
          )}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:.7; transform:scale(1); } 50% { opacity:1; transform:scale(1.05); } }`}</style>
    </main>
  );
}
