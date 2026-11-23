#!/usr/bin/env node
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  existsSync,
  cpSync,
} from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Options {
  readonly dir: string;
  readonly template: string;
  readonly relay: string;
  readonly force: boolean;
}

export function parseArgs(argv: readonly string[]): Options {
  const args = argv.slice(2);
  let dir = "";
  let template = "lab";
  let relay = "ws://localhost:8787";
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--template" && args[i + 1]) {
      template = args[++i]!;
    } else if (arg === "--relay" && args[i + 1]) {
      relay = args[++i]!;
    } else if (arg === "--force") {
      force = true;
    } else if (!arg.startsWith("--")) {
      dir = arg;
    }
  }

  return { dir, template, relay, force };
}

function walkFiles(dir: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function replaceInFile(
  filePath: string,
  replacements: Readonly<Record<string, string>>,
): void {
  let content = readFileSync(filePath, "utf-8");
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  writeFileSync(filePath, content);
}

export class ScaffoldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaffoldError";
  }
}

export function scaffoldProject(options: Options): string {
  if (!options.dir) {
    throw new ScaffoldError(
      "Usage: create-seance-app <dir> [--template lab|instrument] [--force]",
    );
  }

  const targetDir = resolve(options.dir);

  if (existsSync(targetDir)) {
    const contents = readdirSync(targetDir);
    if (contents.length > 0 && !options.force) {
      throw new ScaffoldError(
        `${targetDir} is not empty. Use --force to overwrite.`,
      );
    }
  }

  const templatesDir = resolve(__dirname, "..", "templates", options.template);
  if (!existsSync(templatesDir)) {
    throw new ScaffoldError(`Template "${options.template}" not found.`);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(templatesDir, targetDir, { recursive: true });

  const projectName = basename(resolve(options.dir));
  const replacements: Record<string, string> = {
    name: projectName,
    relayUrl: options.relay,
  };

  const textExtensions = new Set([
    ".json",
    ".ts",
    ".tsx",
    ".md",
    ".html",
    ".css",
  ]);
  for (const file of walkFiles(targetDir)) {
    const ext = file.substring(file.lastIndexOf("."));
    if (textExtensions.has(ext)) {
      replaceInFile(file, replacements);
    }
  }

  console.log("");
  console.log("  ╔══════════════════════════════════╗");
  console.log("  ║   👻 Séance App Summoned!        ║");
  console.log("  ╚══════════════════════════════════╝");
  console.log("");
  console.log(`  Your new lab: ${targetDir}`);
  console.log("");
  console.log("  Next steps:");
  console.log(`    cd ${options.dir}`);
  console.log("    pnpm install");
  console.log("    pnpm dev");
  console.log("");
  console.log("  To add an experiment:");
  console.log(
    "    Write a spec in .kiro/specs/experiments/<id>/requirements.md",
  );
  console.log(
    "    Save it, and Kiro hook H1 will scaffold the experiment for you.",
  );
  console.log("");

  return targetDir;
}

if (process.argv[1] && /cli\.[jt]s$/.test(process.argv[1])) {
  try {
    scaffoldProject(parseArgs(process.argv));
  } catch (err) {
    if (err instanceof ScaffoldError) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}
