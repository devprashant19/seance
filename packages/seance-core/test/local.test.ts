import { describe, expect, it } from "vitest";
import { createLocalSpirit } from "../src/transports/local.js";
import type { SampleBatch } from "../src/spirit.js";

describe("LocalSpirit (stub mode in Node)", () => {
  it("starts idle and transitions to present", async () => {
    const spirit = createLocalSpirit();
    expect(spirit.state).toBe("idle");
    expect(spirit.kind).toBe("banshee");
    expect(spirit.transport).toBe("local");

    await spirit.summon();
    expect(spirit.state).toBe("present");
    expect(spirit.capabilities.length).toBe(2);
    expect(spirit.capabilities[0]!.id).toBe("audio.level");
    expect(spirit.capabilities[1]!.id).toBe("audio.spectrum");

    await spirit.banish();
    expect(spirit.state).toBe("banished");
  });

  it("emits audio.level batches in stub mode", async () => {
    const spirit = createLocalSpirit();
    await spirit.summon();

    const batches: SampleBatch[] = [];
    const stream = spirit.stream("audio.level");
    const unsub = stream.subscribe((b) => batches.push(b));

    await new Promise((r) => setTimeout(r, 120));
    unsub();

    expect(batches.length).toBeGreaterThan(0);
    for (const batch of batches) {
      expect(batch.channel).toBe("audio.level");
      expect(batch.values[0]![0]).toBe(-60);
    }

    await spirit.banish();
  });

  it("emits audio.spectrum batches in stub mode", async () => {
    const spirit = createLocalSpirit();
    await spirit.summon();

    const batches: SampleBatch[] = [];
    const stream = spirit.stream("audio.spectrum");
    const unsub = stream.subscribe((b) => batches.push(b));

    await new Promise((r) => setTimeout(r, 120));
    unsub();

    expect(batches.length).toBeGreaterThan(0);
    for (const batch of batches) {
      expect(batch.channel).toBe("audio.spectrum");
      expect(batch.values[0]!.length).toBe(1024);
    }

    await spirit.banish();
  });
});
