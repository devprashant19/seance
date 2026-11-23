import { useRef, useEffect } from "react";

interface LiveChartProps {
  readonly data: readonly { t: number; v: number }[];
  readonly label: string;
  readonly unit: string;
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly maxPoints?: number;
}

export function LiveChart({
  data,
  label,
  unit,
  width = 400,
  height = 160,
  color = "#6688ff",
  maxPoints = 200,
}: LiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const visible = data.length > maxPoints ? data.slice(-maxPoints) : data;
    if (visible.length < 2) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#555";
      ctx.font = "12px system-ui";
      ctx.fillText("Waiting for data...", 10, height / 2);
      return;
    }

    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of visible) {
      if (p.v < minV) minV = p.v;
      if (p.v > maxV) maxV = p.v;
    }
    const range = maxV - minV || 1;
    const pad = range * 0.1;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 0.5;
    const zeroY = height - ((0 - (minV - pad)) / (range + 2 * pad)) * height;
    if (zeroY > 0 && zeroY < height) {
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(width, zeroY);
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < visible.length; i++) {
      const x = (i / (visible.length - 1)) * width;
      const y = height - ((visible[i]!.v - (minV - pad)) / (range + 2 * pad)) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "#889";
    ctx.font = "11px system-ui";
    ctx.fillText(`${label} (${unit})`, 4, 14);
    ctx.fillText(`${visible[visible.length - 1]!.v.toFixed(2)}`, width - 50, 14);
  }, [data, width, height, color, maxPoints, label, unit]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width, height, background: "#0d0d1f", borderRadius: 6, border: "1px solid #223",
      }}
    />
  );
}
