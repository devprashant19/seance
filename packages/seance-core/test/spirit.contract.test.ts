import { runSpiritContract } from "../src/transports/contract.js";
import { createMockSpirit, signals } from "../src/transports/mock.js";

runSpiritContract("MockSpirit (manual clock)", () =>
  createMockSpirit({
    seed: 42,
    clock: "manual",
    batchMs: 50,
    channels: [
      {
        id: "accel",
        unit: "m/s^2",
        axes: ["x", "y", "z"],
        nominalRateHz: 100,
        signals: [
          signals.sine(1, 9.81),
          signals.constant(0),
          signals.dampedSine(2, 5, 0.5),
        ],
      },
    ],
  }),
);
