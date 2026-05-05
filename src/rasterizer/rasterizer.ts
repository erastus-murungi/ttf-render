import type { Glyph } from "../ttf/tables/glyf.ts";
import { scanlineFillAA } from "./antialias.ts";
import type { Point } from "./bezier.ts";
import { flattenContour } from "./bezier.ts";
import { scanlineFill } from "./scanline.ts";

export interface RasterizeOptions {
  fontSize: number;
  unitsPerEm: number;
  antialias: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export function rasterize(glyph: Glyph, opts: RasterizeOptions): Uint8ClampedArray {
  const { fontSize, unitsPerEm, antialias, canvasWidth, canvasHeight } = opts;
  const scale = fontSize / unitsPerEm;

  // Transform glyph coordinates to canvas space (TTF y-axis is flipped)
  const baseline = canvasHeight * 0.75;
  const contours: Point[][] = glyph.contours.map((c) =>
    flattenContour(c.points).map((p) => ({
      x: p.x * scale + 20,
      y: baseline - p.y * scale,
    })),
  );

  const pixels = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
  const fill = antialias ? scanlineFillAA : scanlineFill;
  fill(contours, canvasWidth, canvasHeight, pixels);
  return pixels;
}
