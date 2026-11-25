import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useGhostEar, type ExperimentType } from "./useGhostEar.js";
import { attachGhostEarKeyboard } from "./keyboard.js";
import { Announcer } from "./announcer.js";

export function GhostEarRoute() {
  const {
    state,
    result,
    statusText,
    scrubPosition,
    experiment,
    settings,
    setExperiment,
    togglePlay,
    repeatResult,
    scrubLeft,
    scrubRight,
    stop,
    help,
    toggleDarkroom,
    setSettings,
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

  const isDarkroom = settings.darkroom;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: isDarkroom ? "#000000" : "#05050f",
        color: isDarkroom ? "#ffffff" : "#f0f0ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        fontFamily: isDarkroom ? "system-ui, sans-serif" : "monospace",
      }}
    >
      <Announcer />

      <nav style={{ width: "100%", maxWidth: 640, textAlign: "left", marginBottom: 20 }}>
        <Link
          to="/"
          style={{
            color: isDarkroom ? "#ffffff" : "#00e5ff",
            textDecoration: "underline",
            fontSize: 14,
          }}
        >
          ← Return to Sanctum
        </Link>
      </nav>

      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 400,
            letterSpacing: 2,
            marginBottom: 8,
            color: isDarkroom ? "#ffffff" : "#00ff99",
          }}
        >
          Ghost Ear Lab
        </h1>
        <p
          style={{
            color: isDarkroom ? "#eee8ff" : "#ff66ff",
            fontSize: 13,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Audio-First Physics for Blind & Low-Vision Learners
        </p>
      </header>

      {/* Experiment Picker */}
      <section
        aria-label="Experiment selection"
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        {(
          [
            ["pendulum-g", "Pendulum g"],
            ["free-fall", "Free Fall"],
            ["singing-ruler", "Singing Ruler"],
            ["spin-find-chip", "Spin-Find-Chip"],
          ] as [ExperimentType, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setExperiment(id)}
            style={{
              background: experiment === id ? (isDarkroom ? "#ffffff" : "#a100c2") : isDarkroom ? "#1f0a35" : "#140726",
              color: experiment === id ? (isDarkroom ? "#000000" : "#ffffff") : isDarkroom ? "#ffffff" : "#e6e0ff",
              border: `1px solid ${isDarkroom ? "#ffffff" : "#4a2a70"}`,
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: experiment === id ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </section>

      {/* Live Monitor Region */}
      <section
        aria-live="polite"
        style={{
          width: "100%",
          maxWidth: 640,
          background: isDarkroom ? "#111111" : "#0c0c1e",
          border: `2px solid ${isDarkroom ? "#ffffff" : "#3a0f5c"}`,
          borderRadius: 12,
          padding: 28,
          boxShadow: isDarkroom ? "none" : "0 0 30px rgba(80,120,255,0.1)",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <span
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: state === "RECORDING" ? "#00ff99" : isDarkroom ? "#ffffff" : "#00e5ff",
              fontWeight: 700,
            }}
          >
            {state === "RECORDING" ? "● Listening to Sensor Stream" : "Status"}
          </span>
          <p style={{ fontSize: 18, marginTop: 8, fontWeight: 500, lineHeight: 1.4 }}>
            {statusText}
          </p>
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
            background: isDarkroom ? "#333333" : "#151528",
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 20,
            border: `1px solid ${isDarkroom ? "#8a7bb5" : "#2a0a4a"}`,
          }}
        >
          <div
            style={{
              width: `${Math.round(scrubPosition * 100)}%`,
              height: "100%",
              background: isDarkroom ? "#ffffff" : "#00ff99",
              transition: "width 0.1s ease",
            }}
          />
        </div>

        {/* Result Card */}
        {result && (
          <div
            style={{
              background: isDarkroom ? "#222222" : "rgba(30, 45, 80, 0.5)",
              border: `1px solid ${isDarkroom ? "#ffffff" : "#3b5998"}`,
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, color: isDarkroom ? "#ffffff" : "#b4a9d6" }}>
              {result.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0", color: isDarkroom ? "#ffffff" : "#00ff99" }}>
              {result.value.toFixed(2)} ± {result.uncertainty.toFixed(2)} {result.unit}
            </div>
            <p style={{ fontSize: 14, color: isDarkroom ? "#ffffff" : "#e6e0ff", margin: 0 }}>
              {result.sentence}
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <button
            onClick={togglePlay}
            style={{
              background: state === "RECORDING" ? "#ff3b8d" : isDarkroom ? "#ffffff" : "#a100c2",
              color: isDarkroom && state !== "RECORDING" ? "#000000" : "#ffffff",
              border: "none",
              padding: "10px 20px",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {state === "RECORDING" ? "Stop (Space)" : "Start (Space)"}
          </button>
          <button
            onClick={repeatResult}
            disabled={!result}
            style={{
              background: isDarkroom ? "#1f0a35" : "#2d1b4e",
              color: result ? (isDarkroom ? "#fff" : "#f5f0ff") : "#8a7bb5",
              border: `1px solid ${isDarkroom ? "#fff" : "#4a2a70"}`,
              padding: "10px 16px",
              borderRadius: 6,
              cursor: result ? "pointer" : "not-allowed",
            }}
          >
            Repeat Result (R)
          </button>
          <button
            onClick={help}
            style={{
              background: isDarkroom ? "#1f0a35" : "#2d1b4e",
              color: isDarkroom ? "#fff" : "#f5f0ff",
              border: `1px solid ${isDarkroom ? "#fff" : "#4a2a70"}`,
              padding: "10px 16px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Help (H)
          </button>
        </div>

        {/* Accessibility & Darkroom Settings */}
        <footer
          style={{
            borderTop: `1px solid ${isDarkroom ? "#3d2466" : "#2a0a4a"}`,
            paddingTop: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
            color: isDarkroom ? "#ffffff" : "#b4a9d6",
          }}
        >
          <div>
            <label style={{ marginRight: 8 }}>Speech Rate:</label>
            <select
              value={settings.speechRate}
              onChange={(e) =>
                setSettings((s) => ({ ...s, speechRate: Number(e.target.value) }))
              }
              style={{
                background: isDarkroom ? "#2d1b4e" : "#140726",
                color: isDarkroom ? "#fff" : "#eee8ff",
                border: "1px solid #4a2a70",
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              <option value="0.8">0.8x</option>
              <option value="1.0">1.0x (Standard)</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>

          <button
            onClick={toggleDarkroom}
            style={{
              background: isDarkroom ? "#ffffff" : "#2d1b4e",
              color: isDarkroom ? "#000000" : "#ffffff",
              border: "1px solid #4a2a70",
              borderRadius: 4,
              padding: "4px 10px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {isDarkroom ? "☀️ Daylight Mode" : "🌙 Darkroom Mode"}
          </button>
        </footer>
      </section>
    </main>
  );
}
