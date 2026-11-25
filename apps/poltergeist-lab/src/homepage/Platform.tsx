import { Link } from "react-router-dom";

const PLATFORMS = [
  {
    title: "Poltergeist Lab",
    desc: "The main physics experiment platform. Connect a phone, run experiments, get results with uncertainty analysis and diagnostic feedback.",
    link: "/lab",
    linkText: "Open the Lab →",
    icon: (
      <svg className="platform-card-icon" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="8" width="40" height="40" rx="8" />
        <path d="M20 28 Q28 16 36 28 Q28 40 20 28" fill="currentColor" opacity="0.1" />
        <circle cx="28" cy="28" r="4" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    title: "Banshee Choir",
    desc: "Turn phone sensors into musical instruments. Tilt to sing, shake to wail. Web Audio synthesis with ghost looper and bar-synced recording.",
    link: "/lab",
    linkText: "Open the Choir →",
    icon: (
      <svg className="platform-card-icon" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 16 Q28 8 36 16" />
        <path d="M16 24 Q28 12 40 24" opacity="0.6" />
        <ellipse cx="28" cy="36" rx="12" ry="8" />
        <line x1="28" y1="28" x2="28" y2="36" />
      </svg>
    ),
  },
  {
    title: "Developer Tools",
    desc: "MCP server with 6 tools for trace analysis, live streaming, and experiment automation. 4 custom AI agents. 8 automation hooks.",
    link: "/lab",
    linkText: "View Documentation →",
    icon: (
      <svg className="platform-card-icon" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="12" width="40" height="32" rx="4" />
        <path d="M16 28 L22 22 L16 16" opacity="0.8" />
        <line x1="26" y1="28" x2="36" y2="28" opacity="0.5" />
      </svg>
    ),
  },
];

export function Platform() {
  return (
    <section className="section platform-section" id="platform">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Platform</span>
          <h2 className="section-title">A complete experimentation system</h2>
          <p className="section-subtitle">
            Two interactive applications, a WebSocket relay, an MCP integration
            layer, and a scaffolding CLI — built to work together.
          </p>
        </div>
        <div className="platform-grid reveal-stagger">
          {PLATFORMS.map((p) => (
            <Link key={p.title} to={p.link} className="platform-card">
              {p.icon}
              <h3 className="platform-card-title">{p.title}</h3>
              <p className="platform-card-desc">{p.desc}</p>
              <span className="platform-card-link">{p.linkText}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
