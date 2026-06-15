import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { ComputeResponse } from "../api/types";
import { decodeField } from "../api/client";
import { paintField } from "../render/canvasRenderer";
import { drawOverlays } from "../render/overlays";
import type { ColormapName } from "../render/colormaps";
import ColorBar from "./ColorBar";

interface Props {
  result: ComputeResponse | null;
  colormap: ColormapName;
  error: string | null;
  busy: boolean;
  arrowDensity: number;
  arrowScale: number;
}

const CB_W = 96; // reserved colorbar width
const GAP = 14;
const PAD = 14;

export default function Viewport({
  result,
  colormap,
  error,
  busy,
  arrowDensity,
  arrowScale,
}: Props) {
  // Canvas is PERSISTENT (never re-keyed/re-mounted) so the paint effect always
  // finds a live element — fixes the "switch tab to fix it" bug.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<Uint8Array | null>(null);
  const controls = useAnimationControls();
  const [avail, setAvail] = useState({ w: 0, h: 0 });

  // measure the available stage box
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setAvail({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const hasColorbar = !!result?.colorbar;

  // contain-fit the image inside the stage (minus colorbar) — independent of the
  // field's native resolution, so mesh size changes detail, not display size.
  const disp = useMemo(() => {
    if (!result || !avail.w || !avail.h) return { w: 0, h: 0 };
    const maxW = Math.max(0, avail.w - PAD * 2 - (hasColorbar ? CB_W + GAP : 0));
    const maxH = Math.max(0, avail.h - PAD * 2);
    const s = Math.min(maxW / result.width, maxH / result.height);
    return { w: Math.floor(result.width * s), h: Math.floor(result.height * s) };
  }, [result, avail, hasColorbar]);

  useEffect(() => {
    fieldRef.current = result ? decodeField(result.field) : null;
  }, [result]);

  // paint field + entrance whenever field or colormap changes
  useEffect(() => {
    if (!result || !canvasRef.current || !fieldRef.current) return;
    paintField(canvasRef.current, fieldRef.current, result.width, result.height, colormap);
    controls.start({
      opacity: [0.5, 1],
      scale: [0.985, 1],
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    });
  }, [result, colormap, controls]);

  // redraw overlays on result / size / colormap / arrow-control changes (live)
  useEffect(() => {
    if (!overlayRef.current) return;
    drawOverlays(overlayRef.current, result?.overlays ?? [], disp.w, disp.h, colormap, {
      density: arrowDensity,
      scale: arrowScale,
    });
  }, [result, disp.w, disp.h, colormap, arrowDensity, arrowScale]);

  return (
    <div
      ref={stageRef}
      className="relative flex h-full min-h-[260px] w-full items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)]"
      style={{
        background:
          "radial-gradient(120% 100% at 50% 0%, #111726 0%, #0a0f1c 55%, #080c15 100%)",
      }}
    >
      {/* faint oscilloscope grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(140,170,220,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(140,170,220,0.045) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 80% 74% at 50% 50%, #000 60%, transparent 100%)",
        }}
      />

      {/* persistent stage content — visibility toggled, never unmounted */}
      <div
        className="relative items-center"
        style={{ display: result && !error ? "flex" : "none", gap: `${GAP}px` }}
      >
        <motion.div
          animate={controls}
          className="relative overflow-hidden rounded-md ring-1 ring-white/12"
          style={{ width: disp.w, height: disp.h, boxShadow: "0 0 50px -18px var(--accent-glow)" }}
        >
          <canvas ref={canvasRef} className="block" style={{ width: disp.w, height: disp.h }} />
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" />
        </motion.div>
        {hasColorbar && <ColorBar colormap={colormap} spec={result!.colorbar} height={disp.h} />}
      </div>

      {/* error / empty states */}
      {error ? (
        <div className="relative max-w-md rounded-xl border border-[var(--err)]/30 bg-[var(--err)]/10 px-4 py-3 text-center text-sm text-[var(--err)]">
          {error}
        </div>
      ) : !result ? (
        <div className="relative flex flex-col items-center gap-3 text-sm text-[var(--text-faint)]">
          <div className="h-10 w-10 animate-pulse rounded-full border border-[var(--border-strong)]" />
          {busy ? "Computing…" : "Set parameters and press Generate"}
        </div>
      ) : null}

      {busy && <div className="scanline" />}
    </div>
  );
}
