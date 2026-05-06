import type { Point } from "./bezier.ts";

// Scanline fill using the non-zero winding rule.
// Returns a set of pixels (x, y) that are inside the polygon.
export function scanlineFill(
  contours: Point[][],
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
  color: [number, number, number, number] = [0, 0, 0, 255],
): void {
  for (let y = 0; y < height; y++) {
    const intersections: number[] = [];

    for (const contour of contours) {
      const n = contour.length;
      for (let i = 0; i < n; i++) {
        const a = contour[i];
        const b = contour[(i + 1) % n];
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
          const t = (y - a.y) / (b.y - a.y);
          intersections.push(a.x + t * (b.x - a.x));
        }
      }
    }

    intersections.sort((a, b) => a - b);

    for (let i = 0; i < intersections.length - 1; i += 2) {
      const x0 = Math.ceil(intersections[i]);
      const x1 = Math.floor(intersections[i + 1]);
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= width) {
          continue;
        }
        const idx = (y * width + x) * 4;
        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = color[3];
      }
    }
  }
}
