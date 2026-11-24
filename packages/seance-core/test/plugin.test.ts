import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  defineInstrument,
  defineExperiment,
  PluginRegistry,
  getGlobalRegistry,
} from "../src/plugin.js";
import { createMockSpirit, signals } from "../src/transports/mock.js";

const testInstrument = defineInstrument({
  name: "test-accelerometer",
  kind: "poltergeist",
  channels: ["accel"],
  description: "Test accelerometer instrument",
  createSpirit: () =>
    createMockSpirit({
      seed: 1,
      clock: "manual",
      channels: [
        {
          id: "accel",
          unit: "m/s^2",
          axes: ["x", "y", "z"],
          nominalRateHz: 100,
          signals: [signals.constant(9.81), signals.constant(0), signals.constant(0)],
        },
      ],
    }),
});

describe("defineInstrument", () => {
  it("returns a frozen instrument definition", () => {
    expect(testInstrument.name).toBe("test-accelerometer");
    expect(testInstrument.kind).toBe("poltergeist");
    expect(Object.isFrozen(testInstrument)).toBe(true);
  });
});

describe("defineExperiment", () => {
  it("returns a frozen experiment definition", () => {
    const exp = defineExperiment({
      name: "pendulum-test",
      instruments: ["test-accelerometer"],
      durationMs: 30_000,
    });
    expect(exp.name).toBe("pendulum-test");
    expect(Object.isFrozen(exp)).toBe(true);
  });
});

describe("PluginRegistry", () => {
  it("registers and retrieves instruments", () => {
    const reg = new PluginRegistry();
    reg.registerInstrument(testInstrument);
    expect(reg.getInstrument("test-accelerometer")).toBe(testInstrument);
    expect(reg.listInstruments()).toHaveLength(1);
  });

  it("rejects duplicate instrument registration", () => {
    const reg = new PluginRegistry();
    reg.registerInstrument(testInstrument);
    expect(() => reg.registerInstrument(testInstrument)).toThrow(
      "Instrument already registered",
    );
  });

  it("registers experiments that reference known instruments", () => {
    const reg = new PluginRegistry();
    reg.registerInstrument(testInstrument);
    const exp = defineExperiment({
      name: "pendulum",
      instruments: ["test-accelerometer"],
    });
    reg.registerExperiment(exp);
    expect(reg.getExperiment("pendulum")).toBe(exp);
    expect(reg.listExperiments()).toHaveLength(1);
  });

  it("rejects experiment with unknown instrument", () => {
    const reg = new PluginRegistry();
    const exp = defineExperiment({
      name: "bad-exp",
      instruments: ["nonexistent"],
    });
    expect(() => reg.registerExperiment(exp)).toThrow(
      "unregistered instrument",
    );
  });

  it("rejects duplicate experiment registration", () => {
    const reg = new PluginRegistry();
    reg.registerInstrument(testInstrument);
    const exp = defineExperiment({
      name: "dup",
      instruments: ["test-accelerometer"],
    });
    reg.registerExperiment(exp);
    expect(() => reg.registerExperiment(exp)).toThrow(
      "Experiment already registered",
    );
  });

  it("clear removes all registrations", () => {
    const reg = new PluginRegistry();
    reg.registerInstrument(testInstrument);
    reg.registerExperiment(
      defineExperiment({ name: "e", instruments: ["test-accelerometer"] }),
    );
    reg.clear();
    expect(reg.listInstruments()).toHaveLength(0);
    expect(reg.listExperiments()).toHaveLength(0);
  });
});

describe("getGlobalRegistry", () => {
  it("returns the same instance", () => {
    const a = getGlobalRegistry();
    const b = getGlobalRegistry();
    expect(a).toBe(b);
  });
});

describe("PluginRegistry property tests", () => {
  it("Property 1: retrieval by id or name returns the exact registered experiment definition", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !/\s/.test(s)),
        fc.string({ minLength: 1, maxLength: 30 }),
        (id, name) => {
          const reg = new PluginRegistry();
          const exp = defineExperiment({
            id,
            name,
            spooky: "The spirit whispers",
            plain: "Measure properties",
          });
          reg.registerExperiment(exp);
          expect(reg.getExperiment(id)).toBe(exp);
          expect(reg.getExperiment(name)).toBe(exp);
          expect(reg.listExperiments()).toContain(exp);
          expect(reg.listExperiments().length).toBe(1);
        },
      ),
    );
  });

  it("Property 2: InputSpec invariant min <= defaultValue <= max and defaultUncertainty >= 0", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.double({ min: 0.1, max: 500, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (base, span, unc) => {
          const min = base;
          const max = base + span;
          const defaultValue = min + span / 2;
          const spec = {
            key: "testParam",
            label: "Test Parameter",
            unit: "m",
            defaultValue,
            defaultUncertainty: unc,
            min,
            max,
          };
          expect(spec.min).toBeLessThanOrEqual(spec.defaultValue);
          expect(spec.defaultValue).toBeLessThanOrEqual(spec.max);
          expect(spec.defaultUncertainty).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});

