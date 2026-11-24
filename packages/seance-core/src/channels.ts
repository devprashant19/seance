import type { Unit } from "./units.js";

export type ChannelId =
  | "accel"
  | "accelG"
  | "gyro"
  | "orientation"
  | "audio.level"
  | "audio.spectrum"
  | "control.touch"
  | "camera.blob"
  | "camera.gate"
  | "camera.rows"
  | `serial.${string}`
  | `midi.${string}`
  | `ble.${string}`;

export interface ChannelDef {
  readonly unit: Unit;
  readonly axes: readonly string[];
}

export const CHANNELS: Record<string, ChannelDef> = {
  accel: { unit: "m/s^2", axes: ["x", "y", "z"] },
  accelG: { unit: "m/s^2", axes: ["x", "y", "z"] },
  gyro: { unit: "rad/s", axes: ["x", "y", "z"] },
  orientation: { unit: "rad", axes: ["alpha", "beta", "gamma"] },
  "audio.level": { unit: "dBFS", axes: ["rms"] },
  "audio.spectrum": { unit: "dBFS", axes: [] },
  "control.touch": { unit: "1", axes: ["x", "y", "down"] },
  "camera.blob": { unit: "px", axes: ["x", "y", "area"] },
  "camera.gate": { unit: "1", axes: ["roi1", "roi2"] },
  "camera.rows": { unit: "1", axes: [] },
};

export function isKnownChannel(id: string): id is ChannelId {
  return (
    id in CHANNELS ||
    id.startsWith("serial.") ||
    id.startsWith("midi.") ||
    id.startsWith("ble.")
  );
}
