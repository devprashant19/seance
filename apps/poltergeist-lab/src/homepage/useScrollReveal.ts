import { useEffect } from "react";

export function useScrollReveal(): void {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    const targets = document.querySelectorAll(".reveal, .reveal-stagger");
    if (prefersReduced) {
      for (const el of targets) el.classList.add("visible");
    } else {
      for (const el of targets) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);
}
