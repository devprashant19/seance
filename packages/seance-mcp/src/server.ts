import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { traceStats } from "./tools/trace-stats.js";
import { listSpirits } from "./tools/list-spirits.js";
import { recordTrace } from "./tools/record-trace.js";
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

  return server;
}
