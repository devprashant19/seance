import { describe, expect, it } from "vitest";
import fc from "fast-check";
import QRCode from "qrcode";
import { qrMatrix } from "../src/components/QrCode.js";

/** A 7×7 finder pattern: dark outer ring, light ring, dark 3×3 centre. */
function hasFinderAt(m: boolean[][], top: number, left: number): boolean {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
      const expectDark = ring === 3 || ring <= 1;
      if (m[top + r]![left + c] !== expectDark) return false;
    }
  }
  return true;
}

describe("qrMatrix", () => {
  const url = "https://10.10.46.178:5173/join.html?code=JFDE";

  it("produces a standard QR: valid version size and dark-centred finder patterns", () => {
    const m = qrMatrix(url);
    const n = m.length;
    expect((n - 21) % 4).toBe(0); // sizes are 21, 25, 29, … (version 1–40)
    expect(n).toBeGreaterThan(21); // a URL this long cannot fit version 1
    expect(hasFinderAt(m, 0, 0)).toBe(true);
    expect(hasFinderAt(m, 0, n - 7)).toBe(true);
    expect(hasFinderAt(m, n - 7, 0)).toBe(true);
  });

  it("matches the reference encoder module-for-module", () => {
    const m = qrMatrix(url);
    const ref = QRCode.create(url, { errorCorrectionLevel: "M" }).modules;
    for (let r = 0; r < ref.size; r++) {
      for (let c = 0; c < ref.size; c++) expect(m[r]![c]).toBe(Boolean(ref.get(r, c)));
    }
  });

  it("property: any join URL yields a square matrix with all three finder patterns", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Z2-9]{4}$/), fc.ipV4(), (code, ip) => {
        const m = qrMatrix(`https://${ip}:5173/join.html?code=${code}`);
        const n = m.length;
        return m.every((row) => row.length === n) && hasFinderAt(m, 0, 0) && hasFinderAt(m, 0, n - 7) && hasFinderAt(m, n - 7, 0);
      }),
      { numRuns: 50 },
    );
  });
});
