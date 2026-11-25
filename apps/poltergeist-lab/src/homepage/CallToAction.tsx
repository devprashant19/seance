import { Link } from "react-router-dom";

export function CallToAction() {
  return (
    <section className="cta-section">
      <div className="cta-bg" />
      <div className="container cta-content reveal">
        <h2 className="cta-title">Ready to summon some physics?</h2>
        <p className="cta-subtitle">
          No app installs. No special hardware. Just a phone, a browser, and a
          question worth measuring.
        </p>
        <div className="cta-buttons">
          <Link to="/lab" className="btn btn-primary">
            Start Experimenting
            <svg
              className="btn-icon"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 10h10M11 6l4 4-4 4" />
            </svg>
          </Link>
          <Link to="/replay" className="btn btn-secondary">
            Try Replay Mode
          </Link>
        </div>
      </div>
    </section>
  );
}
