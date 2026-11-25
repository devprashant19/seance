import { useEffect } from "react";
import { useParams } from "react-router-dom";

/**
 * `/join/:code` is kept for old links and typed URLs. The phone experience lives in the
 * lightweight `join.html` page (one implementation of the phone protocol, a few kB before the
 * "Begin" tap), so this route just forwards there.
 */
export function Join() {
  const { code } = useParams<{ code: string }>();
  const target = `/join.html?code=${encodeURIComponent((code ?? "").toUpperCase())}`;

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, textAlign: "center" }}>
      <p>
        Opening the séance… <a href={target} style={{ color: "#00e5ff" }}>Tap here if nothing happens</a>.
      </p>
    </main>
  );
}
