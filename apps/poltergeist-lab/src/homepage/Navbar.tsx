import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useNavScroll } from "./useNavScroll.js";

const NAV_ITEMS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Experiments", href: "#experiments" },
  { label: "Precision", href: "#precision" },
  { label: "Platform", href: "#platform" },
];

export function Navbar() {
  const scrolled = useNavScroll();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSmoothScroll = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      setMenuOpen(false);
      document.body.style.overflow = "";
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => {
      const next = !prev;
      document.body.style.overflow = next ? "hidden" : "";
      return next;
    });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    document.body.style.overflow = "";
  }, []);

  return (
    <nav
      className={`nav${scrolled ? " scrolled" : ""}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="nav-inner">
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          <svg className="nav-logo-icon" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
            <circle cx="16" cy="16" r="6" fill="currentColor" opacity="0.6" />
            <path
              d="M16 2 L16 6 M16 26 L16 30 M2 16 L6 16 M26 16 L30 16"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.3"
            />
          </svg>
          <span className="nav-logo-text">Séance</span>
        </Link>

        <ul className="nav-links">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                className="nav-link"
                href={item.href}
                onClick={(e) => handleSmoothScroll(e, item.href)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <Link to="/lab" className="nav-cta desktop-only">
          Start Experimenting
        </Link>

        <button
          className={`nav-mobile-toggle${menuOpen ? " open" : ""}`}
          onClick={toggleMenu}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={`nav-mobile-menu${menuOpen ? " open" : ""}`}
        aria-hidden={!menuOpen}
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={(e) => handleSmoothScroll(e, item.href)}
          >
            {item.label}
          </a>
        ))}
        <Link to="/replay" onClick={closeMenu}>
          Replay Mode
        </Link>
        <Link to="/lab" className="nav-cta" onClick={closeMenu}>
          Start Experimenting
        </Link>
      </div>
    </nav>
  );
}
