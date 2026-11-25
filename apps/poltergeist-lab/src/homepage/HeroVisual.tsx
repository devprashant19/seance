export function HeroVisual() {
  return (
    <div className="hero-visual">
      <svg
        className="hero-waveform float-animation"
        viewBox="0 0 480 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Phone outline */}
        <rect
          x="160"
          y="40"
          width="160"
          height="320"
          rx="24"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
        />
        <rect
          x="200"
          y="52"
          width="80"
          height="8"
          rx="4"
          fill="rgba(255,255,255,0.3)"
        />

        {/* Accelerometer waveform */}
        <g opacity="0.9">
          <text
            x="40"
            y="140"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            accel.x
          </text>
          <path
            className="hero-wave-path"
            d="M80 160 Q120 120 160 160 Q200 200 240 160 Q280 120 320 160 Q360 200 400 160"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            fill="none"
          />
        </g>

        {/* Gyroscope waveform */}
        <g opacity="0.7">
          <text
            x="40"
            y="220"
            fill="rgba(255,255,255,0.5)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            gyro.z
          </text>
          <path
            className="hero-wave-path"
            d="M80 240 Q110 210 140 240 Q170 270 200 240 Q230 210 260 240 Q290 270 320 240 Q350 210 380 240"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
            fill="none"
            style={{ animationDelay: "-1s" }}
          />
        </g>

        {/* Data points */}
        {[160, 200, 240, 280, 320].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={160 + (i % 2 === 0 ? 0 : -20)}
            r="3"
            fill="rgba(255,255,255,0.7)"
          />
        ))}

        {/* Measurement annotations */}
        <g opacity="0.5">
          <line
            x1="400"
            y1="80"
            x2="400"
            y2="320"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
          <text
            x="410"
            y="200"
            fill="rgba(255,255,255,0.5)"
            fontSize="9"
            fontFamily="var(--font-mono)"
          >
            t=1.56s
          </text>
        </g>

        {/* Connection indicator */}
        <circle cx="240" cy="360" r="4" fill="rgba(255,255,255,0.8)">
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <text
          x="252"
          y="364"
          fill="rgba(255,255,255,0.7)"
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          connected
        </text>
      </svg>
    </div>
  );
}
