import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createTraceId, type GhostTrace, computeTimingStats } from "seance-core";

export interface RecordTraceInput {
  spiritId: string;
  durationSeconds: number;
  label?: string;
  experiment?: string;
}

export interface RecordTraceResult {
  path: string;
  id: string;
  samples: number;
  durationMs: number;
  meanHz: number;
}

export async function recordTrace(input: RecordTraceInput): Promise<RecordTraceResult> {
  const relayUrl = process.env["SEANCE_RELAY_URL"] ?? "ws://localhost:8787";
  const room = process.env["SEANCE_ROOM"] ?? "DEV1";
  const key = process.env["SEANCE_OBSERVER_KEY"] ?? "dev-only-not-a-secret";

  const id = createTraceId();
  const timestamps: number[] = [];
  const accelData: number[][] = [];

  const { default: WebSocket } = await import("ws");

  await new Promise<void>((resolveP, reject) => {
    const timeout = setTimeout(() => {
      resolveP();
    }, input.durationSeconds * 1000 + 2000);

    try {
      const ws = new WebSocket(relayUrl);
      const startTime = Date.now();

      ws.on("open", () => {
        ws.send(JSON.stringify({
          type: "hello",
          version: 1,
          role: "observer",
          roomCode: room,
          key,
        }));
      });

      ws.on("message", (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "batch" && msg.spiritId === input.spiritId) {
            const channels = msg.channels as Record<string, Array<{ t: number; v: number[] }>>;
            for (const [, samples] of Object.entries(channels)) {
              for (const s of samples) {
                timestamps.push(s.t);
                accelData.push(s.v);
              }
            }
          }
        } catch { /* ignore */ }

        if (Date.now() - startTime >= input.durationSeconds * 1000) {
          clearTimeout(timeout);
          ws.close();
          resolveP();
        }
      });

      ws.on("error", () => {
        clearTimeout(timeout);
        reject(new Error("Failed to connect to relay for recording"));
      });
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });

  const trace: GhostTrace = {
    format: "seance-trace",
    version: 1,
    id,
    label: input.label ?? `Recording of ${input.spiritId}`,
    experiment: input.experiment,
    createdAt: new Date().toISOString(),
    spiritId: input.spiritId,
    channels: [{
      id: "accelG" as const,
      unit: "m/s^2" as const,
      axes: ["x", "y", "z"],
      t: timestamps,
      data: accelData,
    }],
  };

  const outDir = resolve(process.cwd(), "fixtures/traces");
  const outPath = resolve(outDir, `${id}.seance`);
  writeFileSync(outPath, JSON.stringify(trace, null, 2));

  const timing = computeTimingStats(timestamps);

  return {
    path: outPath,
    id,
    samples: timestamps.length,
    durationMs: timestamps.length > 1 ? timestamps[timestamps.length - 1]! - timestamps[0]! : 0,
    meanHz: timing.meanHz,
  };
}
