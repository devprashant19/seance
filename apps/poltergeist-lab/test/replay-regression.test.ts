import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TraceEntry {
  id: string;
  file: string;
  experiment: string;
  device: string;
  label: string;
  expected: { quantity: string; reference: number; unit: string; tolerance: number };
  cursed?: boolean;
}

interface Manifest {
  version: number;
  traces: TraceEntry[];
}

const FIXTURES_DIR = resolve(import.meta.dirname, "../../..", "fixtures/traces");
const MANIFEST_PATH = resolve(FIXTURES_DIR, "bundled.json");

function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
}

function loadTrace(file: string): Record<string, unknown> {
  const raw = readFileSync(resolve(FIXTURES_DIR, file), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

describe("replay regression: manifest integrity", () => {
  it("manifest loads and has version 1", () => {
    const manifest = loadManifest();
    expect(manifest.version).toBe(1);
    expect(manifest.traces.length).toBeGreaterThan(0);
  });

  it("every trace has required fields", () => {
    const manifest = loadManifest();
    for (const trace of manifest.traces) {
      expect(trace.id).toBeTruthy();
      expect(trace.file).toBeTruthy();
      expect(trace.experiment).toBeTruthy();
      expect(trace.device).toBeTruthy();
      expect(trace.label).toBeTruthy();
      expect(trace.expected).toBeDefined();
      expect(trace.expected.quantity).toBeTruthy();
      expect(typeof trace.expected.reference).toBe("number");
      expect(trace.expected.unit).toBeTruthy();
      expect(typeof trace.expected.tolerance).toBe("number");
    }
  });

  it("every trace file exists and is valid JSON with version", () => {
    const manifest = loadManifest();
    for (const trace of manifest.traces) {
      const data = loadTrace(trace.file);
      expect(data).toBeDefined();
      expect(data.version).toBeDefined();
    }
  });
});

describe("replay regression: experiment coverage", () => {
  it("has at least one trace per MVP experiment", () => {
    const manifest = loadManifest();
    const experiments = new Set(manifest.traces.map((t) => t.experiment));
    expect(experiments.has("pendulum-g")).toBe(true);
    expect(experiments.has("free-fall")).toBe(true);
    expect(experiments.has("singing-ruler")).toBe(true);
  });

  it("has at least one cursed trace", () => {
    const manifest = loadManifest();
    const cursed = manifest.traces.filter((t) => t.cursed);
    expect(cursed.length).toBeGreaterThanOrEqual(1);
  });
});

describe("replay regression: trace IDs are unique", () => {
  it("no duplicate trace IDs", () => {
    const manifest = loadManifest();
    const ids = manifest.traces.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
