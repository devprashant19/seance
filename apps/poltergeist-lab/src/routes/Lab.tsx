import { Link } from "react-router-dom";
import { getExperiments } from "../lab/registry.js";
import { GUIDES, SOURCE_NOTE } from "../lab/guides.js";

export function Lab() {
  const experiments = getExperiments();

  return (
    <main style={{
      minHeight: "100vh", padding: 24,
      background: "radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 70%)",
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>
        Poltergeist Lab
      </h1>
      <p style={{ color: "#889", textAlign: "center", marginBottom: 32, fontSize: 14 }}>
        Pick an experiment. Each card shows the setup; open it for step-by-step instructions. You do it with
        your phone (or the laptop camera), then the Oracle checks your measurement against physics.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 20, maxWidth: 900, margin: "0 auto",
      }}>
        {experiments.map((exp) => {
          const guide = GUIDES[exp.id];
          return (
          <Link
            key={exp.id}
            to={`/lab/${exp.id}`}
            style={{
              textDecoration: "none", color: "inherit",
              padding: 20, background: "#111128",
              border: "1px solid #223", borderRadius: 12,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          >
            {guide && (
              <div style={{ background: "#0b0f24", borderRadius: 8, padding: 6, marginBottom: 12 }}>
                <guide.Illustration />
              </div>
            )}
            <h3 style={{ fontSize: 18, fontWeight: 400, marginBottom: 6 }}>{exp.name}</h3>
            {guide && <p style={{ fontSize: 13, color: "#ccd", marginBottom: 8 }}>{guide.what}</p>}
            <p style={{ fontSize: 13, color: "#889", marginBottom: 8 }}>{exp.spooky}</p>
            <p style={{ fontSize: 12, color: "#667" }}>{exp.plain}</p>
            {guide && (
              <p style={{ fontSize: 12, marginTop: 10, color: guide.source === "phone" ? "#8c8" : "#ca8" }}>
                {SOURCE_NOTE[guide.source].badge}
                {guide.source === "camera" && " · via Apparition Gate"}
                {guide.source === "mic" && " · not live yet"}
              </p>
            )}
            <p style={{ fontSize: 12, color: "#88aaff", marginTop: 6 }}>Open for step-by-step setup &rarr;</p>
            <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {exp.channels.map((ch) => (
                <span key={ch} style={{
                  fontSize: 10, padding: "2px 8px", background: "#1a1a3a",
                  borderRadius: 10, color: "#778",
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
