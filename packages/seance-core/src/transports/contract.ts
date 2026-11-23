import { describe, expect, it } from "vitest";
import type { SampleBatch, Spirit } from "../spirit.js";
import { UnsupportedChannelError } from "../spirit.js";

export function runSpiritContract(
  name: string,
  makeSpirit: () => Spirit | Promise<Spirit>,
): void {
  describe(`Spirit contract: ${name}`, () => {
    it("starts in idle state", async () => {
      const spirit = await makeSpirit();
      expect(spirit.state).toBe("idle");
    });

    it("transitions idle → summoning → present on summon()", async () => {
      const states: string[] = [];
      const spirit = await makeSpirit();
      spirit.on("state", (payload) => {
        const p = payload as { state: string };
        states.push(p.state);
      });
      await spirit.summon();
      expect(states).toContain("summoning");
      expect(states).toContain("present");
      expect(spirit.state).toBe("present");
    });

    it("capabilities are non-empty and match known channel ids", async () => {
      const spirit = await makeSpirit();
      expect(spirit.capabilities.length).toBeGreaterThan(0);
      for (const cap of spirit.capabilities) {
        expect(typeof cap.id).toBe("string");
        expect(cap.id.length).toBeGreaterThan(0);
        expect(typeof cap.unit).toBe("string");
        expect(cap.nominalRateHz).toBeGreaterThan(0);
      }
    });

    it("batches have strictly increasing seq and non-decreasing t with finite values", async () => {
      const spirit = await makeSpirit();
      await spirit.summon();

      const channel = spirit.capabilities[0]!;
      const batches: SampleBatch[] = [];

      const stream = spirit.stream(channel.id);
      const unsub = stream.subscribe((batch) => {
        batches.push(batch);
      });

      await tick(spirit, 200);

      unsub();
      expect(batches.length).toBeGreaterThan(0);

      let prevSeq = -1;
      for (const batch of batches) {
        expect(batch.seq).toBeGreaterThan(prevSeq);
        prevSeq = batch.seq;

        for (let i = 1; i < batch.t.length; i++) {
          expect(batch.t[i]).toBeGreaterThanOrEqual(batch.t[i - 1]!);
        }

        for (const axis of batch.values) {
          for (let i = 0; i < axis.length; i++) {
            expect(Number.isFinite(axis[i])).toBe(true);
          }
        }
      }

      await spirit.banish();
    });

    it("throws UnsupportedChannelError for unknown channel", async () => {
      const spirit = await makeSpirit();
      expect(() =>
        spirit.stream("nonexistent.channel" as never),
      ).toThrow(UnsupportedChannelError);
    });

    it("unsubscribe stops delivery", async () => {
      const spirit = await makeSpirit();
      await spirit.summon();

      const channel = spirit.capabilities[0]!;
      const batches: SampleBatch[] = [];

      const stream = spirit.stream(channel.id);
      const unsub = stream.subscribe((batch) => {
        batches.push(batch);
      });

      await tick(spirit, 100);
      unsub();

      const countAfterUnsub = batches.length;
      await tick(spirit, 100);

      expect(batches.length).toBe(countAfterUnsub);
      await spirit.banish();
    });

    it("banish → banished, no further batches", async () => {
      const spirit = await makeSpirit();
      await spirit.summon();

      const channel = spirit.capabilities[0]!;
      const batches: SampleBatch[] = [];
      const stream = spirit.stream(channel.id);
      stream.subscribe((batch) => {
        batches.push(batch);
      });

      await spirit.banish();
      expect(spirit.state).toBe("banished");

      const countAfterBanish = batches.length;
      await tick(spirit, 100);

      expect(batches.length).toBe(countAfterBanish);
    });
  });
}

async function tick(spirit: Spirit, ms: number): Promise<void> {
  if ("advance" in spirit && typeof (spirit as never as Record<string, unknown>).advance === "function") {
    (spirit as never as { advance(ms: number): void }).advance(ms);
  } else {
    await new Promise((r) => setTimeout(r, ms));
  }
}
