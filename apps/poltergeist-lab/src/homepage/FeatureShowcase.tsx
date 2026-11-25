import { useEffect, useRef, useState } from "react";

const FEATURES = [
  {
    text: "Capture",
    color: "cyan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12 Q6 4 12 12 Q18 20 22 12" />
      </svg>
    ),
  },
  {
    text: "Analyze",
    color: "purple",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </svg>
    ),
  },
  {
    text: "Measure",
    color: "green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    text: "Discover",
    color: "orange",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
];

export function FeatureShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const onScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const viewportH = window.innerHeight;

      const stickyProgress = -rect.top / (sectionHeight - viewportH);

      if (stickyProgress < 0 || stickyProgress > 1) {
        setActiveIndex(stickyProgress > 1 ? FEATURES.length - 1 : -1);
        return;
      }

      const idx = Math.min(
        FEATURES.length - 1,
        Math.floor(stickyProgress * FEATURES.length),
      );
      setActiveIndex(idx);
    };

    if (prefersReduced) {
      setActiveIndex(FEATURES.length - 1);
      return;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="feature-showcase" id="features" ref={sectionRef}>
      <div className="feature-showcase-sticky">
        <div className="feature-showcase-stage">
          {FEATURES.map((f, i) => (
            <div
              key={f.text}
              className={`feature-showcase-item${i === activeIndex ? " feature-showcase-item--active" : ""}${i < activeIndex ? " feature-showcase-item--past" : ""}`}
            >
              <div
                className={`feature-showcase-icon feature-showcase-icon--${f.color}`}
              >
                {f.icon}
              </div>
              <span className="feature-showcase-text">{f.text}</span>
            </div>
          ))}
        </div>
        <p
          className={`feature-showcase-desc${activeIndex === FEATURES.length - 1 ? " feature-showcase-desc--visible" : ""}`}
        >
          Real-time sensor data from your phone — transformed into physics
          experiments with proper uncertainty analysis.
        </p>
      </div>
    </section>
  );
}
