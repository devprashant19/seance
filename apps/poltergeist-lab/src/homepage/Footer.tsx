import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="nav-logo">
              <svg className="nav-logo-icon" viewBox="0 0 32 32" fill="none">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="6"
                  fill="currentColor"
                  opacity="0.6"
                />
                <path
                  d="M16 2 L16 6 M16 26 L16 30 M2 16 L6 16 M26 16 L30 16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.3"
                />
              </svg>
              <span className="nav-logo-text">Séance</span>
            </Link>
            <p className="footer-brand-desc">
              A real-time sensor experimentation platform that turns everyday
              phones into physics instruments.
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Platform</h4>
            <ul>
              <li>
                <Link to="/lab">Poltergeist Lab</Link>
              </li>
              <li>
                <Link to="/replay">Replay Mode</Link>
              </li>
              <li>
                <a href="#experiments">Experiments</a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Resources</h4>
            <ul>
              <li>
                <a href="#how-it-works">How It Works</a>
              </li>
              <li>
                <a href="#precision">Precision</a>
              </li>
              <li>
                <a href="#platform">Platform</a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Project</h4>
            <ul>
              <li>
                <a
                  href="https://github.com/devprashant19/seance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/devprashant19/seance/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contributing
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/devprashant19/seance/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  License (MIT)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; 2026 Séance. MIT License.
          </p>
          <div className="footer-social">
            <a
              href="https://github.com/devprashant19/seance"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
