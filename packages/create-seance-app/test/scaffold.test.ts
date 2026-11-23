import { describe, it, expect, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scaffoldProject, parseArgs, ScaffoldError } from "../src/cli.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "seance-scaffold-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe("parseArgs", () => {
  it("parses dir and defaults", () => {
    const opts = parseArgs(["node", "cli.js", "my-lab"]);
    expect(opts.dir).toBe("my-lab");
    expect(opts.template).toBe("lab");
    expect(opts.relay).toBe("ws://localhost:8787");
    expect(opts.force).toBe(false);
  });

  it("parses all flags", () => {
    const opts = parseArgs([
      "node",
      "cli.js",
      "my-lab",
      "--template",
      "instrument",
      "--relay",
      "ws://example.com:9090",
      "--force",
    ]);
    expect(opts.dir).toBe("my-lab");
    expect(opts.template).toBe("instrument");
    expect(opts.relay).toBe("ws://example.com:9090");
    expect(opts.force).toBe(true);
  });

  it("returns empty dir when none given", () => {
    const opts = parseArgs(["node", "cli.js", "--force"]);
    expect(opts.dir).toBe("");
  });
});

describe("scaffoldProject", () => {
  it("throws when dir is empty", () => {
    expect(() =>
      scaffoldProject({ dir: "", template: "lab", relay: "ws://localhost:8787", force: false }),
    ).toThrow(ScaffoldError);
  });

  it("scaffolds to empty temp dir with expected files", () => {
    const base = makeTempDir();
    const target = join(base, "test-lab");

    scaffoldProject({ dir: target, template: "lab", relay: "ws://localhost:8787", force: false });

    expect(existsSync(join(target, "package.json"))).toBe(true);
    expect(existsSync(join(target, "src", "App.tsx"))).toBe(true);
    expect(existsSync(join(target, "src", "main.tsx"))).toBe(true);
    expect(existsSync(join(target, "index.html"))).toBe(true);
    expect(existsSync(join(target, "vite.config.ts"))).toBe(true);
    expect(existsSync(join(target, ".kiro", "steering", "physics.md"))).toBe(true);
    expect(existsSync(join(target, ".kiro", "hooks", "h1-summon-experiment.json"))).toBe(true);
    expect(existsSync(join(target, ".kiro", "specs", "experiments", "example-tilt", "requirements.md"))).toBe(true);
    expect(existsSync(join(target, "src", "experiments", "example-tilt", "index.ts"))).toBe(true);
    expect(existsSync(join(target, "fixtures", "traces", "example-tilt.seance"))).toBe(true);
  });

  it("replaces {{name}} in package.json", () => {
    const base = makeTempDir();
    const target = join(base, "my-cool-lab");

    scaffoldProject({ dir: target, template: "lab", relay: "ws://localhost:8787", force: false });

    const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf-8"));
    expect(pkg.name).toBe("my-cool-lab");
  });

  it("replaces {{relayUrl}} in mcp.json", () => {
    const base = makeTempDir();
    const target = join(base, "relay-test");

    scaffoldProject({ dir: target, template: "lab", relay: "ws://custom:9999", force: false });

    const mcp = JSON.parse(readFileSync(join(target, ".kiro", "settings", "mcp.json"), "utf-8"));
    expect(mcp.mcpServers.seance.env.SEANCE_RELAY_URL).toBe("ws://custom:9999");
  });

  it("throws for non-empty dir without --force", () => {
    const base = makeTempDir();
    const target = join(base, "occupied");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "existing.txt"), "hello");

    expect(() =>
      scaffoldProject({ dir: target, template: "lab", relay: "ws://localhost:8787", force: false }),
    ).toThrow(ScaffoldError);
  });

  it("allows non-empty dir with --force", () => {
    const base = makeTempDir();
    const target = join(base, "occupied");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "existing.txt"), "hello");

    scaffoldProject({ dir: target, template: "lab", relay: "ws://localhost:8787", force: true });

    expect(existsSync(join(target, "package.json"))).toBe(true);
    expect(existsSync(join(target, "existing.txt"))).toBe(true);
  });

  it("throws for unknown template", () => {
    const base = makeTempDir();
    const target = join(base, "nope");

    expect(() =>
      scaffoldProject({ dir: target, template: "nonexistent", relay: "ws://localhost:8787", force: false }),
    ).toThrow(ScaffoldError);
  });

  it("replaces {{name}} in README.md", () => {
    const base = makeTempDir();
    const target = join(base, "readme-test");

    scaffoldProject({ dir: target, template: "lab", relay: "ws://localhost:8787", force: false });

    const readme = readFileSync(join(target, "README.md"), "utf-8");
    expect(readme).toContain("# readme-test");
    expect(readme).not.toContain("{{name}}");
  });
});
