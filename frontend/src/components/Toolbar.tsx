import { useState } from "react";
import { motion } from "framer-motion";
import { COLORMAPS, getLUT, type ColormapName } from "../render/colormaps";

interface Props {
  colormap: ColormapName;
  onColormap: (c: ColormapName) => void;
  onDownload: () => void;
  canDownload: boolean;
  onShare: () => string;
}

function swatch(c: ColormapName): string {
  const lut = getLUT(c);
  const stops: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const v = Math.round((i / 4) * 255) * 3;
    stops.push(`rgb(${lut[v]},${lut[v + 1]},${lut[v + 2]}) ${(i / 4) * 100}%`);
  }
  return `linear-gradient(90deg, ${stops.join(",")})`;
}

export default function Toolbar({
  colormap,
  onColormap,
  onDownload,
  canDownload,
  onShare,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const href = onShare();
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      /* clipboard may be blocked; URL is updated regardless */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[#0b1120]/60 p-1">
        {COLORMAPS.map((c) => (
          <button
            key={c}
            onClick={() => onColormap(c)}
            className="relative rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition"
          >
            {c === colormap && (
              <motion.span
                layoutId="cmap-pill"
                className="absolute inset-0 rounded-lg bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/40"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span
              className="relative z-10 flex items-center gap-1.5"
              style={{ color: c === colormap ? "var(--accent)" : "var(--text-dim)" }}
            >
              <span
                className="h-2.5 w-5 rounded-sm ring-1 ring-white/10"
                style={{ backgroundImage: swatch(c) }}
              />
              {c}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={onDownload}
        disabled={!canDownload}
        className="rounded-xl border border-[var(--border)] bg-[#0b1120]/60 px-3 py-1.5 text-[11px] font-semibold text-[var(--text-dim)] transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)] disabled:opacity-40"
      >
        ↓ PNG
      </button>
      <button
        onClick={share}
        className="rounded-xl border border-[var(--border)] bg-[#0b1120]/60 px-3 py-1.5 text-[11px] font-semibold text-[var(--text-dim)] transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
      >
        {copied ? "✓ Copied" : "⤴ Share"}
      </button>
    </div>
  );
}
