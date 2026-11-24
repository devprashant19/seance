export {
  deviceOrientationToQuaternion,
  captureReference,
  headingNormaliser,
  computeGhostRotation,
  smoothStep,
} from "./orientation/math.js";

export { moodVisuals, type MoodVisualConfig } from "./mood/visuals.js";
export { MOOD_COPY, type MoodCopy } from "./mood/copy.js";

export { Poltergeist3D, type Poltergeist3DConfig } from "./avatars/Poltergeist3D.js";
export { PoltergeistFlat, type PoltergeistFlatProps } from "./avatars/PoltergeistFlat.js";
export { SpiritPlaceholder, RevenantWrapper } from "./avatars/SpiritPlaceholders.js";
export type { SpiritPlaceholderProps, RevenantWrapperProps } from "./avatars/SpiritPlaceholders.js";
export { MoodBadge, MoodTooltip } from "./components/MoodBadge.js";
export type { MoodBadgeProps, MoodTooltipProps } from "./components/MoodBadge.js";

export { SpiritTrouble, type SpiritTroubleProps } from "./components/SpiritTrouble.js";
export { TROUBLE_CATALOG, type SpiritTroubleCode, type TroubleInfo } from "./components/trouble.js";

export * from "./drum/index.js";

