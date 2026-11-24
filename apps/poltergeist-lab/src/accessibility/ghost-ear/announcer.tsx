import { useEffect, useState } from "react";

let globalAnnounce: ((text: string) => void) | null = null;

export function announce(text: string) {
  if (globalAnnounce) {
    globalAnnounce(text);
  }
}

export function Announcer() {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    globalAnnounce = (text: string) => {
      setAnnouncement(text);
    };
    return () => {
      globalAnnounce = null;
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {announcement}
    </div>
  );
}
