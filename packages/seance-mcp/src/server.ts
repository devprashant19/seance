import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { traceStats } from "./tools/trace-stats.js";
import { listSpirits } from "./tools/list-spirits.js";
import { recordTrace } from "./tools/record-trace.js";
import { readStream } from "./tools/read-stream.js";
import { runExperiment } from "./tools/run-experiment.js";
import { compareTraces } from "./tools/compare-traces.js";
import { accessibleResult } from "./tools/accessible-result.js";
import { auditSonification } from "./tools/audit-sonification.js";
import { sensorPassport } from "./tools/sensor-passport.js";
import { compareDeviceProfiles } from "./tools/compare-device-profiles.js";
import { extractEventWindowTool } from "./tools/extract-event-window.js";
import { instructTool } from "./tools/instruct.js";
import { arrayModes } from "./tools/array-modes.js";
import { checkSyncSkew } from "./tools/check-sync-skew.js";
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

  server.tool(
    "accessible_result",
    "Extract landmark events, compute physical result with uncertainty, and generate accessible spoken sentence from a .seance trace",
    {
      tracePath: z.string().describe("Path to a .seance trace file"),
      experimentId: z.string().describe("Experiment identifier (e.g. pendulum-g)"),
    },
    async ({ tracePath, experimentId }) => {
      try {
        const result = accessibleResult({ tracePath, experimentId });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "audit_sonification",
    "Audit auditory parameters of a trace: pitch dynamic range, clipping events, and earcon collision rates",
    {
      tracePath: z.string().describe("Path to a .seance trace file"),
    },
    async ({ tracePath }) => {
      try {
        const result = auditSonification({ tracePath });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "sensor_passport",
    "Inspect physical sensor performance (sampling frequency, jitter, dropouts, still-window noise floor, gyro bias) from a .seance trace",
    {
      tracePath: z.string().describe("Path to a .seance trace file"),
    },
    async ({ tracePath }) => {
      try {
        const result = sensorPassport({ tracePath });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "compare_device_profiles",
    "Compare a measured device passport against a device baseline tolerance profile",
    {
      samplePassportPath: z.string().describe("Path to the measured device passport JSON"),
      baselinePath: z.string().describe("Path to the device baseline profile JSON"),
    },
    async ({ samplePassportPath, baselinePath }) => {
      try {
        const result = compareDeviceProfiles({ samplePassportPath, baselinePath });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "extract_event_window",
    "Extract a 2.0s event window (0.5s pre, 1.5s post) around a physical transient event and generate a replay test template",
    {
      tracePath: z.string().describe("Path to a .seance trace file"),
      tMs: z.number().optional().describe("Trigger timestamp in ms (auto-detected if omitted)"),
      outputPath: z.string().optional().describe("Optional destination path for extracted .seance event file"),
    },
    async ({ tracePath, tMs, outputPath }) => {
      try {
        const result = extractEventWindowTool({ tracePath, tMs, outputPath });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "instruct",
    "Send a real-time calibration/ritual instruction to a connected spirit phone via relay",
    {
      spiritId: z.string().describe("Target spirit peer identifier"),
      text: z.string().max(200).describe("Instruction message (<= 200 chars)"),
      step: z.number().optional().describe("Optional ritual step number"),
    },
    async ({ spiritId, text, step }) => {
      try {
        const result = instructTool({ spiritId, text, step });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "array_modes",
    "Compute shared normal modes, relative amplitudes, and phase uncertainties across multi-channel spirit array traces",
    {
      tracePath: z.string().describe("Path to a multi-channel .seance trace file"),
      skewMs: z.number().optional().describe("Optional estimated clock skew in ms (default 5.0)"),
    },
    async ({ tracePath, skewMs }) => {
      try {
        const result = arrayModes({ tracePath, skewMs });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    "check_sync_skew",
    "Calculate lower-bound clock synchronization uncertainty from measured ping RTT samples",
    {
      rttSamplesMs: z.array(z.number()).optional().describe("Array of measured round-trip times in ms"),
    },
    async ({ rttSamplesMs }) => {
      try {
        const result = checkSyncSkew({ rttSamplesMs });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }
    },
  );

  return server;
}
