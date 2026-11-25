/**
 * SVG / Scroll trace export for Smoked Drum records.
 */

import type { GhostTrace } from "seance-core";

export function exportTraceToSvg(
  trace: GhostTrace,
  width = 800,
  height = 400,
): string {
  const primaryChannel = trace.channels[0];
  if (!primaryChannel || primaryChannel.t.length < 2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#100e0c" />
      <text x="50%" y="50%" fill="#b0a6cc" text-anchor="middle" font-family="monospace">Empty Smoked Drum</text>
    </svg>`;
  }

  const t = primaryChannel.t;
  const v = primaryChannel.data[0]!;
  const n = Math.min(t.length, v.length);

  const tMin = t[0]!;
  const tMax = t[n - 1]!;
  const dt = tMax - tMin || 1;

  let vMin = Infinity;
  let vMax = -Infinity;
  for (let i = 0; i < n; i++) {
    if (v[i]! < vMin) vMin = v[i]!;
    if (v[i]! > vMax) vMax = v[i]!;
  }
  const dv = vMax - vMin || 1;

  const points: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = ((t[i]! - tMin) / dt) * (width - 40) + 20;
    const y = height - 20 - ((v[i]! - vMin) / dv) * (height - 40);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#120f0d" />
    <pattern id="smokedGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#25201b" stroke-width="0.5"/>
    </pattern>
    <rect width="100%" height="100%" fill="url(#smokedGrid)" />
    <polyline fill="none" stroke="#00ff99" stroke-width="1.5" stroke-linecap="round" points="${points.join(" ")}" />
    <text x="20" y="25" fill="#b4a9d6" font-family="monospace" font-size="12">${trace.id} · ${primaryChannel.id} (${primaryChannel.unit})</text>
    <text x="${width - 20}" y="25" fill="#b4a9d6" text-anchor="end" font-family="monospace" font-size="12">${((tMax - tMin) / 1000).toFixed(2)} s</text>
  </svg>`;
}
