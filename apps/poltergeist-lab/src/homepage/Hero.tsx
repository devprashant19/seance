import { Link } from "react-router-dom";
import { HeroVisual } from "./HeroVisual.js";

export function Hero() {
  const scrollToSection = () => {
    const el = document.querySelector("#features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero">
      <div className="hero-bg">
        <svg className="hero-bg-shape hero-bg-shape--1" viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="200" fill="white" />
        </svg>
        <svg className="hero-bg-shape hero-bg-shape--2" viewBox="0 0 300 300" fill="none">
          <circle cx="150" cy="150" r="150" fill="white" />
        </svg>
        <svg className="hero-bg-shape hero-bg-shape--3" viewBox="0 0 250 250" fill="none">
          <circle cx="125" cy="125" r="125" fill="white" />
        </svg>
      </div>

      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            Single phone for all your physics
          </h1>
        </div>

        <div className="hero-right">
          <p className="hero-subtitle">
            Séance captures real-time accelerometer, gyroscope, and audio data
            from everyday devices — measure gravity, free fall, vibrations, and
            more with proper uncertainty analysis.
          </p>
          <div className="hero-cta-group">
            <Link to="/lab" className="btn btn-primary">
              Get Started
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
              Watch a Demo
            </Link>
          </div>
        </div>
      </div>

      <button
        className="hero-scroll-btn"
        onClick={scrollToSection}
        aria-label="Scroll down"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </section>
  );
}
