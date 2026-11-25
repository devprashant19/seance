export function SocialProof() {
  return (
    <section className="social-proof" aria-label="Project statistics">
      <div className="social-proof-inner">
        <h2 className="social-proof-headline reveal">
          Built for real experiments, not demos
        </h2>
        <p className="social-proof-sub reveal">
          Every measurement carries uncertainty. Every result is verifiable.
        </p>

        <div className="proof-stats reveal-stagger">
          <div className="proof-stat">
            <div className="proof-stat-value">
              4<span className="accent">+</span>
            </div>
            <div className="proof-stat-label">Physics experiments with real uncertainty propagation</div>
          </div>
          <div className="proof-stat">
            <div className="proof-stat-value">
              200<span className="accent"> Hz</span>
            </div>
            <div className="proof-stat-label">Maximum sensor sample rate from any phone</div>
          </div>
          <div className="proof-stat">
            <div className="proof-stat-value">
              &lt;5<span className="accent"> ms</span>
            </div>
            <div className="proof-stat-label">WebSocket relay latency end-to-end</div>
          </div>
          <div className="proof-stat">
            <div className="proof-stat-value">
              0<span className="accent">%</span>
            </div>
            <div className="proof-stat-label">App installs required — works in any browser</div>
          </div>
        </div>

        <div className="proof-badges reveal">
          <div className="proof-badge">
            <svg className="proof-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Open Source (MIT)</span>
          </div>
          <div className="proof-badge">
            <svg className="proof-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>No Data Collection</span>
          </div>
          <div className="proof-badge">
            <svg className="proof-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Works Offline</span>
          </div>
          <div className="proof-badge">
            <svg className="proof-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
            <span>Hacktoberfest Project</span>
          </div>
        </div>
      </div>
    </section>
  );
}
