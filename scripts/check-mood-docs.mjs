#!/usr/bin/env node

/**
 * H6 helper: verify that avatar mood definitions are documented.
 * Checks that every exported mood name in seance-avatars/src/moods/ has
 * a corresponding entry in the docs or steering files.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const MOODS_DIR = resolve("packages/seance-avatars/src/moods");
const DOC_PATHS = [
  ".kiro/steering/avatars.md",
  "docs/avatars.md",
  "packages/seance-avatars/README.md",
];

if (!existsSync(MOODS_DIR)) {
  console.log("No moods directory found — skipping check");
  process.exit(0);
}

const moodFiles = readdirSync(MOODS_DIR).filter(
  (f) => f.endsWith(".ts") && f !== "index.ts"
);

const moodNames = moodFiles.map((f) => f.replace(/\.ts$/, ""));

let docContent = "";
for (const p of DOC_PATHS) {
  if (existsSync(p)) {
    docContent += readFileSync(p, "utf-8") + "\n";
  }
}

if (docContent.length === 0) {
  console.log("No mood documentation files found — all moods undocumented");
  if (moodNames.length > 0) {
    console.error(`Undocumented moods: ${moodNames.join(", ")}`);
    process.exit(1);
  }
  process.exit(0);
}

const undocumented = moodNames.filter(
  (name) => !docContent.toLowerCase().includes(name.toLowerCase())
);

if (undocumented.length > 0) {
  console.error(`Undocumented moods: ${undocumented.join(", ")}`);
  console.error("Add entries to .kiro/steering/avatars.md or docs/avatars.md");
  process.exit(1);
}

console.log(`All ${moodNames.length} moods documented`);
