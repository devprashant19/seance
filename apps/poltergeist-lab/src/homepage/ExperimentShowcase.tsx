import { Link } from "react-router-dom";

const EXPERIMENTS = [
  {
    id: "pendulum-g",
    emoji: "\u{1F52E}",
    name: "The Swinging Spirit",
    spooky: "Let the spirit swing and reveal the pull of the Earth.",
    plain: "Measure gravitational acceleration g via pendulum oscillation. Zero-crossing period detection with finite-amplitude corrections.",
    channels: ["accelG"],
    glowColor: "rgba(124, 108, 240, 0.08)",
  },
  {
    id: "free-fall",
    emoji: "\u{1F47B}",
    name: "The Drop of Doom",
    spooky: "Release the spirit and let gravity reveal itself.",
    plain: "Measure fall height from free-fall duration. Low-g window detection with sub-sample edge interpolation.",
    channels: ["accelG"],
    glowColor: "rgba(0, 210, 211, 0.08)",
  },
  {
    id: "singing-ruler",
    emoji: "\u{1F3B5}",
    name: "Hear the Stiffness",
    spooky: "Let the spirit sing and reveal what the ruler is made of.",
    plain: "Measure Young's modulus E from cantilever acoustic resonance. Spectral peak with parabolic interpolation.",
    channels: ["audio.spectrum"],
    glowColor: "rgba(255, 170, 100, 0.08)",
  },
  {
    id: "spin-find-chip",
    emoji: "\u{1F300}",
    name: "Where Does the Spirit Live?",
    spooky: "The spirit hides inside your phone. Spin to find its seat.",
    plain: "Locate the IMU sensor inside the phone using centrifugal acceleration during a spin. Rigid-body planar physics.",
    channels: ["gyro", "accelG"],
    glowColor: "rgba(160, 120, 255, 0.08)",
  },
];

export function ExperimentShowcase() {
  return (
    <section className="section experiments" id="experiments">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Experiments</span>
          <h2 className="section-title">
            Real physics, real uncertainty, real results
          </h2>
          <p className="section-subtitle">
            Each experiment is backed by proper uncertainty propagation, z-score
            verdicts, and diagnostic feedback — not just pretty numbers.
          </p>
        </div>
        <div className="experiment-grid reveal-stagger">
          {EXPERIMENTS.map((exp) => (
            <Link
              key={exp.id}
              to={`/lab/${exp.id}`}
              className="experiment-card"
            >
              <div
                className="experiment-card-glow"
                style={{
                  background: `radial-gradient(circle at 80% 20%, ${exp.glowColor}, transparent 70%)`,
                }}
              />
              <span className="experiment-emoji">{exp.emoji}</span>
              <h3 className="experiment-name">{exp.name}</h3>
              <p className="experiment-spooky">{exp.spooky}</p>
              <p className="experiment-plain">{exp.plain}</p>
              <div className="experiment-channels">
                {exp.channels.map((ch) => (
                  <span key={ch} className="experiment-channel-tag">
                    {ch}
                  </span>
                ))}
              </div>
              <svg
                className="experiment-arrow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
