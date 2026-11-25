/**
 * "What do I actually do?" for every Lab experiment: a setup diagram, numbered steps, and an honest
 * note about which sensor is used and where it can run live.
 */
import type { ReactNode } from "react";

export type LiveSource = "phone" | "camera" | "mic";

export interface ExperimentGuide {
  /** One-line answer to "what is this?" in everyday words. */
  readonly what: string;
  /** What you need on the table. */
  readonly needs: readonly string[];
  readonly steps: readonly string[];
  readonly source: LiveSource;
  readonly Illustration: () => ReactNode;
}

const INK = "#9fb4ff";
const DIM = "#4a5680";
const ACCENT = "#f6c177";

/** A phone drawn as a rounded rectangle centred at (x, y); rotate in degrees. */
function Phone({ x, y, w = 18, h = 32, rotate = 0, chip }: { x: number; y: number; w?: number; h?: number; rotate?: number; chip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={3} fill="#1b2140" stroke={INK} strokeWidth={1.5} />
      <rect x={-w / 2 + 2.5} y={-h / 2 + 4} width={w - 5} height={h - 8} rx={1} fill="#26305a" />
      {chip && <rect x={-w / 2 + 3} y={-h / 2 + 5} width={4} height={4} fill={ACCENT} />}
    </g>
  );
}

function Svg({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 240 130" width="100%" role="img" aria-label={label} style={{ display: "block", maxHeight: 150 }}>
      <defs>
        <marker id="g-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={ACCENT} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

const arrow = { stroke: ACCENT, strokeWidth: 1.6, fill: "none", markerEnd: "url(#g-arrow)" } as const;
const text = { fill: "#8a95bb", fontSize: 9, fontFamily: "system-ui, sans-serif" } as const;

export const GUIDES: Record<string, ExperimentGuide> = {
  "spin-find-chip": {
    what: "Find where the motion sensor chip sits inside your phone, just by spinning it.",
    needs: ["Your phone", "A smooth table (not glass)"],
    steps: [
      "Lay the phone flat, screen up, in the middle of the table.",
      "Press Begin, then give it a gentle spin with your finger so it turns in place like a top.",
      "Let it spin for a few seconds. Spin again if it stops.",
      "The Oracle uses how hard each part is 'flung outwards' to locate the chip.",
    ],
    source: "phone",
    Illustration: () => (
      <Svg label="Phone lying flat on a table, spinning in place">
        <ellipse cx={120} cy={95} rx={95} ry={22} fill="#141a33" stroke={DIM} />
        <Phone x={120} y={78} w={34} h={20} chip />
        <path d="M 78 70 A 45 18 0 0 1 162 70" {...arrow} />
        <path d="M 162 92 A 45 18 0 0 1 78 92" {...arrow} />
        <text x={150} y={40} {...text}>chip = ?</text>
        <line x1={148} y1={42} x2={106} y2={71} stroke={ACCENT} strokeDasharray="2 2" />
      </Svg>
    ),
  },
  "pendulum-g": {
    what: "Measure Earth's gravity (g ≈ 9.8 m/s²) by swinging your phone like a pendulum.",
    needs: ["Your phone", "A string or charging cable about 1 m long", "A tape measure"],
    steps: [
      "Tie the string firmly to the phone (or put the phone in a bag and tie that).",
      "Measure from where you hold the string to the middle of the phone. Enter it as String length.",
      "Hold the string still, pull the phone a little to the side (small angle), and press Begin.",
      "Let go and let it swing freely for the 10-second recording.",
    ],
    source: "phone",
    Illustration: () => (
      <Svg label="Phone hanging on a string, swinging side to side">
        <line x1={70} y1={12} x2={170} y2={12} stroke={DIM} strokeWidth={3} />
        <line x1={120} y1={12} x2={150} y2={92} stroke={INK} strokeWidth={1.3} />
        <line x1={120} y1={12} x2={120} y2={100} stroke={DIM} strokeDasharray="3 3" />
        <Phone x={152} y={100} rotate={-20} />
        <path d="M 95 108 A 60 60 0 0 0 150 118" {...arrow} />
        <text x={126} y={56} {...text}>L</text>
      </Svg>
    ),
  },
  "free-fall": {
    what: "Drop the phone and work out how far it fell from how long it was weightless.",
    needs: ["Your phone", "A pillow or cushion to land on", "A tape measure"],
    steps: [
      "Put a pillow on the floor. Measure a drop height (e.g. 0.5 m) and enter it as Known drop height.",
      "Hold the phone flat at that height above the pillow and press Begin.",
      "Let go cleanly (don't throw). Stay below 2 m.",
      "During the fall the phone feels ~0 g; the Oracle times that gap.",
    ],
    source: "phone",
    Illustration: () => (
      <Svg label="Phone dropping onto a pillow">
        <Phone x={120} y={26} w={30} h={16} />
        <line x1={120} y1={40} x2={120} y2={92} {...arrow} />
        <rect x={80} y={100} width={80} height={18} rx={9} fill="#2a2140" stroke={DIM} />
        <line x1={175} y1={26} x2={175} y2={100} stroke={DIM} />
        <text x={180} y={66} {...text}>h</text>
        <text x={22} y={66} {...text}>~0 g while falling</text>
      </Svg>
    ),
  },
  "singing-ruler": {
    what: "Twang a ruler over a table edge; its pitch tells you how stiff the material is.",
    needs: ["A metal or plastic ruler", "A table edge", "A microphone"],
    steps: [
      "Hold the ruler flat on the table with part of it sticking out. Measure that overhang.",
      "Enter thickness, overhang length and material density.",
      "Twang the free end and let it ring near the microphone.",
      "The pitch of the hum gives Young's modulus (stiffness).",
    ],
    source: "mic",
    Illustration: () => (
      <Svg label="Ruler clamped to a table edge, free end vibrating">
        <rect x={20} y={70} width={110} height={40} fill="#141a33" stroke={DIM} />
        <rect x={40} y={64} width={170} height={6} fill="#3a4470" stroke={INK} />
        <rect x={60} y={50} width={30} height={14} fill={DIM} />
        <path d="M 130 67 Q 175 50 210 58" fill="none" stroke={INK} strokeDasharray="3 2" />
        <path d="M 130 67 Q 175 84 210 78" fill="none" stroke={INK} strokeDasharray="3 2" />
        <text x={180} y={40} {...text}>♪ twang</text>
        <text x={150} y={110} {...text}>overhang</text>
      </Svg>
    ),
  },
  "coupled-pendulums": {
    what: "Two pendulums tied by a slack cord pass their swing back and forth, like a tide.",
    needs: ["One or two phones (the recording phone is one bob)", "Two equal strings", "A loose cord linking them"],
    steps: [
      "Hang two equal pendulums side by side; join their strings with a slack cord.",
      "Use the joined phone as one bob. Enter the string length.",
      "Press Begin, then start only one pendulum swinging.",
      "Watch the swing fade from one to the other and back; the phone's gyro records the beats.",
    ],
    source: "phone",
    Illustration: () => (
      <Svg label="Two pendulums joined by a slack cord">
        <line x1={40} y1={12} x2={200} y2={12} stroke={DIM} strokeWidth={3} />
        <line x1={90} y1={12} x2={82} y2={92} stroke={INK} />
        <line x1={150} y1={12} x2={150} y2={92} stroke={INK} />
        <path d="M 86 50 Q 118 62 150 50" fill="none" stroke={ACCENT} strokeDasharray="3 2" />
        <Phone x={82} y={102} rotate={6} />
        <circle cx={150} cy={102} r={9} fill="#1b2140" stroke={INK} />
        <text x={100} y={74} {...text}>slack cord</text>
      </Svg>
    ),
  },
  "board-modes": {
    what: "Tap a plank and find the notes (resonant frequencies) it rings at.",
    needs: ["A wooden plank or shelf", "Two supports (books, bricks)", "Your phone (more phones = mode shapes)"],
    steps: [
      "Rest the plank on two supports. Measure plank length and support span.",
      "Lay the phone flat on the plank, screen up.",
      "Press Begin and tap the plank firmly a few times with a knuckle.",
      "The phone's accelerometer picks up the ringing; the Oracle finds its frequencies.",
    ],
    source: "phone",
    Illustration: () => (
      <Svg label="Phone lying on a plank resting on two supports">
        <rect x={20} y={70} width={200} height={8} fill="#3a2f22" stroke="#7a6040" />
        <rect x={45} y={78} width={18} height={30} fill={DIM} />
        <rect x={177} y={78} width={18} height={30} fill={DIM} />
        <Phone x={120} y={62} w={30} h={12} />
        <path d="M 160 30 L 160 60" {...arrow} />
        <text x={165} y={36} {...text}>tap</text>
        <path d="M 30 90 Q 120 115 210 90" fill="none" stroke={ACCENT} strokeDasharray="2 3" />
      </Svg>
    ),
  },
  "gate-period": {
    what: "Time a swinging pendulum with the laptop camera, without touching it.",
    needs: ["Laptop webcam", "Any pendulum (keys on a string)", "A tape measure"],
    steps: [
      "Open the Apparition Gate page (camera photogate) from the home page.",
      "Hang the pendulum so it swings through the camera's view.",
      "Draw the gate box where the bob crosses.",
      "Each crossing is timed; the period gives g.",
    ],
    source: "camera",
    Illustration: () => (
      <Svg label="Pendulum swinging in front of a laptop camera">
        <rect x={150} y={60} width={70} height={45} rx={3} fill="#1b2140" stroke={INK} />
        <circle cx={185} cy={66} r={2.5} fill={ACCENT} />
        <line x1={60} y1={10} x2={60} y2={80} stroke={INK} />
        <circle cx={60} cy={86} r={7} fill="#2a3060" stroke={INK} />
        <path d="M 30 96 A 40 40 0 0 0 90 96" {...arrow} />
        <rect x={50} y={74} width={20} height={24} fill="none" stroke={ACCENT} strokeDasharray="3 2" />
        <line x1={183} y1={66} x2={72} y2={86} stroke={DIM} strokeDasharray="2 3" />
      </Svg>
    ),
  },
  "gate-speed": {
    what: "Measure how fast something moves past the camera between two marked zones.",
    needs: ["Laptop webcam", "A toy car or rolling ball", "A ruler for the gap between zones"],
    steps: [
      "Open the Apparition Gate page from the home page.",
      "Draw two gate boxes along the object's path; measure the distance between them.",
      "Roll the object through both gates.",
      "Speed = gap ÷ time between the two crossings.",
    ],
    source: "camera",
    Illustration: () => (
      <Svg label="Object rolling through two camera gates">
        <line x1={15} y1={95} x2={225} y2={95} stroke={DIM} />
        <rect x={70} y={60} width={22} height={34} fill="none" stroke={ACCENT} strokeDasharray="3 2" />
        <rect x={150} y={60} width={22} height={34} fill="none" stroke={ACCENT} strokeDasharray="3 2" />
        <circle cx={40} cy={86} r={8} fill="#2a3060" stroke={INK} />
        <path d="M 52 80 L 120 80" {...arrow} />
        <line x1={81} y1={110} x2={161} y2={110} stroke={INK} />
        <text x={112} y={122} {...text}>d</text>
      </Svg>
    ),
  },
  "gate-rpm": {
    what: "Measure how fast a fan spins with the camera, and see the 'wagon-wheel' illusion.",
    needs: ["Laptop webcam", "A fan or spinning wheel (keep fingers clear)"],
    steps: [
      "Open the Apparition Gate page from the home page.",
      "Point the camera at the spinning blades; draw a gate over the blade path.",
      "Enter the number of blades.",
      "Blade crossings per second give the RPM; the Oracle warns when the camera is too slow (aliasing).",
    ],
    source: "camera",
    Illustration: () => (
      <Svg label="Fan blades spinning in front of a camera">
        <circle cx={90} cy={65} r={42} fill="none" stroke={DIM} />
        {[0, 120, 240].map((a) => (
          <ellipse key={a} cx={90} cy={42} rx={9} ry={22} fill="#26305a" stroke={INK} transform={`rotate(${a} 90 65)`} />
        ))}
        <circle cx={90} cy={65} r={5} fill={INK} />
        <path d="M 140 40 A 55 55 0 0 1 140 90" {...arrow} />
        <rect x={170} y={50} width={50} height={32} rx={3} fill="#1b2140" stroke={INK} />
        <circle cx={195} cy={56} r={2.5} fill={ACCENT} />
      </Svg>
    ),
  },
};

export const SOURCE_NOTE: Record<LiveSource, { badge: string; detail: string }> = {
  phone: { badge: "📱 Phone sensors", detail: "Runs live with the phone you connected on the home page." },
  camera: { badge: "📷 Laptop camera", detail: "Runs live on the Apparition Gate page (home page → Apparition Gate)." },
  mic: { badge: "🎤 Microphone", detail: "Live microphone capture isn't connected to this runner yet, so this one can't record live." },
};
