import { useState } from "react";

const STEPS = [
  {
    number: "01",
    title: "Connect Your Phone",
    desc: "Scan a QR code from the lab to link your phone's sensors over WebSocket. No app install needed.",
  },
  {
    number: "02",
    title: "Capture Motion",
    desc: "Accelerometer, gyroscope, and audio stream at up to 200 Hz with sub-millisecond timestamps.",
  },
  {
    number: "03",
    title: "Run an Experiment",
    desc: "Choose from pendulum, free fall, ruler vibration, or spin detection. Each has built-in physics analysis.",
  },
  {
    number: "04",
    title: "Get Real Results",
    desc: "Uncertainty propagation, z-score verdicts, diagnostic feedback, and exportable lab reports.",
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="section how-it-works" id="how-it-works">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label section-label--white">How It Works</span>
          <h2 className="section-title">From phone to physics in four steps</h2>
          <p className="section-subtitle">
            No special hardware. No app downloads. Just a phone, a browser, and
            curiosity.
          </p>
        </div>

        <div className="walkthrough-layout reveal">
          <div className="walkthrough-steps">
            {STEPS.map((step, i) => (
              <button
                key={step.number}
                className={`walkthrough-step${i === activeStep ? " walkthrough-step--active" : ""}`}
                onClick={() => setActiveStep(i)}
                type="button"
                aria-pressed={i === activeStep}
              >
                <span className="walkthrough-step-number">{step.number}</span>
                <div className="walkthrough-step-content">
                  <h3 className="walkthrough-step-title">{step.title}</h3>
                  {i === activeStep && (
                    <p className="walkthrough-step-desc">{step.desc}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="walkthrough-visual">
            <svg className="walkthrough-phone" viewBox="0 0 320 560" fill="none">
              <rect
                x="10"
                y="10"
                width="300"
                height="540"
                rx="40"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                fill="rgba(255,255,255,0.05)"
              />
              <rect x="110" y="30" width="100" height="8" rx="4" fill="rgba(255,255,255,0.2)" />

              <g key={activeStep} className="walkthrough-phone-content">
                {activeStep === 0 && (
                  <>
                    <rect x="80" y="180" width="160" height="160" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" />
                    <rect x="100" y="200" width="40" height="40" rx="4" fill="rgba(255,255,255,0.15)" />
                    <rect x="150" y="200" width="40" height="40" rx="4" fill="rgba(255,255,255,0.2)" />
                    <rect x="200" y="200" width="40" height="40" rx="4" fill="rgba(255,255,255,0.15)" />
                    <rect x="100" y="250" width="40" height="40" rx="4" fill="rgba(255,255,255,0.2)" />
                    <rect x="150" y="250" width="40" height="40" rx="4" fill="rgba(255,255,255,0.15)" />
                    <rect x="200" y="250" width="40" height="40" rx="4" fill="rgba(255,255,255,0.2)" />
                    <rect x="100" y="300" width="40" height="40" rx="4" fill="rgba(255,255,255,0.15)" />
                    <rect x="150" y="300" width="40" height="40" rx="4" fill="rgba(255,255,255,0.2)" />
                    <rect x="200" y="300" width="40" height="40" rx="4" fill="rgba(255,255,255,0.15)" />
                    <circle cx="160" cy="410" r="6" fill="rgba(255,255,255,0.5)">
                      <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <text x="160" y="445" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12">Scan to connect</text>
                  </>
                )}

                {activeStep === 1 && (
                  <>
                    <path
                      className="hero-wave-path"
                      d="M40 240 Q80 180 120 240 Q160 300 200 240 Q240 180 280 240"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="2.5"
                      fill="none"
                    />
                    <path
                      className="hero-wave-path"
                      d="M40 310 Q80 270 120 310 Q160 350 200 310 Q240 270 280 310"
                      stroke="rgba(139,92,246,0.5)"
                      strokeWidth="2"
                      fill="none"
                      style={{ animationDelay: "-1s" }}
                    />
                    <path
                      className="hero-wave-path"
                      d="M40 370 Q80 340 120 370 Q160 400 200 370 Q240 340 280 370"
                      stroke="rgba(16,185,129,0.4)"
                      strokeWidth="1.5"
                      fill="none"
                      style={{ animationDelay: "-2s" }}
                    />
                    <text x="60" y="190" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="var(--font-mono)">accelG</text>
                    <text x="200" y="190" fill="rgba(255,255,255,0.4)" fontSize="11" fontFamily="var(--font-mono)">200 Hz</text>
                    <circle cx="160" cy="440" r="6" fill="#10b981">
                      <animate attributeName="r" values="4;7;4" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                    <text x="160" y="470" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12">Live streaming</text>
                  </>
                )}

                {activeStep === 2 && (
                  <>
                    <circle cx="160" cy="170" r="6" fill="rgba(255,255,255,0.4)" />
                    <line x1="160" y1="176" x2="200" y2="340" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeDasharray="4 2">
                      <animate attributeName="x2" values="200;120;200" dur="2s" repeatCount="indefinite" />
                    </line>
                    <circle cx="200" cy="348" r="14" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                      <animate attributeName="cx" values="200;120;200" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x="160" y="410" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontFamily="var(--font-mono)">T = 1.56 s</text>
                    <text x="160" y="440" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="12">Pendulum period</text>
                  </>
                )}

                {activeStep === 3 && (
                  <>
                    <text x="160" y="210" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="48" fontWeight="600" fontFamily="var(--font-mono)">9.81</text>
                    <text x="160" y="245" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="16">m/s²</text>
                    <text x="160" y="295" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="13" fontFamily="var(--font-mono)">± 0.08 m/s²</text>
                    <rect x="90" y="330" width="140" height="44" rx="12" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.5)" />
                    <text x="160" y="357" textAnchor="middle" fill="#10b981" fontSize="15" fontWeight="600">PASS</text>
                    <text x="160" y="410" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12" fontFamily="var(--font-mono)">z-score: 0.4</text>
                    <rect x="110" y="440" width="100" height="32" rx="8" fill="rgba(255,255,255,0.1)" />
                    <text x="160" y="461" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">Export Report</text>
                  </>
                )}
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
