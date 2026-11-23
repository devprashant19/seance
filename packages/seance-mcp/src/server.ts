import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { traceStats } from "./tools/trace-stats.js";
import { listSpirits } from "./tools/list-spirits.js";
import { recordTrace } from "./tools/record-trace.js";
import { readStream } from "./tools/read-stream.js";
import { runExperiment } from "./tools/run-experiment.js";
import { compareTraces } from "./tools/compare-traces.js";
import { z } from "zod";

export function createSeanceMcpServer(): McpServer {
  const server = new McpServer({
    name: "seance",
    version: "0.1.0",
  });

  server.tool(
    "trace_stats",
    "Load a .seance trace file and compute timing statistics (rate, jitter, dropouts, noise floor)",
    { path: z.string().describe("Path to a .seance trace file") },
    async ({ path }) => {
      try {
        const result = traceStats({ path });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "list_spirits",
    "List connected spirits in the relay dev room (returns offline mode if relay unreachable)",
    {},
    async () => {
      const result = await listSpirits();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "record_trace",
    "Record sensor data from a connected spirit for a given duration and save as .seance file",
    {
      spiritId: z.string().describe("ID of the spirit to record from"),
      durationSeconds: z.number().min(1).max(60).describe("Recording duration in seconds"),
      label: z.string().optional().describe("Optional label for the trace"),
      experiment: z.string().optional().describe("Optional experiment ID"),
    },
    async ({ spiritId, durationSeconds, label, experiment }) => {
      try {
        const result = await recordTrace({ spiritId, durationSeconds, label, experiment });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "read_stream",
    "Pull recent sensor samples from an observer buffer for a spirit's channel, with decimation",
    {
      spiritId: z.string().describe("ID of the spirit to read from"),
      channel: z.string().describe("Channel name (accel, gyro, orientation, audio.spectrum)"),
      durationSeconds: z.number().min(1).max(30).optional().describe("How long to listen (default 3s)"),
      maxPoints: z.number().min(10).max(1000).optional().describe("Maximum points returned (default 300)"),
    },
    async ({ spiritId, channel, durationSeconds, maxPoints }) => {
      try {
        const result = await readStream({ spiritId, channel, durationSeconds, maxPoints });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "run_experiment",
    "Run an experiment analysis pipeline on a .seance trace and return measured result with uncertainty",
    {
      tracePath: z.string().describe("Path to a .seance trace file"),
      experimentId: z.string().optional().describe("Experiment ID (inferred from trace if omitted)"),
      inputs: z.record(z.string(), z.number()).optional().describe("Override experiment inputs (e.g. stringLength)"),
    },
    async ({ tracePath, experimentId, inputs }) => {
      try {
        const result = await runExperiment({ tracePath, experimentId, inputs });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "compare_traces",
    "Diff timing metrics and channel RMS between two .seance traces",
    {
      traceA: z.string().describe("Path to first .seance trace file"),
      traceB: z.string().describe("Path to second .seance trace file"),
    },
    async ({ traceA, traceB }) => {
      try {
        const result = compareTraces({ traceA, traceB });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  return server;
}
