import QRCode from "qrcode";

/**
 * Standards-compliant QR matrix for `text` (ISO/IEC 18004 via the `qrcode` library):
 * real data encoding, Reed–Solomon error correction, format info and masking.
 * `true` = dark module. Pure and synchronous, so it can be unit-tested.
 */
export function qrMatrix(text: string, errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M"): boolean[][] {
  const { modules } = QRCode.create(text, { errorCorrectionLevel });
  const size = modules.size;
  const rows: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) row.push(Boolean(modules.get(r, c)));
    rows.push(row);
  }
  return rows;
}

export interface QrCodeProps {
  /** The exact text/URL to encode. */
  readonly text: string;
  /** Rendered width/height in CSS pixels. */
  readonly size: number;
  /** Light-module border in modules; scanners need ≥ 4. */
  readonly quietZone?: number;
}

/**
 * Scannable QR code: dark modules on a white background with a quiet zone.
 * (Inverted colours or a missing quiet zone make many phone cameras fail to read it.)
 */
export function QrCode({ text, size, quietZone = 4 }: QrCodeProps) {
  const matrix = qrMatrix(text);
  const n = matrix.length + quietZone * 2;
  let d = "";
  matrix.forEach((row, r) => {
    row.forEach((dark, c) => {
      if (dark) d += `M${c + quietZone} ${r + quietZone}h1v1h-1z`;
    });
  });
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code for ${text}`}
      shapeRendering="crispEdges"
      style={{ display: "block", background: "#ffffff", borderRadius: 8 }}
    >
      <rect width={n} height={n} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}
