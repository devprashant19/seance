import { Link } from "react-router-dom";

const FEATURES = [
  {
    title: "Real-Time Streaming",
    desc: "WebSocket transport with columnar batch encoding. Phone sensors stream at up to 200 Hz with NTP-style clock synchronization.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 12 Q6 4 12 12 Q18 20 22 12" />
      </svg>
    ),
  },
  {
    title: "Signal Quality Analysis",
    desc: "Automatic jitter detection, dropout counting, noise floor measurement, and calibration status checks on every trace.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </svg>
    ),
  },
  {
    title: "Uncertainty Propagation",
    desc: "Every measurement carries its uncertainty. Dominant error terms are identified and their variance shares displayed.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    title: "Diagnostic Verdicts",
    desc: "The Physics Oracle computes z-scores and assigns confidence tiers. Ask the Spirit explains what went wrong and how to fix it.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
];

function OscilloscopeVisual() {
  return (
    <svg
      className="sensor-oscilloscope"
      viewBox="0 0 400 360"
      fill="none"
      width="100%"
      style={{ maxWidth: 400 }}
    >
      <rect
        x="20"
        y="20"
        width="360"
        height="320"
        rx="16"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        fill="rgba(0,0,0,0.2)"
      />

      {Array.from({ length: 7 }, (_, i) => (
        <line
          key={`h${i}`}
          x1="40"
          y1={60 + i * 40}
          x2="360"
          y2={60 + i * 40}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={60 + i * 40}
          y1="40"
          x2={60 + i * 40}
          y2="320"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
      ))}

      <path
        className="hero-wave-path"
        d="M40 180 Q80 100 120 180 Q160 260 200 180 Q240 100 280 180 Q320 260 360 180"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="2"
        fill="none"
      />

      <path
        d="M40 180 Q50 175 60 182 Q70 177 80 183 Q90 178 100 180 Q110 184 120 179 Q130 183 140 177 Q150 182 160 180 Q170 176 180 183 Q190 178 200 181 Q210 184 220 177 Q230 182 240 180 Q250 176 260 183 Q270 179 280 181 Q290 184 300 178 Q310 182 320 180 Q330 177 340 183 Q350 179 360 180"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
        fill="none"
      />

      <line
        x1="120" y1="100" x2="120" y2="260"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1" strokeDasharray="4 4"
      />
      <line
        x1="280" y1="100" x2="280" y2="260"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1" strokeDasharray="4 4"
      />
      <text
        x="190" y="52"
        fill="rgba(255,255,255,0.5)"
        fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle"
      >
        {"T = 1.56 ± 0.02 s"}
      </text>

      <text x="40" y="336" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="var(--font-mono)">0s</text>
      <text x="345" y="336" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="var(--font-mono)">3.2s</text>
    </svg>
  );
}

export function SensorPrecision() {
  return (
    <section className="section sensor-section" id="precision">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label section-label--white">Precision</span>
          <h2 className="section-title">Measurements you can trust</h2>
          <p className="section-subtitle">
            From raw sensor samples to calibrated results with proper error bars
            — every step is transparent and verifiable.
          </p>
        </div>

        <div className="sensor-layout reveal">
          <div className="sensor-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="sensor-feature">
                <div className="sensor-feature-icon">{f.icon}</div>
                <div className="sensor-feature-content">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
            <div className="sensor-cta-row">
              <Link to="/lab" className="btn btn-primary">
                Try the Lab
                <svg className="btn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 10h10M11 6l4 4-4 4" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="sensor-visual">
            <OscilloscopeVisual />
          </div>
        </div>

        <div className="sensor-stats-grid reveal-stagger">
          <div className="sensor-stat-card">
            <div className="sensor-stat-value">200 Hz</div>
            <div className="sensor-stat-label">Max Sample Rate</div>
          </div>
          <div className="sensor-stat-card">
            <div className="sensor-stat-value">&lt;0.02 m/s&sup2;</div>
            <div className="sensor-stat-label">Accelerometer Noise</div>
          </div>
          <div className="sensor-stat-card">
            <div className="sensor-stat-value">64 KB</div>
            <div className="sensor-stat-label">Max Frame Size</div>
          </div>
        </div>
      </div>
    </section>
  );
}
