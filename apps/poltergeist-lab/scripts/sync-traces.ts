import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const MANIFEST_PATH = resolve(ROOT, "fixtures/traces/bundled.json");
const OUT_DIR = resolve(import.meta.dirname, "../public/traces");

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

function validateTrace(path: string): boolean {
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" && "version" in data;
  } catch {
    return false;
  }
}

function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  console.log(`Found ${manifest.traces.length} traces in manifest.`);

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  let valid = 0;
  let skipped = 0;

  for (const trace of manifest.traces) {
    const srcPath = resolve(ROOT, "fixtures/traces", trace.file);
    if (!existsSync(srcPath)) {
      console.warn(`  SKIP: ${trace.id} — source not found: ${trace.file}`);
      skipped++;
      continue;
    }

    if (!validateTrace(srcPath)) {
      console.warn(`  SKIP: ${trace.id} — invalid trace format`);
      skipped++;
      continue;
    }

    const destPath = resolve(OUT_DIR, `${trace.id}.seance`);
    const destDir = dirname(destPath);
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

    copyFileSync(srcPath, destPath);
    console.log(`  OK: ${trace.id} → public/traces/${trace.id}.seance`);
    valid++;
  }

  writeFileSync(resolve(OUT_DIR, "bundled.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nSynced ${valid} traces, skipped ${skipped}.`);

  if (valid === 0) {
    console.error("No valid traces synced — build may fail without fixtures.");
    process.exit(1);
  }
}

main();
