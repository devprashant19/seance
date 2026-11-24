# Requirements Spec: U4 Smoked-Drum Recorder

## 1. Overview
The Smoked-Drum Recorder brings a tactile, visual aesthetic to Séance: a scrolling ink-on-smoked-paper seismograph drum. It replaces or complements raw line charts with a downsampled, canvas-rendered stream designed for high frame rate performance (60 fps) across multiple channels.

## 2. Requirements & Invariants

### U4a: Ring Buffer & Data Storage
- **WHEN** incoming streaming samples arrive, **THE SYSTEM SHALL** store them in a fixed-capacity ring buffer without unbounded memory growth.
  - **Property 1 (Ring Buffer Capacity Invariant):** The buffer length never exceeds its configured capacity $C$; when $N > C$ elements are pushed, exactly the most recent $C$ elements are retained in chronological order.

### U4b: Min/Max Envelope Downsampling
- **WHEN** downsampling $N$ samples into $W$ screen pixels, **THE SYSTEM SHALL** compute the min and max values within each pixel time bucket.
  - **Property 2 (Envelope Extremum Preservation):** For every pixel bucket, $\min(samples) \le v \le \max(samples)$ for all $v$ in that bucket. No true local extremum is clipped or missed.
  - **Property 3 (Zoom Scaling Property):** Zooming by a factor of $k$ scales the displayed time duration per pixel by exactly $1/k$.

### U4c: Gap & Dropout Visualization
- **WHEN** consecutive sample timestamps exhibit a gap ($\Delta t > 3 \cdot \text{median}(\Delta t)$), **THE SYSTEM SHALL** render a broken-ink / torn-paper discontinuity rather than interpolating continuous lines across the gap.
  - **Property 4 (Gap Discontinuity Invariant):** For any pair of points where $\Delta t > 3 \cdot \text{median}(\Delta t)$, the envelope downsampler flags a gap segment.

### U4d: Canvas Renderer & Motion Accessibility
- **WHEN** rendering in the browser, **THE SYSTEM SHALL** use an HTML5 `<canvas>` with `requestAnimationFrame`, avoiding React state updates on each incoming sample.
- **WHEN** `prefers-reduced-motion` is detected or specified, **THE SYSTEM SHALL** render static paper showing only the latest snapshot without continuous auto-scrolling motion.
