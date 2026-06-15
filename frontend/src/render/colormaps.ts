// Client-side colormap LUTs. Each LUT is 256 RGB triplets; switching colormap
// just re-maps the cached uint8 field — no server round-trip (plan.md §5.2).

export type ColormapName = "jet" | "gray";

type Stop = [pos: number, r: number, g: number, b: number]; // 0..1 each

function buildLUT(stops: Stop[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    // find surrounding stops
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = (t - a[0]) / span;
    lut[i * 3 + 0] = (a[1] + (b[1] - a[1]) * f) * 255;
    lut[i * 3 + 1] = (a[2] + (b[2] - a[2]) * f) * 255;
    lut[i * 3 + 2] = (a[3] + (b[3] - a[3]) * f) * 255;
  }
  return lut;
}

const JET: Stop[] = [
  [0.0, 0.0, 0.0, 0.5],
  [0.125, 0.0, 0.0, 1.0],
  [0.375, 0.0, 1.0, 1.0],
  [0.625, 1.0, 1.0, 0.0],
  [0.875, 1.0, 0.0, 0.0],
  [1.0, 0.5, 0.0, 0.0],
];

const GRAY: Stop[] = [
  [0.0, 0.0, 0.0, 0.0],
  [1.0, 1.0, 1.0, 1.0],
];

const LUTS: Record<ColormapName, Uint8ClampedArray> = {
  jet: buildLUT(JET),
  gray: buildLUT(GRAY),
};

export const COLORMAPS: ColormapName[] = ["jet", "gray"];

export function getLUT(name: ColormapName): Uint8ClampedArray {
  return LUTS[name] ?? LUTS.jet;
}
