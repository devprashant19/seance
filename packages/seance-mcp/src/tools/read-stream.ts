const RELAY_URL = process.env["SEANCE_RELAY_URL"] ?? "ws://localhost:8787";
const ROOM = process.env["SEANCE_ROOM"] ?? "DEV1";
const KEY = process.env["SEANCE_OBSERVER_KEY"] ?? "dev-only-not-a-secret";

export interface ReadStreamInput {
  spiritId: string;
  channel: string;
  durationSeconds?: number;
  maxPoints?: number;
}

export interface StreamPoint {
  t: number;
  values: number[];
}

export interface ReadStreamResult {
  spiritId: string;
  channel: string;
  unit: string;
  points: StreamPoint[];
  decimated: boolean;
}

const CHANNEL_UNITS: Record<string, string> = {
  accel: "m/s^2",
  accelG: "m/s^2",
  gyro: "rad/s",
  "audio.spectrum": "dBFS",
  orientation: "rad",
};

export async function readStream(input: ReadStreamInput): Promise<ReadStreamResult> {
  const duration = input.durationSeconds ?? 3;
  const maxPoints = input.maxPoints ?? 300;
  const unit = CHANNEL_UNITS[input.channel] ?? "unknown";
  const points: StreamPoint[] = [];

  try {
    const { default: WebSocket } = await import("ws");

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), duration * 1000 + 1000);
      const startTime = Date.now();

      try {
        const ws = new WebSocket(RELAY_URL);

        ws.on("open", () => {
          ws.send(JSON.stringify({
            type: "hello", version: 1, role: "observer",
            roomCode: ROOM, key: KEY,
          }));
        });

        ws.on("message", (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === "batch" && msg.spiritId === input.spiritId) {
              const channels = msg.channels as Record<string, Array<{ t: number; v: number[] }>>;
              const ch = channels[input.channel];
              if (ch) {
                for (const s of ch) {
                  points.push({ t: s.t, values: s.v });
                }
              }
            }
          } catch { /* ignore */ }

          if (Date.now() - startTime >= duration * 1000) {
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        });

        ws.on("error", () => { clearTimeout(timeout); resolve(); });
      } catch { clearTimeout(timeout); resolve(); }
    });
  } catch { /* ws not available */ }

  let decimated = false;
  let result = points;
  if (points.length > maxPoints) {
    const step = Math.ceil(points.length / maxPoints);
    result = points.filter((_, i) => i % step === 0);
    decimated = true;
  }

  return {
    spiritId: input.spiritId,
    channel: input.channel,
    unit,
    points: result,
    decimated,
  };
}
