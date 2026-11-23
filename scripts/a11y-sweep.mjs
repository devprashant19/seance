#!/usr/bin/env node

/**
 * H8 helper: lightweight a11y sweep for React components.
 * Checks for common accessibility issues in .tsx files.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";

const APPS_DIR = resolve("apps");
const ISSUES = [];

function collectTsxFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (entry === "node_modules" || entry === "dist") continue;
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...collectTsxFiles(full));
      } else if (extname(full) === ".tsx") {
        files.push(full);
      }
    }
  } catch { /* ignore */ }
  return files;
}

function checkFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const relativePath = filePath.replace(resolve(".") + "/", "");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (/<img\s/.test(line) && !/alt=/.test(line)) {
      ISSUES.push({ file: relativePath, line: lineNum, rule: "img-alt", msg: "<img> missing alt attribute" });
    }

    if (/<button\s/.test(line) && !/aria-label/.test(line) && !/>.*<\/button>/.test(line)) {
      ISSUES.push({ file: relativePath, line: lineNum, rule: "button-label", msg: "<button> may need aria-label (no visible text)" });
    }

    if (/onClick=/.test(line) && /<(?:div|span)\s/.test(line) && !/role=/.test(line) && !/tabIndex/.test(line)) {
      ISSUES.push({ file: relativePath, line: lineNum, rule: "click-handler", msg: "onClick on non-interactive element without role/tabIndex" });
    }

    if (/<svg\s/.test(line) && !/aria-hidden/.test(line) && !/aria-label/.test(line) && !/role=/.test(line)) {
      ISSUES.push({ file: relativePath, line: lineNum, rule: "svg-a11y", msg: "<svg> missing aria-hidden or aria-label" });
    }
  }
}

const tsxFiles = collectTsxFiles(APPS_DIR);
for (const f of tsxFiles) {
  checkFile(f);
}

if (ISSUES.length === 0) {
  console.log(`Scanned ${tsxFiles.length} components — no a11y issues found`);
  process.exit(0);
}

console.error(`Found ${ISSUES.length} accessibility issue(s):\n`);
for (const issue of ISSUES) {
  console.error(`  ${issue.file}:${issue.line} [${issue.rule}] ${issue.msg}`);
}
process.exit(1);
