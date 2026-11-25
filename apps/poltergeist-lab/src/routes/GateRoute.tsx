import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  CameraGateSpirit,
  computeGatePeriod,
  computeGateSpeed,
  computeGateRpm,
  detectCrossings,
  type CrossingEvent,
  type NormalizedRoi,
} from "seance-core";

type GateMode = "period" | "speed" | "rpm";

export function GateRoute(): React.ReactElement {
  const [mode, setMode] = useState<GateMode>("period");
  const [status, setStatus] = useState<string>("Initializing photogate...");
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(30);
  const [roi1, setRoi1] = useState<NormalizedRoi>({ x: 0.35, y: 0.4, width: 0.1, height: 0.2 });
  const [roi2, setRoi2] = useState<NormalizedRoi>({ x: 0.65, y: 0.4, width: 0.1, height: 0.2 });

  // Measurements
  const [periodRes, setPeriodRes] = useState<{ period: number; unc: number } | null>(null);
  const [speedRes, setSpeedRes] = useState<{ speed: number; unc: number } | null>(null);
  const [rpmRes, setRpmRes] = useState<{ rpm: number; isAliased: boolean; warning?: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spiritRef = useRef<CameraGateSpirit | null>(null);
  const signalHistoryRef = useRef<{ t: number; v1: number; v2: number }[]>([]);

  useEffect(() => {
    const spirit = new CameraGateSpirit({
      roi1,
      roi2,
    });
    spiritRef.current = spirit;

    spirit.summon().then(() => {
      setStatus("Photogate active (Laptop webcam)");
    }).catch(() => {
      setStatus("Webcam unavailable — running synthetic photogate");
    });

    const unsubscribe = spirit.stream("camera.gate").subscribe((batch) => {
      const len = batch.t.length;
      for (let i = 0; i < len; i++) {
        const t = batch.t[i] ?? 0;
        const v1 = batch.values[0]?.[i] ?? 0;
        const v2 = batch.values[1]?.[i] ?? 0;
        signalHistoryRef.current.push({ t, v1, v2 });
        if (signalHistoryRef.current.length > 300) {
          signalHistoryRef.current.shift();
        }
      }

      setFps(Math.round(spirit.fps));

      // Periodic analysis
      const history = signalHistoryRef.current;
      if (history.length > 20) {
        if (mode === "period") {
          const events = detectCrossings(
            history.map((h) => ({ t: h.t, v: h.v1 })),
            0,
            10,
            2.0,
          );
          const p = computeGatePeriod(events, spirit.fps);
          if (p.cycleCount > 0) {
            setPeriodRes({ period: p.periodS, unc: p.uncertaintyS });
          }
        } else if (mode === "speed") {
          let max1 = 0;
          let t1 = 0;
          let max2 = 0;
          let t2 = 0;
          for (const h of history) {
            if (h.v1 > max1) {
              max1 = h.v1;
              t1 = h.t;
            }
            if (h.v2 > max2) {
              max2 = h.v2;
              t2 = h.t;
            }
          }
          if (max1 > 15 && max2 > 15 && Math.abs(t2 - t1) > 10) {
            const s = computeGateSpeed(t1, t2, 0.2, 0.002, spirit.fps);
            setSpeedRes({ speed: s.speedMPerS, unc: s.uncertaintyMPerS });
          }
        } else if (mode === "rpm") {
          const sig = history.map((h) => h.v1);
          const r = computeGateRpm(sig, spirit.fps, 3, 25);
          setRpmRes({ rpm: r.rpm, isAliased: r.isAliased, warning: r.warning });
        }
      }
    });

    return () => {
      unsubscribe();
      spirit.banish();
    };
  }, [mode]);

  // Calibration action
  const handleCalibrate = () => {
    if (!spiritRef.current) return;
    setIsCalibrating(true);
    setStatus("Calibrating quiescent baseline (Hold still)...");
    spiritRef.current.startCalibration();
    setTimeout(() => {
      spiritRef.current?.stopCalibration();
      setIsCalibrating(false);
      setStatus("Baseline calibrated");
    }, 2000);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", color: "#eee8ff", fontFamily: "monospace" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <Link to="/" style={{ color: "#00e5ff", textDecoration: "none" }}>&larr; Back to Lab</Link>
        <h1 style={{ fontSize: "1.8rem", margin: "0.5rem 0 0.25rem", color: "#f5f0ff" }}>
          Apparition Gate
        </h1>
        <p style={{ color: "#b4a9d6", margin: 0 }}>
          Contactless optical photogate & tachometer (Runs laptop-only with your camera)
        </p>
      </header>

      {/* Mode selection tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setMode("period")}
          style={{
            padding: "0.5rem 1rem",
            background: mode === "period" ? "#00b377" : "#1f0a35",
            color: "#fff",
            border: "1px solid #3d2466",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Pendulum Period
        </button>
        <button
          onClick={() => setMode("speed")}
          style={{
            padding: "0.5rem 1rem",
            background: mode === "speed" ? "#00b377" : "#1f0a35",
            color: "#fff",
            border: "1px solid #3d2466",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Speed (Two Gates)
        </button>
        <button
          onClick={() => setMode("rpm")}
          style={{
            padding: "0.5rem 1rem",
            background: mode === "rpm" ? "#00b377" : "#1f0a35",
            color: "#fff",
            border: "1px solid #3d2466",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Optical Tachometer (RPM)
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Gate Visualizer */}
        <div style={{ background: "#140726", border: "1px solid #3d2466", borderRadius: 8, padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#b4a9d6" }}>Status: {status}</span>
            <span style={{ fontSize: "0.9rem", color: "#b4a9d6" }}>FPS: {fps}</span>
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              height: 240,
              background: "#0e0420",
              border: "1px dashed #3d2466",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {/* ROI 1 Overlay */}
            <div
              style={{
                position: "absolute",
                left: `${roi1.x * 100}%`,
                top: `${roi1.y * 100}%`,
                width: `${roi1.width * 100}%`,
                height: `${roi1.height * 100}%`,
                border: "2px solid #00e5ff",
                background: "rgba(88, 166, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                color: "#00e5ff",
              }}
            >
              Gate 1
            </div>

            {/* ROI 2 Overlay */}
            {mode === "speed" && (
              <div
                style={{
                  position: "absolute",
                  left: `${roi2.x * 100}%`,
                  top: `${roi2.y * 100}%`,
                  width: `${roi2.width * 100}%`,
                  height: `${roi2.height * 100}%`,
                  border: "2px solid #00ff99",
                  background: "rgba(63, 185, 80, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  color: "#00ff99",
                }}
              >
                Gate 2
              </div>
            )}
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleCalibrate}
              disabled={isCalibrating}
              style={{
                padding: "0.5rem 1rem",
                background: isCalibrating ? "#b4a9d6" : "#008a99",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: isCalibrating ? "default" : "pointer",
              }}
            >
              {isCalibrating ? "Calibrating..." : "Calibrate Baseline"}
            </button>
          </div>
        </div>

        {/* Readout & Verdict */}
        <div style={{ background: "#140726", border: "1px solid #3d2466", borderRadius: 8, padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem", color: "#f5f0ff" }}>
            Optical Measurement
          </h2>

          {mode === "period" && (
            <div>
              <p style={{ color: "#b4a9d6", fontSize: "0.9rem" }}>Pendulum Period (T)</p>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#00e5ff", margin: "0.5rem 0" }}>
                {periodRes ? `${periodRes.period.toFixed(3)} ± ${periodRes.unc.toFixed(3)} s` : "Waiting for swing..."}
              </div>
              <p style={{ fontSize: "0.85rem", color: "#b4a9d6" }}>
                Method: Successive optical same-direction crossings with linear sub-frame interpolation.
              </p>
            </div>
          )}

          {mode === "speed" && (
            <div>
              <p style={{ color: "#b4a9d6", fontSize: "0.9rem" }}>Velocity (v = d / Δt)</p>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#00ff99", margin: "0.5rem 0" }}>
                {speedRes ? `${speedRes.speed.toFixed(2)} ± ${speedRes.unc.toFixed(2)} m/s` : "Roll marble across Gate 1 & 2..."}
              </div>
              <p style={{ fontSize: "0.85rem", color: "#b4a9d6" }}>
                Gate separation: 0.200 ± 0.002 m. Uncertainty propagated non-linearly.
              </p>
            </div>
          )}

          {mode === "rpm" && (
            <div>
              <p style={{ color: "#b4a9d6", fontSize: "0.9rem" }}>Rotation Speed</p>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ffe066", margin: "0.5rem 0" }}>
                {rpmRes ? `${rpmRes.rpm.toFixed(0)} rpm` : "Point camera at fan or wheel..."}
              </div>
              {rpmRes?.isAliased && (
                <div style={{ background: "#381804", border: "1px solid #ffe066", padding: "0.75rem", borderRadius: 6, marginTop: "0.75rem" }}>
                  <strong style={{ color: "#ff7a00" }}>Stroboscopic Nyquist Aliasing</strong>
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0", color: "#eee8ff" }}>
                    {rpmRes.warning}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
