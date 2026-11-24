/**
 * Device capability inspection.
 */

export interface DeviceCapabilities {
  readonly isSecureContext: boolean;
  readonly isMobile: boolean;
  readonly platform: string;
  readonly userAgent: string;
  readonly permissions: {
    readonly motion: "granted" | "denied" | "prompt" | "unsupported";
    readonly orientation: "granted" | "denied" | "prompt" | "unsupported";
  };
  readonly availableChannels: readonly string[];
  readonly reportedIntervalMs?: number;
}

export function queryDeviceCapabilities(): DeviceCapabilities {
  const isSecure = typeof window !== "undefined" ? window.isSecureContext : true;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "Node.js Environment";
  const platform = typeof navigator !== "undefined" ? (navigator.platform ?? "unknown") : "node";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  const channels: string[] = [];
  if (typeof window !== "undefined") {
    if ("DeviceMotionEvent" in window) {
      channels.push("accel", "accelG", "gyro");
    }
    if ("DeviceOrientationEvent" in window) {
      channels.push("orientation");
    }
  } else {
    channels.push("accel", "accelG", "gyro", "orientation");
  }

  return {
    isSecureContext: isSecure,
    isMobile,
    platform,
    userAgent: ua,
    permissions: {
      motion: typeof window !== "undefined" && "DeviceMotionEvent" in window ? "granted" : "unsupported",
      orientation: typeof window !== "undefined" && "DeviceOrientationEvent" in window ? "granted" : "unsupported",
    },
    availableChannels: channels,
    reportedIntervalMs: 16.6,
  };
}
