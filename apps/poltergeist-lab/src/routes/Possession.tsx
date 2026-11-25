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
import { useLiveRoom, useLiveBatches, playerLabel } from "../live/LiveRoom.js";
import { ShakeTrigger } from "../live/shake.js";
import { Ghost, MOOD_NEON } from "seance-avatars";


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
      <p style={{ fontSize: 14, color: "#b0a6cc" }}>{c.plain}</p>
      {step === "still" && (
        <div style={{ marginTop: 12, width: 200, height: 6, background: "#1f0a35", borderRadius: 3, margin: "12px auto 0" }}>
          <div style={{
            width: `${Math.min(stillProgress, 100)}%`, height: "100%",
            background: "rgba(0,255,255,0.6)", borderRadius: 3, transition: "width 0.1s",
          }} />
        </div>
      )}
      {step !== "doors" && step !== "summoning" && (
        <button onClick={onSkip} style={{
          marginTop: 16, background: "none", border: "none", color: "#76679f",
          fontSize: 12, cursor: "pointer", textDecoration: "underline",
        }}>Skip tutorial</button>
      )}
    </div>
  );
}

function Doors({ roomCode, onLab }: { roomCode: string; onLab: () => void }) {
  const doorStyle = (bg: string): React.CSSProperties => ({
    flex: 1, maxWidth: 260, padding: "32px 24px", background: bg,
    border: "1px solid #3d2466", borderRadius: 12, cursor: "pointer",
    textAlign: "center", transition: "transform 0.2s, box-shadow 0.2s",
  });
  return (
    <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
      <button onClick={onLab} style={doorStyle("linear-gradient(180deg, #1f0a35 0%, #0c0418 100%)")}>
        <p style={{ fontSize: 20, fontWeight: 400, marginBottom: 8 }}>Poltergeist Lab</p>
        <p style={{ fontSize: 13, color: "#b4a9d6" }}>Measure the world with your phone.</p>
      </button>
      <a href="/choir/" style={{ ...doorStyle("linear-gradient(180deg, #2a1a2a 0%, #1a0d1a 100%)"), textDecoration: "none", color: "inherit" }}>
        <p style={{ fontSize: 20, fontWeight: 400, marginBottom: 8 }}>Banshee Choir</p>
        <p style={{ fontSize: 13, color: "#d9a6c9" }}>Turn motion into music, together.</p>
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
      <p style={{ fontSize: 18, marginBottom: 12, color: "#ff3b8d" }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: "10px 24px", background: "#2a0a4a",
          border: "1px solid #5a2d8c", color: "#e6e0ff", borderRadius: 6, cursor: "pointer",
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
  const [ghostQuat, setGhostQuat] = useState<Quaternion | null>(null);
  const [dizzy, setDizzy] = useState(0);
  const shakeTriggerRef = useRef(new ShakeTrigger());
  const [shakeValue, setShakeValue] = useState(0);
  const [stillProgress, setStillProgress] = useState(0);
  const [peakShake, setPeakShake] = useState(0);
  const [disconnectMsg, setDisconnectMsg] = useState<string | null>(null);

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

  // The message handler is registered once per room, so it must read live values through refs
  // (plain state would be frozen at its initial value and the tutorial would never advance).
  const tutorialStepRef = useRef<TutorialStep>(tutorialStep);
  const viewStateRef = useRef<ViewState>(viewState);
  useEffect(() => { tutorialStepRef.current = tutorialStep; }, [tutorialStep]);
  useEffect(() => { viewStateRef.current = viewState; }, [viewState]);

  // The app-wide séance room: the phone joined once (on the home page) and keeps streaming while
  // the laptop moves between pages. This view just follows it.
  const room = useLiveRoom();
  const phoneCount = room.phones.length;
  useEffect(() => {
    if (room.status === "ready" && room.code && code && room.code !== code) {
      navigate(`/possession/${room.code}`, { replace: true }); // stale link: follow the live room
      return;
    }
    if (room.status === "error") {
      setDisconnectMsg(room.error ?? "The veil is thick tonight. We can't reach the séance server.");
      return;
    }
    setDisconnectMsg(null);
    if (room.status !== "ready") {
      setViewState((v) => (v === "possessed" ? v : "connecting"));
    } else if (phoneCount > 0) {
      setViewState("possessed");
      setMood((m) => (m === "fading" ? "uneasy" : m));
      setTutorialStep((t) => (t === "summoning" ? "tilt" : t));
    } else {
      const v = viewStateRef.current;
      if (v === "possessed") setMood("fading");
      setViewState(v === "possessed" || v === "fading" ? "fading" : "summoning");
    }
  }, [room.status, room.code, room.error, phoneCount, code, navigate]);

  useLiveBatches((_peerId, batch) => {
    if (shakeTriggerRef.current.feed(batch)) setDizzy((n) => n + 1);
    const orientation = batch.channels["orientation"];
    const accelG = batch.channels["accelG"];
    const step = tutorialStepRef.current;

    if (orientation && orientation.t.length > 0) {
      const i = orientation.t.length - 1;
      // Radians, as sent by the phone page (deviceOrientationToQuaternion expects radians).
      const alpha = orientation.values[0]![i]!;
      const beta = orientation.values[1]![i]!;
      const gamma = orientation.values[2]![i]!;

      const qNow = deviceOrientationToQuaternion(alpha, beta, gamma);
      if (!refPoseRef.current) refPoseRef.current = qNow.clone();
      const displayQuat = refPoseRef.current
        ? computeGhostRotation(qNow, refPoseRef.current, new Quaternion())
        : qNow;

      const smoothed = smoothStep(prevQuatRef.current, displayQuat, 1 / 60);
      prevQuatRef.current = smoothed;

      const euler = new Euler().setFromQuaternion(smoothed, "YXZ");
      const pitch = euler.x * (180 / Math.PI);
      const yaw = euler.y * (180 / Math.PI);
      const roll = euler.z * (180 / Math.PI);
      setGhostQuat(smoothed.clone());

      const totalRotation = Math.abs(pitch) + Math.abs(yaw) + Math.abs(roll);
      if (!tiltDetectedRef.current && totalRotation > TILT_THRESHOLD && step === "tilt") {
        tiltDetectedRef.current = true;
        setTimeout(() => setTutorialStep("shake"), 1500);
      }

      if (step === "still") {
        // "Still" means not rotating: use the latest gyro magnitude when available.
        const gyro = batch.channels["gyro"];
        const gi = gyro ? gyro.t.length - 1 : -1;
        const spin = gyro && gi >= 0
          ? Math.hypot(gyro.values[0]![gi]!, gyro.values[1]![gi]!, gyro.values[2]![gi]!)
          : 0;
        if (spin < 0.15) {
          if (!stillStartRef.current) stillStartRef.current = Date.now();
          const elapsed = Date.now() - stillStartRef.current;
          setStillProgress(Math.min(100, (elapsed / STILL_DURATION_MS) * 100));
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

    if (accelG && accelG.t.length > 0) {
      const i = accelG.t.length - 1;
      const mag = Math.hypot(accelG.values[0]![i]!, accelG.values[1]![i]!, accelG.values[2]![i]!);
      const shakeAboveGravity = Math.max(0, mag - 9.81);
      setShakeValue(shakeAboveGravity);
      setPeakShake((p) => Math.max(p, shakeAboveGravity));
      if (!shakeDetectedRef.current && shakeAboveGravity > SHAKE_THRESHOLD && step === "shake") {
        shakeDetectedRef.current = true;
        setTimeout(() => setTutorialStep("still"), 1500);
      }
    }

    if (viewStateRef.current === "fading") {
      setViewState("possessed");
      setMood("uneasy");
    }
  });


  const moodCopy = MOOD_COPY[mood];

  return (
    <main className="sx-page" style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      {disconnectMsg && (
        <DisconnectOverlay
          message={disconnectMsg}
          onRetry={room.retry}
        />
      )}

      {viewState === "connecting" && (
        <p style={{ fontSize: 18, color: "#b0a6cc" }}>Opening the circle...</p>
      )}

      {viewState === "summoning" && (
        <div style={{ textAlign: "center" }}>
          <div aria-hidden="true" style={{
            width: 200, height: 200, borderRadius: "50%",
            border: "2px solid rgba(0,255,255,0.3)",
            boxShadow: "0 0 60px rgba(0,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", animation: "pulse 3s ease-in-out infinite",
          }}>
            <span style={{ fontSize: 14, color: "#8a7bb5" }}>The circle is open</span>
          </div>
          <p style={{ fontSize: 18, color: "#b4a9d6" }}>Waiting for a spirit to join...</p>
          <p style={{ fontSize: 13, color: "#76679f", marginTop: 8 }}>
            Scan the QR code on the landing page, or drag the ghost below.
          </p>
          <div className="sx-box" style={{ marginTop: 24, width: "min(92vw, 520px)" }}>
            <Ghost height={340} mood="calm" label="3D ghost waiting for a phone. Drag to look around it." />
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
            <div className="sx-box" style={{ width: "min(92vw, 620px)" }}>
              <Ghost
                height={420}
                color={MOOD_NEON[mood]}
                quaternion={ghostQuat}
                shake={reducedMotion ? 0 : Math.min(1, shakeValue / 20)}
                dizzy={dizzy}
                name={room.players[0] ? playerLabel(room.players, room.players[0].id) : undefined}
                label="3D ghost following your phone. Drag to look at it from any angle; shake the phone to make it dizzy."
              />
            </div>
            {viewState === "fading" && (
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  border: "2px solid rgba(0,255,255,0.3)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}
            title={moodCopy.plain}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: mood === "calm" ? "#00ff99" : mood === "uneasy" ? "#a84" : mood === "restless" ? "#a44" : "#66a",
              display: "inline-block",
            }} />
            <span style={{ fontSize: 13, color: "#b4a9d6" }}>{moodCopy.spooky}</span>
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
