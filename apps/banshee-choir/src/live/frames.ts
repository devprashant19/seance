import type { decodeBatch } from "seance-core/transports/phone-bridge";
import type { SensorFrame } from "../instrument/index.js";

export type DecodedBatch = ReturnType<typeof decodeBatch>;

function last(ch: { t: Float64Array; values: Float32Array[] } | undefined): number[] | undefined {
  if (!ch || ch.t.length === 0) return undefined;
  const i = ch.t.length - 1;
  return ch.values.map((axis) => axis[i]!);
}

/**
 * Latest phone state in a batch → the Banshee voice's SensorFrame.
 * - orientation (rad): beta drives pitch, gamma drives the filter
 * - accel (gravity removed, m/s²): shake drives tremolo (and the gate in drone mode)
 * - control.touch [x, y, down]: the touch pad opens/closes the voice
 */
export function sensorFrameFromBatch(batch: DecodedBatch): SensorFrame | null {
  const frame: { orientation?: SensorFrame["orientation"]; accel?: SensorFrame["accel"]; touch?: SensorFrame["touch"] } = {};
  const o = last(batch.channels["orientation"]);
  if (o) frame.orientation = { beta: o[1] ?? 0, gamma: o[2] ?? 0 };
  const a = last(batch.channels["accel"]);
  if (a) frame.accel = { x: a[0] ?? 0, y: a[1] ?? 0, z: a[2] ?? 0 };
  const touch = last(batch.channels["control.touch"]);
  if (touch) frame.touch = { down: (touch[2] ?? 0) >= 0.5 };
  return frame.orientation || frame.accel || frame.touch ? (frame as SensorFrame) : null;
}
