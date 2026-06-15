import type { ColorbarSpec } from "../api/types";
import { getLUT, type ColormapName } from "../render/colormaps";

interface Props {
  colormap: ColormapName;
  spec: ColorbarSpec | null;
  /** exact pixel height of the image, so the bar matches it (Nature style). */
  height?: number;
}

function verticalGradient(c: ColormapName): string {
  const lut = getLUT(c);
  const stops: string[] = [];
  for (let i = 0; i <= 16; i++) {
    const v = Math.round((i / 16) * 255) * 3;
    // top (0%) = field max, bottom (100%) = field min → use "to top"
    stops.push(`rgb(${lut[v]},${lut[v + 1]},${lut[v + 2]}) ${(i / 16) * 100}%`);
  }
  return `linear-gradient(to top, ${stops.join(",")})`;
}

const DEFAULT_TICKS = [
  { pos: 1, label: "max" },
  { pos: 0.5, label: "" },
  { pos: 0, label: "min" },
];

/** Sci-style vertical colorbar: gradient bar + tick marks + rotated axis label. */
export default function ColorBar({ colormap, spec, height }: Props) {
  const ticks = spec?.ticks ?? DEFAULT_TICKS;
  return (
    <div
      className="flex items-stretch gap-1.5"
      style={{ height: height ? `${height}px` : "100%" }}
    >
      {/* the bar */}
      <div className="relative w-3.5 overflow-hidden rounded-sm ring-1 ring-white/20">
        <div className="h-full w-full" style={{ backgroundImage: verticalGradient(colormap) }} />
        {/* tick marks on the bar */}
        {ticks.map((t, i) => (
          <span
            key={i}
            className="absolute right-0 h-px w-2 bg-white/70 mix-blend-overlay"
            style={{ bottom: `${t.pos * 100}%` }}
          />
        ))}
      </div>

      {/* tick labels */}
      <div className="relative w-8">
        {ticks.map((t, i) => (
          <span
            key={i}
            className="mono absolute left-0 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium leading-none text-[var(--text-dim)]"
            style={{ bottom: `${t.pos * 100}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* rotated axis label */}
      {spec?.label && (
        <div className="flex items-center">
          <span
            className="mono whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-[var(--text-faint)]"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {spec.label}
          </span>
        </div>
      )}
    </div>
  );
}
