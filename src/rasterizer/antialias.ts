import type { Point } from './bezier.ts'
import { scanlineFill } from './scanline.ts'

const SSAA = 4 // 4x supersampling

// Supersample: render at 4x resolution, then downsample for smooth edges.
export function scanlineFillAA(
  contours: Point[][],
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
  color: [number, number, number, number] = [0, 0, 0, 255],
): void {
  const sw = width * SSAA
  const sh = height * SSAA

  const superContours = contours.map((c) => c.map((p) => ({ x: p.x * SSAA, y: p.y * SSAA })))
  const superPixels = new Uint8ClampedArray(sw * sh * 4)
  scanlineFill(superContours, sw, sh, superPixels, color)

  // Downsample
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let a = 0
      for (let dy = 0; dy < SSAA; dy++) {
        for (let dx = 0; dx < SSAA; dx++) {
          const si = ((y * SSAA + dy) * sw + (x * SSAA + dx)) * 4
          a += superPixels[si + 3]
        }
      }
      const coverage = a / (SSAA * SSAA * 255)
      const di = (y * width + x) * 4
      pixels[di] = color[0]
      pixels[di + 1] = color[1]
      pixels[di + 2] = color[2]
      pixels[di + 3] = Math.round(coverage * color[3])
    }
  }
}
