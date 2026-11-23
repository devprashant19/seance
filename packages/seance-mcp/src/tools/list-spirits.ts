const RELAY_URL = process.env["SEANCE_RELAY_URL"] ?? "ws://localhost:8787";
const ROOM = process.env["SEANCE_ROOM"] ?? "DEV1";
const OBSERVER_KEY = process.env["SEANCE_OBSERVER_KEY"] ?? "dev-only-not-a-secret";
const CONNECT_TIMEOUT_MS = 3000;

export interface SpiritInfo {
  spiritId: string;
  kind: string;
  capabilities: string[];
  label: string;
}

export interface ListSpiritsResult {
  mode: "online" | "offline";
  spirits: SpiritInfo[];
}

export async function listSpirits(): Promise<ListSpiritsResult> {
  try {
    const { default: WebSocket } = await import("ws");
    return await new Promise<ListSpiritsResult>((resolve) => {
      const timer = setTimeout(() => {
        resolve({ mode: "offline", spirits: [] });
      }, CONNECT_TIMEOUT_MS);

      try {
        const ws = new WebSocket(RELAY_URL);

        ws.on("open", () => {
          ws.send(JSON.stringify({
            type: "hello",
            version: 1,
            role: "observer",
            roomCode: ROOM,
            key: OBSERVER_KEY,
          }));
        });

        ws.on("message", (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === "roster" && Array.isArray(msg.spirits)) {
              clearTimeout(timer);
              ws.close();
              resolve({
                mode: "online",
                spirits: (msg.spirits as SpiritInfo[]).map((s) => ({
                  spiritId: s.spiritId,
                  kind: s.kind ?? "unknown",
                  capabilities: s.capabilities ?? [],
                  label: s.label ?? s.spiritId,
                })),
              });
            }
          } catch { /* ignore parse errors */ }
        });

        ws.on("error", () => {
          clearTimeout(timer);
          resolve({ mode: "offline", spirits: [] });
        });
      } catch {
        clearTimeout(timer);
        resolve({ mode: "offline", spirits: [] });
      }
    });
  } catch {
    return { mode: "offline", spirits: [] };
  }
}
