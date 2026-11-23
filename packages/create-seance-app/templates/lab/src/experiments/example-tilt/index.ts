export const exampleTilt = {
  id: "example-tilt",
  name: "The Tilted Spirit",
  spooky: "Tilt the phone and the spirit reveals its angle.",
  plain: "Measure tilt angle from accelerometer gravity components.",
  channels: ["accelG"],
  inputs: [
    {
      key: "axis",
      label: "Tilt axis",
      unit: "index",
      defaultValue: 0,
      defaultUncertainty: 0,
      min: 0,
      max: 2,
    },
  ],
  safetyNote: "Hold the phone firmly to avoid dropping it.",
  analyze(
    channels: Record<string, readonly { t: number; v: readonly number[] }[]>,
    inputs: Record<string, number>,
  ) {
    const accel = channels["accelG"] ?? [];
    if (accel.length < 10) {
      return {
        measured: 0,
        uncertainty: 0.1,
        reference: 0,
        referenceUncertainty: 0,
        unit: "deg",
        quantity: "theta",
      };
    }

    const axis = Math.round(inputs["axis"] ?? 0);
    const g = 9.81;
    const values = accel.map((s) =>
      Math.asin(Math.min(1, Math.max(-1, (s.v[axis] ?? 0) / g))) *
      (180 / Math.PI),
    );
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      measured: mean,
      uncertainty: std / Math.sqrt(values.length),
      reference: 0,
      referenceUncertainty: 0,
      unit: "deg",
      quantity: "theta",
    };
  },
};
