import { useParams, Link } from "react-router-dom";
import { getExperimentById } from "../lab/registry.js";
import { ExperimentRunner } from "../lab/ExperimentRunner.js";

export function LabRunner() {
  const { id } = useParams<{ id: string }>();
  const experiment = id ? getExperimentById(id) : undefined;

  if (!experiment) {
    return (
      <main style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0a0a1a", padding: 24,
      }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>Experiment not found.</p>
        <Link to="/lab" style={{ color: "#6688ff", fontSize: 14 }}>← Back to experiments</Link>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh", padding: 24,
      background: "radial-gradient(ellipse at center, #12122a 0%, #0a0a1a 70%)",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Link to="/lab" style={{ color: "#667", fontSize: 13, textDecoration: "none", marginBottom: 16, display: "block" }}>
          ← All experiments
        </Link>
        <ExperimentRunner experiment={experiment} />
      </div>
    </main>
  );
}
