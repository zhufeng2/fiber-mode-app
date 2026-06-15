import { getLUT, type ColormapName } from "./colormaps";

/** Colorize a uint8 scalar field into ImageData using a colormap LUT. */
export function fieldToImageData(
  field: Uint8Array,
  width: number,
  height: number,
  colormap: ColormapName
): ImageData {
  const lut = getLUT(colormap);
  const img = new ImageData(width, height);
  const data = img.data;
  for (let i = 0; i < field.length; i++) {
    const v = field[i] * 3;
    const j = i * 4;
    data[j + 0] = lut[v];
    data[j + 1] = lut[v + 1];
    data[j + 2] = lut[v + 2];
    data[j + 3] = 255;
  }
  return img;
}

/** Paint a field onto a canvas, fitting it crisply to the canvas size. */
export function paintField(
  canvas: HTMLCanvasElement,
  field: Uint8Array,
  width: number,
  height: number,
  colormap: ColormapName
) {
  // Render at native field resolution on an offscreen canvas, then blit
  // scaled into the visible canvas.
  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const octx = off.getContext("2d")!;
  octx.putImageData(fieldToImageData(field, width, height, colormap), 0, 0);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0);
}
