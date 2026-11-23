#!/usr/bin/env node
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const projects = [];
let filter = "";
let typecheck = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--project" && i + 1 < args.length) {
    projects.push(args[++i]);
  } else if (args[i] === "--filter" && i + 1 < args.length) {
    filter = args[++i];
  } else if (args[i] === "--typecheck") {
    typecheck = true;
  }
}

if (projects.length === 0) {
  process.stderr.write("Error: at least one --project required\n");
  process.exit(1);
}

function run(cmd, label) {
  try {
    execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8" });
  } catch (err) {
    process.stderr.write(`FAIL: ${label}\n`);
    if (err.stdout) process.stderr.write(err.stdout);
    if (err.stderr) process.stderr.write(err.stderr);
    process.exit(1);
  }
}

for (const project of projects) {
  const name = project.split("/").pop();

  if (typecheck) {
    run(`pnpm -F ${name} typecheck`, `typecheck ${name}`);
  }

  let cmd = `pnpm -F ${name} exec vitest run --passWithNoTests`;
  if (filter) {
    const filters = filter.split(",");
    cmd += ` ${filters.join(" ")}`;
  }
  run(cmd, `vitest ${name}`);
}

const labels = projects.map((p) => p.split("/").pop()).join(", ");
process.stdout.write(`OK: ${labels} — all tests passed\n`);
