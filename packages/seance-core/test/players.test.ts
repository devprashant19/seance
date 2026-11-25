import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  sanitizeName,
  MAX_NAME_LENGTH,
  InstrumentCooldown,
  INSTRUMENT_COOLDOWN_MS,
  INSTRUMENTS,
  INSTRUMENT_IDS,
  isInstrumentId,
  instrumentInfo,
} from "../src/transports/phone-bridge/index.js";

describe("player names", () => {
  it("keeps ordinary names", () => {
    expect(sanitizeName("Asha")).toBe("Asha");
    expect(sanitizeName("  Ghost   Hunter  ")).toBe("Ghost Hunter");
    expect(sanitizeName("Zoë 👻")).toBe("Zoë 👻");
  });

  it("drops markup and control characters", () => {
    expect(sanitizeName("<b>bob</b>")).toBe("bbob/b");
    expect(sanitizeName("a\u0000b\u0007c\nd")).toBe("abc d");
  });

  it("rejects empty or non-string input", () => {
    expect(sanitizeName("")).toBeUndefined();
    expect(sanitizeName("   ")).toBeUndefined();
    expect(sanitizeName("<>")).toBeUndefined();
    expect(sanitizeName(42)).toBeUndefined();
    expect(sanitizeName(undefined)).toBeUndefined();
  });

  it("never returns markup, control characters or more than the max length", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (raw) => {
        const name = sanitizeName(raw);
        if (name === undefined) return;
        expect(Array.from(name).length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
        expect(name).not.toMatch(/[<>\u0000-\u001f\u007f-\u009f]/);
        expect(name).toBe(name.trim());
      }),
    );
  });
});

describe("choir instruments", () => {
  it("has a catalog entry for every id", () => {
    expect(INSTRUMENTS.map((i) => i.id)).toEqual([...INSTRUMENT_IDS]);
    for (const id of INSTRUMENT_IDS) expect(instrumentInfo(id).id).toBe(id);
  });

  it("validates ids", () => {
    expect(isInstrumentId("organ")).toBe(true);
    expect(isInstrumentId("kazoo")).toBe(false);
    expect(isInstrumentId(3)).toBe(false);
  });

  it("allows the first switch, then enforces the 10 s cooldown", () => {
    const cd = new InstrumentCooldown();
    cd.seed("p1");
    expect(cd.trySwitch("p1", 1_000)).toBe(true);
    expect(cd.trySwitch("p1", 1_000 + 5_000)).toBe(false);
    expect(cd.remaining("p1", 1_000 + 5_000)).toBe(INSTRUMENT_COOLDOWN_MS - 5_000);
    expect(cd.trySwitch("p1", 1_000 + INSTRUMENT_COOLDOWN_MS)).toBe(true);
  });

  it("tracks players independently and forgets players who leave", () => {
    const cd = new InstrumentCooldown();
    expect(cd.trySwitch("a", 0)).toBe(true);
    expect(cd.trySwitch("b", 100)).toBe(true);
    expect(cd.trySwitch("a", 200)).toBe(false);
    cd.forget("a");
    expect(cd.trySwitch("a", 300)).toBe(true);
  });

  it("tolerates small clock differences between phone and laptop", () => {
    const cd = new InstrumentCooldown(10_000, 750);
    expect(cd.trySwitch("p", 0)).toBe(true);
    expect(cd.trySwitch("p", 9_400)).toBe(true); // phone's countdown finished a little early
    expect(cd.trySwitch("p", 9_400 + 8_000)).toBe(false);
  });
});
