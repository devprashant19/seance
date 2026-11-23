#!/usr/bin/env node

/**
 * H5 helper: verify that seance-core public API changes don't break downstream packages.
 * Runs typecheck on all workspace packages that depend on seance-core.
 */

import { execSync } from "node:child_process";

const DEPENDENTS = ["poltergeist-lab", "seance-mcp", "banshee-choir"];

let failures = 0;

for (const pkg of DEPENDENTS) {
  try {
    execSync(`pnpm -F ${pkg} run typecheck`, {
      stdio: "pipe",
      encoding: "utf-8",
      timeout: 30_000,
    });
    console.log(`✓ ${pkg} — typecheck passed`);
  } catch (err) {
    failures++;
    const stderr = err.stderr ?? err.stdout ?? "";
    const lines = stderr.split("\n").filter((l) => l.includes("error TS"));
    console.error(`✗ ${pkg} — typecheck failed`);
    for (const line of lines.slice(0, 5)) {
      console.error(`  ${line.trim()}`);
    }
    if (lines.length > 5) {
      console.error(`  ... and ${lines.length - 5} more errors`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} downstream package(s) broken by API change`);
  process.exit(1);
}

console.log("\nAll downstream packages compatible with public API");
