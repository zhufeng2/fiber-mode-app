import type { Overlay } from "../api/types";
import type { ColormapName } from "./colormaps";

/**
 * Draw vector overlays (polarization arrows, cell labels, separators) onto an
 * overlay canvas sized to the DISPLAYED image, so they stay crisp regardless of
 * the field's native resolution. Coordinates are normalized [0,1] (x → right,
 * y → down).
 */
export interface ArrowOpts {
  density: number; // 0 = none; →1 = densest. Snaps to an integer grid stride.
  scale: number; // multiplier on arrow length
}

const MAX_STRIDE = 6;
type Arrow = { x: number; y: number; dx: number; dy: number; gi?: number; gj?: number };

/**
 * Subsample arrows on their original regular grid by an integer stride, so the
 * kept arrows always form a uniform lattice (no clustering) at any density.
 */
function subsampleUniform(items: Arrow[], density: number): Arrow[] {
  if (density >= 1) return items;
  const stride = Math.max(1, Math.round(1 + (1 - density) * (MAX_STRIDE - 1)));
  if (stride <= 1) return items;
  return items.filter(
    (it) => (it.gi ?? 0) % stride === 0 && (it.gj ?? 0) % stride === 0
  );
}

export function drawOverlays(
  canvas: HTMLCanvasElement,
  overlays: Overlay[],
  dispW: number,
  dispH: number,
  colormap: ColormapName,
  arrow: ArrowOpts = { density: 0.6, scale: 1 }
) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(dispW * dpr);
  canvas.height = Math.round(dispH * dpr);
  canvas.style.width = `${dispW}px`;
  canvas.style.height = `${dispH}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, dispW, dispH);
  if (!overlays?.length) return;

  // arrow color contrasts with the colormap (white blends into gray's highlights)
  const arrowColor = colormap === "gray" ? "#19dcff" : "rgba(255,255,255,0.96)";

  for (const ov of overlays) {
    if (ov.kind === "vlines" || ov.kind === "hlines") {
      const horizontal = ov.kind === "hlines";
      ctx.strokeStyle = "rgba(255,255,255,0.32)";
      ctx.lineWidth = 1;
      for (const it of ov.items as { x?: number; y?: number }[]) {
        ctx.beginPath();
        if (horizontal) {
          const y = Math.round((it.y ?? 0) * dispH) + 0.5;
          ctx.moveTo(0, y);
          ctx.lineTo(dispW, y);
        } else {
          const x = Math.round((it.x ?? 0) * dispW) + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, dispH);
        }
        ctx.stroke();
      }
    } else if (ov.kind === "arrows") {
      if (arrow.density <= 0) continue;
      const items = subsampleUniform(ov.items as unknown as Arrow[], arrow.density);
      const L = Math.min(Math.max(dispH * 0.04, 7), 26) * arrow.scale;
      ctx.lineWidth = Math.max(1, L * 0.16);
      ctx.strokeStyle = arrowColor;
      ctx.fillStyle = arrowColor;
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = Math.max(1.5, L * 0.14);
      for (const it of items) {
        const mag = Math.hypot(it.dx, it.dy);
        if (mag < 1e-9) continue;
        const ux = it.dx / mag;
        const uy = it.dy / mag;
        const cx = it.x * dispW;
        const cy = it.y * dispH;
        const x1 = cx - (ux * L) / 2;
        const y1 = cy - (uy * L) / 2;
        const x2 = cx + (ux * L) / 2;
        const y2 = cy + (uy * L) / 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const h = L * 0.42;
        const px = -uy;
        const py = ux;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ux * h + px * h * 0.5, y2 - uy * h + py * h * 0.5);
        ctx.lineTo(x2 - ux * h - px * h * 0.5, y2 - uy * h - py * h * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (ov.kind === "labels") {
      const fs = Math.min(Math.max(dispH * 0.04, 11), 17);
      ctx.font = `600 ${fs}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";
      ctx.lineWidth = Math.max(2, fs * 0.22);
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      for (const it of ov.items as { x: number; y: number; text: string }[]) {
        const x = it.x * dispW;
        const y = it.y * dispH;
        ctx.strokeText(it.text, x, y);
        ctx.fillText(it.text, x, y);
      }
    }
  }
}
