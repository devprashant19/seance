import { useEffect } from "react";
import { useGhostEar } from "./useGhostEar.js";
import { attachGhostEarKeyboard } from "./keyboard.js";
import { Announcer } from "./announcer.js";

export function GhostEarRoute() {
  const {
    state,
    result,
    statusText,
    scrubPosition,
    togglePlay,
    repeatResult,
    scrubLeft,
    scrubRight,
    stop,
    help,
  } = useGhostEar();

  useEffect(() => {
    return attachGhostEarKeyboard({
      onTogglePlay: togglePlay,
      onRepeatResult: repeatResult,
      onPlayPause: togglePlay,
      onScrubLeft: scrubLeft,
      onScrubRight: scrubRight,
      onHelp: help,
      onStop: stop,
    });
  }, [togglePlay, repeatResult, scrubLeft, scrubRight, help, stop]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05050f",
        color: "#f0f0ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <Announcer />

      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: 3, marginBottom: 8 }}>
          Ghost Ear Lab
        </h1>
        <p style={{ color: "#7799cc", fontSize: 14, letterSpacing: 2, textTransform: "uppercase" }}>
          Audio-First Physics for Blind & Low-Vision Learners
        </p>
      </header>

      <section
        aria-live="polite"
        style={{
          width: "100%",
          maxWidth: 600,
          background: "#0c0c1e",
          border: "2px solid #2a3a5c",
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 0 30px rgba(80,120,255,0.1)",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: state === "RECORDING" ? "#55ff88" : "#88aacc",
            }}
          >
            {state === "RECORDING" ? "● Listening to Swing" : "Status"}
          </span>
          <p style={{ fontSize: 20, marginTop: 8, fontWeight: 400 }}>{statusText}</p>
        </div>

        {/* Scrub Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(scrubPosition * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            width: "100%",
            height: 12,
            background: "#151528",
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 24,
            border: "1px solid #223355",
          }}
        >
          <div
            style={{
              width: `${Math.round(scrubPosition * 100)}%`,
              height: "100%",
              background: "#4a7acc",
              transition: "width 0.05s linear",
            }}
          />
        </div>

        {/* Results Box */}
        {result && (
          <div
            style={{
              padding: 20,
              background: "#102030",
              border: "1px solid #305070",
              borderRadius: 8,
              marginBottom: 24,
              textAlign: "left",
            }}
          >
            <h2 style={{ fontSize: 18, color: "#99ccff", marginBottom: 8 }}>Spoken Verdict</h2>
            <p style={{ fontSize: 16, lineHeight: 1.5, color: "#e0f0ff" }}>{result.sentence}</p>
            <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 14, color: "#88aacc" }}>
              <div>Value: <strong>{result.g.toFixed(2)} m/s²</strong></div>
              <div>Uncertainty: <strong>±{result.deltaG.toFixed(2)} m/s²</strong></div>
              <div>Period: <strong>{result.periodS.toFixed(3)} s</strong></div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={togglePlay}
            style={{
              padding: "12px 28px",
              background: state === "RECORDING" ? "#662222" : "#224477",
              color: "#fff",
              border: "1px solid #446699",
              borderRadius: 8,
              fontSize: 16,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {state === "RECORDING" ? "Stop [Space]" : "Start Measurement [Space]"}
          </button>

          {result && (
            <button
              onClick={repeatResult}
              style={{
                padding: "12px 20px",
                background: "#1c2b3a",
                color: "#c0d8f0",
                border: "1px solid #3a4b5a",
                borderRadius: 8,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Repeat Result [R]
            </button>
          )}

          <button
            onClick={help}
            style={{
              padding: "12px 18px",
              background: "transparent",
              color: "#8899aa",
              border: "1px solid #334455",
              borderRadius: 8,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Audio Help [H]
          </button>
        </div>
      </section>

      <footer style={{ marginTop: 32, fontSize: 13, color: "#667788" }}>
        Keyboard Shortcuts: <strong>Space</strong> (Start/Stop) · <strong>←/→</strong> (Scrub by ear) · <strong>R</strong> (Repeat) · <strong>H</strong> (Help) · <strong>Esc</strong> (Stop)
      </footer>
    </main>
  );
}
export default GhostEarRoute;
