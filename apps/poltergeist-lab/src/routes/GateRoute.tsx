import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CameraGateSpirit,
  computeGateSpeed,
  computeGateRpm,
  detectCrossings,
  type NormalizedRoi,
} from "seance-core";

type GateMode = "period" | "speed" | "rpm";
type CameraState = "starting" | "camera" | "blocked";

const GATE_SIZE = { width: 0.1, height: 0.2 };
const HISTORY = 900; // ~30 s at 30 fps

const STEPS: Record<GateMode, { title: string; steps: string[] }> = {
  period: {
    title: "Pendulum period",
    steps: [
      "Hang a pendulum (keys on a string) where the camera can see it swing.",
      "Click the video where the bob passes at the bottom of its swing to put Gate 1 there.",
      "With the pendulum at rest OUTSIDE the gate, press Calibrate.",
      "Let it swing through the gate. Each full period is timed from every second gate entry.",
    ],
  },
  speed: {
    title: "Speed between two gates",
    steps: [
      "Click the video to place Gate 1, click again to place Gate 2 along the object's path.",
      "Measure the real distance between the two gates and type it in below.",
      "With nothing in the gates, press Calibrate.",
      "Roll or slide the object through Gate 1 then Gate 2: speed = distance ÷ time.",
    ],
  },
  rpm: {
    title: "Optical tachometer",
    steps: [
      "Point the camera at a fan or wheel; click the video to put Gate 1 over the blades' path.",
      "Enter how many blades/spokes it has.",
      "With it stopped, press Calibrate, then switch it on (keep fingers clear).",
      "Fast fans can alias: the camera only sees ~half its frame rate in blade passes per second.",
    ],
  },
};

interface Measured {
  readonly value: number;
  readonly unc: number;
  readonly unit: string;
  readonly note?: string;
}

export function GateRoute(): React.ReactElement {
  const [mode, setMode] = useState<GateMode>("period");
  const [camera, setCamera] = useState<CameraState>("starting");
  const [calibrated, setCalibrated] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [fps, setFps] = useState(0);
  const [roi1, setRoi1] = useState<NormalizedRoi>({ x: 0.45, y: 0.4, ...GATE_SIZE });
  const [roi2, setRoi2] = useState<NormalizedRoi>({ x: 0.7, y: 0.4, ...GATE_SIZE });
  const [nextGate, setNextGate] = useState<1 | 2>(1);
  const [distanceM, setDistanceM] = useState(0.2);
  const [blades, setBlades] = useState(3);
  const [result, setResult] = useState<Measured | null>(null);
  const [hint, setHint] = useState<string>("");
  const [nonce, setNonce] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const spiritRef = useRef<CameraGateSpirit | null>(null);
  const historyRef = useRef<{ t: number; v1: number; v2: number }[]>([]);
  const settingsRef = useRef({ mode, distanceM, blades, calibrated });
  settingsRef.current = { mode, distanceM, blades, calibrated };

  const resetMeasurement = useCallback(() => {
    historyRef.current = [];
    setResult(null);
    setHint("");
  }, []);

  // One camera session per visit (or per Retry). Gates and mode are pushed to it, not recreated.
  useEffect(() => {
    setCamera("starting");
    setCalibrated(false);
    const spirit = new CameraGateSpirit({ roi1, roi2 });
    spiritRef.current = spirit;
    let disposed = false;

    void spirit.summon().then(() => {
      if (disposed) return;
      if (spirit.source !== "camera" || !spirit.mediaStream) {
        setCamera("blocked"); // never show measurements from the synthetic fallback
        return;
      }
      setCamera("camera");
      const video = videoRef.current;
      if (video) {
        video.srcObject = spirit.mediaStream;
        void video.play().catch(() => {});
      }
    });

    const unsubscribe = spirit.stream("camera.gate").subscribe((batch) => {
      if (spirit.source !== "camera") return;
      for (let i = 0; i < batch.t.length; i++) {
        historyRef.current.push({ t: batch.t[i] ?? 0, v1: batch.values[0]?.[i] ?? 0, v2: batch.values[1]?.[i] ?? 0 });
      }
      if (historyRef.current.length > HISTORY) historyRef.current.splice(0, historyRef.current.length - HISTORY);
      setFps(Math.round(spirit.fps));
      const s = settingsRef.current;
      if (!s.calibrated) return;
      analyse(spirit, s.mode, s.distanceM, s.blades);
    });

    function analyse(sp: CameraGateSpirit, m: GateMode, dist: number, nBlades: number) {
      const h = historyRef.current;
      if (h.length < 20) return;
      const { roi1: c1, roi2: c2 } = sp.calibration;
      if (m === "period") {
        const enters = detectCrossings(h.map((x) => ({ t: x.t, v: x.v1 })), 0, Math.max(c1.sigma, 1), 4).filter(
          (e) => e.direction === "enter",
        );
        // The bob enters the gate twice per period (once each way): entry i → entry i+2 is one full period.
        const periods: number[] = [];
        for (let i = 0; i + 2 < enters.length; i++) periods.push((enters[i + 2]!.t - enters[i]!.t) / 1000);
        if (periods.length < 1) {
          setHint(enters.length ? `Seen ${enters.length} gate entr${enters.length === 1 ? "y" : "ies"} — keep it swinging…` : "Waiting for the bob to swing through the gate…");
          return;
        }
        const mean = periods.reduce((a, b) => a + b, 0) / periods.length;
        const sd = Math.sqrt(periods.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, periods.length - 1));
        const frameTerm = (Math.SQRT2 * (1 / Math.max(sp.fps, 1))) / Math.sqrt(12);
        setResult({
          value: mean,
          unc: Math.max(periods.length > 1 ? sd / Math.sqrt(periods.length) : frameTerm, frameTerm),
          unit: "s",
          note: `${periods.length} period${periods.length === 1 ? "" : "s"} timed`,
        });
        setHint("");
      } else if (m === "speed") {
        const e1 = detectCrossings(h.map((x) => ({ t: x.t, v: x.v1 })), 0, Math.max(c1.sigma, 1), 4).filter((e) => e.direction === "enter");
        const e2 = detectCrossings(h.map((x) => ({ t: x.t, v: x.v2 })), 0, Math.max(c2.sigma, 1), 4).filter((e) => e.direction === "enter");
        const first1 = e1.at(-1);
        const after = first1 ? e2.find((e) => e.t > first1.t) : undefined;
        if (!first1 || !after) {
          setHint("Waiting for the object to pass Gate 1 and then Gate 2…");
          return;
        }
        const r = computeGateSpeed(first1.t, after.t, dist, 0.002, sp.fps);
        setResult({ value: r.speedMPerS, unc: r.uncertaintyMPerS, unit: "m/s", note: `Δt = ${((after.t - first1.t) / 1000).toFixed(3)} s` });
        setHint("");
      } else {
        const r = computeGateRpm(h.map((x) => x.v1), sp.fps, nBlades);
        if (!(r.rpm > 0)) {
          setHint("Waiting for regular blade passes in the gate…");
          return;
        }
        const durationS = (h[h.length - 1]!.t - h[0]!.t) / 1000;
        setResult({
          value: r.rpm,
          unc: durationS > 0 ? (60 * (1 / durationS / 2)) / nBlades : r.rpm,
          unit: "rpm",
          note: r.isAliased ? r.warning : undefined,
        });
        setHint("");
      }
    }

    return () => {
      disposed = true;
      unsubscribe();
      void spirit.banish();
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // Gates/mode are applied through setRoi + settingsRef; only Retry restarts the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  useEffect(() => {
    spiritRef.current?.setRoi(1, roi1);
    spiritRef.current?.setRoi(2, roi2);
  }, [roi1, roi2]);

  // Changing what or where we measure invalidates the baseline and any result.
  useEffect(() => {
    setCalibrated(false);
    resetMeasurement();
  }, [mode, roi1, roi2, resetMeasurement]);

  const handleCalibrate = () => {
    const sp = spiritRef.current;
    if (!sp || camera !== "camera") return;
    resetMeasurement();
    setIsCalibrating(true);
    sp.startCalibration();
    setTimeout(() => {
      sp.stopCalibration();
      setIsCalibrating(false);
      setCalibrated(sp.calibrated);
    }, 2000);
  };

  const placeGate = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width;
    const cy = (e.clientY - r.top) / r.height;
    const roi = {
      x: Math.min(1 - GATE_SIZE.width, Math.max(0, cx - GATE_SIZE.width / 2)),
      y: Math.min(1 - GATE_SIZE.height, Math.max(0, cy - GATE_SIZE.height / 2)),
      ...GATE_SIZE,
    };
    if (mode === "speed" && nextGate === 2) {
      setRoi2(roi);
      setNextGate(1);
    } else {
      setRoi1(roi);
      if (mode === "speed") setNextGate(2);
    }
  };

  const gateBox = (roi: NormalizedRoi, label: string, color: string) => (
    <div
      style={{
        position: "absolute", left: `${roi.x * 100}%`, top: `${roi.y * 100}%`,
        width: `${roi.width * 100}%`, height: `${roi.height * 100}%`,
        border: `2px solid ${color}`, boxShadow: `0 0 10px ${color}`, background: "rgba(0,0,0,0.15)",
        color, fontSize: 11, fontFamily: "var(--sx-font-pixel)", display: "flex", alignItems: "flex-start",
        justifyContent: "center", paddingTop: 2, pointerEvents: "none",
      }}
    >
      {label}
    </div>
  );

  const guide = STEPS[mode];

  return (
    <main className="sx-page" style={{ maxWidth: 1040, margin: "0 auto" }}>
      <Link to="/session" className="sx-ghost-btn">&larr; Séance lobby</Link>
      <p className="sx-kicker" style={{ marginTop: 16 }}>Laptop camera · no phone needed</p>
      <h1 style={{ fontSize: "clamp(18px, 3.5vw, 28px)", margin: "8px 0 6px" }}>Apparition Gate</h1>
      <p className="sx-muted" style={{ marginBottom: 18, maxWidth: 720 }}>
        Your laptop&apos;s webcam becomes a light gate: it watches the small box you place on the video and notices
        when something passes through it, then times those moments.
      </p>

      <div role="tablist" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["period", "speed", "rpm"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setNextGate(1); }}
            className={mode === m ? "sx-btn sx-btn--small" : "sx-ghost-btn"}>
            {STEPS[m].title}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <section className="sx-box" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span className={camera === "camera" ? "sx-status-live" : "sx-status-wait"}>
              {camera === "starting" && "Asking for camera access…"}
              {camera === "camera" && (isCalibrating ? "Calibrating — keep the gate empty…" : calibrated ? "Measuring" : "Camera on — place the gate, then Calibrate")}
              {camera === "blocked" && "Camera not available"}
            </span>
            {camera === "camera" && <span className="sx-muted">{fps} fps</span>}
          </div>

          <div
            onClick={camera === "camera" ? placeGate : undefined}
            title={camera === "camera" ? "Click to place a gate here" : undefined}
            style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#0e0420", border: "1px solid var(--sx-line)", overflow: "hidden", cursor: camera === "camera" ? "crosshair" : "default" }}
          >
            <video ref={videoRef} muted playsInline autoPlay style={{ width: "100%", height: "100%", objectFit: "fill", display: camera === "camera" ? "block" : "none" }} />
            {camera === "camera" && (
              <div style={{ position: "absolute", inset: 0 }}>
                {gateBox(roi1, "1", "#00ffff")}
                {mode === "speed" && gateBox(roi2, "2", "#00ff99")}
              </div>
            )}
            {camera === "blocked" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 16, textAlign: "center" }}>
                <p>The browser didn&apos;t give this page the camera (permission denied, no webcam, or another app is using it).</p>
                <p className="sx-muted" style={{ fontSize: 14 }}>Allow camera access in the address bar, then retry.</p>
                <button className="sx-btn sx-btn--small" onClick={() => setNonce((n) => n + 1)}>Retry camera</button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button className="sx-btn sx-btn--cyan sx-btn--small" onClick={handleCalibrate} disabled={camera !== "camera" || isCalibrating}>
              {isCalibrating ? "Calibrating…" : calibrated ? "Recalibrate" : "Calibrate"}
            </button>
            {mode === "speed" && camera === "camera" && (
              <span className="sx-muted" style={{ fontSize: 14 }}>Next click places Gate {nextGate}</span>
            )}
          </div>
        </section>

        <section className="sx-box sx-box--pink" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>{guide.title}</h2>
          <ol style={{ paddingLeft: 20, lineHeight: 1.5, marginBottom: 14 }}>
            {guide.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>

          {mode === "speed" && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              Distance between gates
              <input type="number" min={0.01} step={0.01} value={distanceM} onChange={(e) => setDistanceM(Math.max(0.01, Number(e.target.value) || 0.01))} style={{ width: 90, padding: 4 }} /> m
            </label>
          )}
          {mode === "rpm" && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              Blades / spokes
              <input type="number" min={1} max={12} step={1} value={blades} onChange={(e) => setBlades(Math.min(12, Math.max(1, Math.round(Number(e.target.value) || 1))))} style={{ width: 70, padding: 4 }} />
            </label>
          )}

          <div style={{ borderTop: "1px solid var(--sx-line)", paddingTop: 12 }}>
            <p className="sx-muted" style={{ fontSize: 14 }}>Measurement</p>
            {result ? (
              <>
                <p className="sx-glow-cyan" style={{ fontSize: 30, fontFamily: "var(--sx-font-display)", margin: "6px 0" }}>
                  {result.value.toFixed(result.unit === "rpm" ? 0 : 3)} ± {result.unc.toFixed(result.unit === "rpm" ? 0 : 3)} {result.unit}
                </p>
                {result.note && <p className="sx-muted" style={{ fontSize: 14 }}>{result.note}</p>}
              </>
            ) : (
              <p style={{ fontSize: 16, margin: "6px 0" }} className="sx-muted">
                {camera !== "camera" ? "Needs the camera." : !calibrated ? "Calibrate first — no numbers until then." : hint || "Waiting for something to pass the gate…"}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
