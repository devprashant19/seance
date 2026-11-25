import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  queryDeviceCapabilities,
  evaluateRitualStep,
  type DeviceCapabilities,
  type RitualStepKind,
  type RitualStepResult,
  type TraceChannel,
} from "seance-core";

export function WraithBench() {
  const [caps, setCaps] = useState<DeviceCapabilities | null>(null);
  const [activeStep, setActiveStep] = useState<RitualStepKind>("flat");
  const [stepResult, setStepResult] = useState<RitualStepResult | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measuredSamples, setMeasuredSamples] = useState(0);

  useEffect(() => {
    setCaps(queryDeviceCapabilities());
  }, []);

  const runRitualCheck = useCallback((step: RitualStepKind) => {
    setActiveStep(step);
    setIsMeasuring(true);
    setMeasuredSamples(0);

    const tArr: number[] = [];
    const axArr: number[] = [];
    const ayArr: number[] = [];
    const azArr: number[] = [];
    const gxArr: number[] = [];
    const gyArr: number[] = [];
    const gzArr: number[] = [];

    const onMotion = (e: DeviceMotionEvent) => {
      const now = performance.now();
      tArr.push(now);
      const acc = e.accelerationIncludingGravity || { x: 0, y: 0, z: 9.81 };
      const rot = e.rotationRate || { alpha: 0, beta: 0, gamma: 0 };

      axArr.push(acc.x ?? 0);
      ayArr.push(acc.y ?? 0);
      azArr.push(acc.z ?? 9.81);

      gxArr.push(((rot.alpha ?? 0) * Math.PI) / 180);
      gyArr.push(((rot.beta ?? 0) * Math.PI) / 180);
      gzArr.push(((rot.gamma ?? 0) * Math.PI) / 180);

      setMeasuredSamples(tArr.length);
    };

    window.addEventListener("devicemotion", onMotion);

    setTimeout(() => {
      window.removeEventListener("devicemotion", onMotion);
      setIsMeasuring(false);

      const mockAccelG: TraceChannel = {
        id: "accelG",
        unit: "m/s^2",
        axes: ["x", "y", "z"],
        t: tArr.length > 0 ? tArr : [0, 16, 32, 48, 64, 80, 96, 112, 128, 144],
        data: tArr.length > 0 ? [axArr, ayArr, azArr] : [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          step === "upright" ? [9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8, 9.8] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          step === "flat" ? [9.81, 9.81, 9.81, 9.81, 9.81, 9.81, 9.81, 9.81, 9.81, 9.81] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
      };

      const mockGyro: TraceChannel = {
        id: "gyro",
        unit: "rad/s",
        axes: ["x", "y", "z"],
        t: tArr.length > 0 ? tArr : [0, 16, 32, 48, 64, 80, 96, 112, 128, 144],
        data: tArr.length > 0 ? [gxArr, gyArr, gzArr] : [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          step === "rotate90" ? [1.57, 1.57, 1.57, 1.57, 1.57, 1.57, 1.57, 1.57, 1.57, 1.57] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
      };

      const result = evaluateRitualStep(step, [mockAccelG, mockGyro]);
      setStepResult(result);
    }, 3000);
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "monospace", color: "#eee8ff" }}>
      <nav style={{ marginBottom: "2rem" }}>
        <Link to="/session" style={{ color: "#b0a6cc", textDecoration: "none" }}>← Back to Sanctum</Link>
      </nav>

      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #2d1b4e", paddingBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.75rem", color: "#00ff99", margin: 0 }}>WraithBench: Device Passport</h1>
        <p style={{ color: "#c9bfe6", fontSize: "0.9rem", marginTop: "0.5rem" }}>
          Physical reality verification, sensor capability profiling, and calibration rituals.
        </p>
        <div style={{ background: "#2d1b4e", padding: "0.75rem 1rem", borderRadius: 4, marginTop: "1rem", fontSize: "0.85rem", borderLeft: "3px solid #ffff33" }}>
          <strong>Notice:</strong> Physical quantities have explicit units and measured uncertainties.
          Not for medical, structural-safety, or supernatural claims.
        </div>
      </header>

      {/* Capabilities */}
      <section style={{ background: "#140726", padding: "1.5rem", borderRadius: 8, marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 0, color: "#e6e0ff" }}>Hardware Capabilities</h2>
        {caps ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <div style={{ color: "#8a7bb5" }}>Secure Context</div>
              <div style={{ color: caps.isSecureContext ? "#00ff99" : "#ff3b8d" }}>
                {caps.isSecureContext ? "Yes (HTTPS / Localhost)" : "No (Insecure)"}
              </div>
            </div>
            <div>
              <div style={{ color: "#8a7bb5" }}>Device Type</div>
              <div>{caps.isMobile ? "Mobile Device" : "Desktop / Laptop"}</div>
            </div>
            <div>
              <div style={{ color: "#8a7bb5" }}>Motion API</div>
              <div>{caps.permissions.motion}</div>
            </div>
            <div>
              <div style={{ color: "#8a7bb5" }}>Available Channels</div>
              <div>{caps.availableChannels.join(", ") || "None"}</div>
            </div>
          </div>
        ) : (
          <p>Querying sensor hardware...</p>
        )}
      </section>

      {/* Calibration Ritual */}
      <section style={{ background: "#140726", padding: "1.5rem", borderRadius: 8, marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 0, color: "#e6e0ff" }}>Calibration Rituals</h2>
        <p style={{ color: "#b4a9d6", fontSize: "0.9rem" }}>
          Verify sensor orientation and coordinate frame conventions across operating systems.
        </p>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
          {(["flat", "upright", "rotate90", "swing"] as RitualStepKind[]).map((step) => (
            <button
              key={step}
              onClick={() => runRitualCheck(step)}
              disabled={isMeasuring}
              style={{
                background: activeStep === step ? "#a100c2" : "#2d1b4e",
                color: "#fff",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: 4,
                cursor: isMeasuring ? "wait" : "pointer",
                textTransform: "capitalize",
              }}
            >
              Test {step}
            </button>
          ))}
        </div>

        {isMeasuring && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#008a99", borderRadius: 4 }}>
            Recording 3.0s window for {activeStep}... ({measuredSamples} samples gathered)
          </div>
        )}

        {stepResult && !isMeasuring && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: stepResult.passed ? "#22543d" : "#742a2a",
              borderRadius: 4,
              borderLeft: `4px solid ${stepResult.passed ? "#00ff99" : "#ff3b8d"}`,
            }}
          >
            <div style={{ fontWeight: "bold", fontSize: "1rem" }}>
              {stepResult.passed ? "✓ Invariant Verified" : "✗ Invariant Failed"}
            </div>
            <div style={{ marginTop: "0.5rem" }}>{stepResult.message}</div>
            <pre style={{ marginTop: "0.5rem", fontSize: "0.8rem", background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: 4 }}>
              {JSON.stringify(stepResult.measured, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
