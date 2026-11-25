import { Link } from "react-router-dom";
import { getExperiments } from "../lab/registry.js";
import { GUIDES, SOURCE_NOTE } from "../lab/guides.js";

export function Lab() {
  const experiments = getExperiments();

  return (
    <main className="sx-page">
      <Link to="/" className="sx-ghost-btn" style={{ marginBottom: 12 }}>&larr; Home</Link>
      <p className="sx-kicker" style={{ textAlign: "center" }}>Experiments</p>
      <h1 style={{ fontSize: "clamp(18px, 4vw, 30px)", margin: "10px 0 12px", textAlign: "center" }}>
        Poltergeist Lab
      </h1>
      <p className="sx-muted" style={{ textAlign: "center", margin: "0 auto 32px", fontSize: 17, maxWidth: 720 }}>
        Pick an experiment. Each card shows the setup; open it for step-by-step instructions. You do it with
        your phone (or the laptop camera), then the Oracle checks your measurement against physics.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 20, maxWidth: 1100, margin: "0 auto",
      }}>
        {experiments.map((exp) => {
          const guide = GUIDES[exp.id];
          return (
          <Link
            key={exp.id}
            to={`/lab/${exp.id}`}
            className="sx-card"
            style={{ padding: 18 }}
          >
            {guide && (
              <div style={{ background: "rgba(10,5,20,0.75)", border: "1px solid var(--sx-line)", padding: 6, marginBottom: 12 }}>
                <guide.Illustration />
              </div>
            )}
            <h3 style={{ fontSize: 18, fontWeight: 400, marginBottom: 6 }}>{exp.name}</h3>
            {guide && <p style={{ fontSize: 13, color: "#e6e0ff", marginBottom: 8 }}>{guide.what}</p>}
            <p style={{ fontSize: 13, color: "#b4a9d6", marginBottom: 8 }}>{exp.spooky}</p>
            <p style={{ fontSize: 12, color: "#8a7bb5" }}>{exp.plain}</p>
            {guide && (
              <p style={{ fontSize: 12, marginTop: 10, color: guide.source === "phone" ? "#00ff99" : "#ffe066" }}>
                {SOURCE_NOTE[guide.source].badge}
                {guide.source === "camera" && " · via Apparition Gate"}
                {guide.source === "mic" && " · not live yet"}
              </p>
            )}
            <p style={{ fontSize: 12, color: "#00ffff", marginTop: 6 }}>Open for step-by-step setup &rarr;</p>
            <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {exp.channels.map((ch) => (
                <span key={ch} style={{
                  fontSize: 10, padding: "2px 8px", background: "#1f0a35",
                  borderRadius: 10, color: "#9d8fc4",
                }}>{ch}</span>
              ))}
            </div>
          </Link>
          );
        })}
      </div>
    </main>
  );
}
