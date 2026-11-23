export type SpiritTroubleCode =
  | "insecure-context"
  | "motion-denied"
  | "motion-gesture-required"
  | "motion-silent"
  | "in-app-browser"
  | "no-sensors"
  | "room-not-found"
  | "room-full"
  | "relay-unreachable-phone"
  | "phone-hidden"
  | "wakelock-unavailable"
  | "network-switch"
  | "duplicate-join"
  | "mic-denied"
  | "mic-missing"
  | "audio-suspended"
  | "ios-silent-switch"
  | "vibration-unsupported"
  | "low-rate"
  | "high-jitter"
  | "relay-unreachable-host"
  | "relay-dropped"
  | "clock-sync-poor"
  | "webgl-unavailable"
  | "replay-load-failed"
  | "analysis-insufficient"
  | "not-still"
  | "mic-clipping"
  | "camera-denied"
  | "camera-lost-target"
  | "serial-unsupported"
  | "serial-cancelled"
  | "serial-garbled"
  | "bluetooth-unsupported"
  | "midi-unsupported"
  | "midi-denied";

export interface TroubleInfo {
  readonly code: SpiritTroubleCode;
  readonly spooky: string;
  readonly plain: string;
  readonly actionLabel: string;
  readonly secondaryActionLabel?: string;
  readonly replayFallback?: boolean;
}

export const TROUBLE_CATALOG: Record<SpiritTroubleCode, TroubleInfo> = {
  "insecure-context": {
    code: "insecure-context",
    spooky: "The circle is broken — this ritual needs a sealed room.",
    plain: "Motion sensors only work on secure (HTTPS) pages. Open the HTTPS link instead.",
    actionLabel: "Open secure link",
  },
  "motion-denied": {
    code: "motion-denied",
    spooky: "The spirit refused to enter.",
    plain: "Motion access was declined. Reload and tap Allow. If your phone doesn't ask again, close this tab, reopen the link, and tap Allow.",
    actionLabel: "Try again",
    secondaryActionLabel: "Watch a recorded haunting",
    replayFallback: true,
  },
  "motion-gesture-required": {
    code: "motion-gesture-required",
    spooky: "The ritual needs your touch.",
    plain: "Tap the button to grant motion access.",
    actionLabel: "Begin the séance",
  },
  "motion-silent": {
    code: "motion-silent",
    spooky: "This vessel is empty — no spirit stirs.",
    plain: "Your browser isn't sending motion data. Try Chrome (Android) or Safari (iPhone), and check that motion sensors aren't blocked in site settings.",
    actionLabel: "Retry",
    secondaryActionLabel: "Watch a recorded haunting",
    replayFallback: true,
  },
  "in-app-browser": {
    code: "in-app-browser",
    spooky: "The spirit is trapped behind glass.",
    plain: "Some apps open links in a limited browser. Open this page in Safari or Chrome.",
    actionLabel: "Copy link",
  },
  "no-sensors": {
    code: "no-sensors",
    spooky: "Laptops have no spirit to summon.",
    plain: "This page is for your phone. Scan the QR code on the big screen with your phone.",
    actionLabel: "Show QR help",
    secondaryActionLabel: "Watch a recorded haunting",
    replayFallback: true,
  },
  "room-not-found": {
    code: "room-not-found",
    spooky: "This séance has ended.",
    plain: "That room code isn't active any more. Ask for the new QR code on the big screen.",
    actionLabel: "Enter a code",
    secondaryActionLabel: "Watch a recorded haunting",
    replayFallback: true,
  },
  "room-full": {
    code: "room-full",
    spooky: "The circle is crowded.",
    plain: "This room is full. Ask the host to open a new one.",
    actionLabel: "Back",
  },
  "relay-unreachable-phone": {
    code: "relay-unreachable-phone",
    spooky: "The veil is too thick tonight.",
    plain: "Can't reach the Séance server. Check your internet. Mobile data often works when venue Wi-Fi doesn't.",
    actionLabel: "Retry",
    secondaryActionLabel: "Watch a recorded haunting",
    replayFallback: true,
  },
  "phone-hidden": {
    code: "phone-hidden",
    spooky: "The spirit is fading…",
    plain: "The phone stopped sending, probably locked or switched apps. Unlock it and return to this tab.",
    actionLabel: "Resume",
  },
  "wakelock-unavailable": {
    code: "wakelock-unavailable",
    spooky: "Keep your eyes open, or the spirit sleeps.",
    plain: "Your phone may lock its screen during the experiment. Turn off auto-lock for now or tap the screen now and then.",
    actionLabel: "Got it",
  },
  "network-switch": {
    code: "network-switch",
    spooky: "The spirit is crossing over…",
    plain: "Reconnecting. Your session will continue.",
    actionLabel: "Reconnecting…",
  },
  "duplicate-join": {
    code: "duplicate-join",
    spooky: "A spirit cannot haunt two places.",
    plain: "This phone is already connected in another tab. Close the other tab.",
    actionLabel: "Use this tab",
  },
  "mic-denied": {
    code: "mic-denied",
    spooky: "The Banshee has been silenced.",
    plain: "Microphone access was declined. Allow it in site settings and reload, or use recorded hauntings.",
    actionLabel: "Try again",
    secondaryActionLabel: "Watch a recorded haunting",
    replayFallback: true,
  },
  "mic-missing": {
    code: "mic-missing",
    spooky: "The Banshee has no voice.",
    plain: "No usable microphone was found (or another app is using it). Close calls or recorders and retry.",
    actionLabel: "Retry",
  },
  "audio-suspended": {
    code: "audio-suspended",
    spooky: "The choir waits for your signal.",
    plain: "Tap once to let the browser play sound.",
    actionLabel: "Tap to sing",
  },
  "ios-silent-switch": {
    code: "ios-silent-switch",
    spooky: "The Banshee whispers too softly.",
    plain: "No sound? Check the silent switch on your iPhone and raise the volume.",
    actionLabel: "Dismiss",
  },
  "vibration-unsupported": {
    code: "vibration-unsupported",
    spooky: "Your phone cannot feel the beat.",
    plain: "Haptic metronome isn't available on this phone. Follow the glowing pulse instead.",
    actionLabel: "Dismiss",
  },
  "low-rate": {
    code: "low-rate",
    spooky: "The spirit stirs sluggishly.",
    plain: "Readings are slow, maybe battery saver mode. Results will be marked with lower confidence.",
    actionLabel: "Learn more",
  },
  "high-jitter": {
    code: "high-jitter",
    spooky: "The spirit is restless.",
    plain: "Readings are arriving unevenly. Keep this tab open and the screen on.",
    actionLabel: "Got it",
  },
  "relay-unreachable-host": {
    code: "relay-unreachable-host",
    spooky: "The candles won't light.",
    plain: "Can't reach the Séance server right now. You can still try every experiment with recorded hauntings.",
    actionLabel: "Retry",
    secondaryActionLabel: "Watch a recorded haunting",
    replayFallback: true,
  },
  "relay-dropped": {
    code: "relay-dropped",
    spooky: "The veil is closing…",
    plain: "Lost connection to the server. Reconnecting; your phone will rejoin automatically.",
    actionLabel: "Retry",
  },
  "clock-sync-poor": {
    code: "clock-sync-poor",
    spooky: "Time itself is twisted.",
    plain: "Timing between devices is uncertain; multi-phone results may be less accurate.",
    actionLabel: "Continue anyway",
  },
  "webgl-unavailable": {
    code: "webgl-unavailable",
    spooky: "The apparition cannot take form.",
    plain: "3D graphics aren't available. Showing the simple 2D spirit instead.",
    actionLabel: "Continue with 2D",
  },
  "replay-load-failed": {
    code: "replay-load-failed",
    spooky: "This haunting has faded from memory.",
    plain: "The recording couldn't be loaded. Try another one.",
    actionLabel: "Pick another",
  },
  "analysis-insufficient": {
    code: "analysis-insufficient",
    spooky: "The spirit wouldn't perform.",
    plain: "Not enough data for a result. Let it oscillate longer and try again.",
    actionLabel: "Try again",
    secondaryActionLabel: "See raw data",
  },
  "not-still": {
    code: "not-still",
    spooky: "The spirit won't settle.",
    plain: "Place the phone on a flat, still surface and don't touch it for 2 seconds.",
    actionLabel: "Retry",
    secondaryActionLabel: "Skip calibration",
  },
  "mic-clipping": {
    code: "mic-clipping",
    spooky: "The Banshee screams!",
    plain: "The sound was too loud and got distorted. Pluck more gently or move the mic further away.",
    actionLabel: "Retry",
  },
  "camera-denied": {
    code: "camera-denied",
    spooky: "The Watcher has been blindfolded.",
    plain: "Camera access was declined. Allow it in site settings, or use your phone or a recorded haunting.",
    actionLabel: "Try again",
    secondaryActionLabel: "Watch a recorded haunting",
    replayFallback: true,
  },
  "camera-lost-target": {
    code: "camera-lost-target",
    spooky: "The Watcher has lost sight of it.",
    plain: "Can't see the coloured object. Improve lighting or click it again to re-pick its colour.",
    actionLabel: "Re-pick colour",
  },
  "serial-unsupported": {
    code: "serial-unsupported",
    spooky: "The Golem only wakes in certain lands.",
    plain: "Arduino connection needs Chrome or Edge on a computer. Everything else works here.",
    actionLabel: "Learn more",
  },
  "serial-cancelled": {
    code: "serial-cancelled",
    spooky: "The Golem remains asleep.",
    plain: "No device was chosen. Plug in the board and try again.",
    actionLabel: "Choose device",
  },
  "serial-garbled": {
    code: "serial-garbled",
    spooky: "The Golem's runes are cracking.",
    plain: "Data from the board is garbled. Check the cable and that the board runs the Séance firmware at 115200 baud.",
    actionLabel: "Reconnect",
  },
  "bluetooth-unsupported": {
    code: "bluetooth-unsupported",
    spooky: "The wisp cannot cross this border.",
    plain: "Bluetooth devices need Chrome or Edge (or Chrome on Android).",
    actionLabel: "Learn more",
  },
  "midi-unsupported": {
    code: "midi-unsupported",
    spooky: "The organ is silent here.",
    plain: "MIDI needs Chrome or Edge. The choir still sings without it.",
    actionLabel: "Dismiss",
  },
  "midi-denied": {
    code: "midi-denied",
    spooky: "The Organist refused the summons.",
    plain: "MIDI access was declined. Allow it in site settings to use a keyboard or DAW.",
    actionLabel: "Try again",
  },
};

