import { rasterize } from "./rasterizer/rasterizer.ts";
import { state } from "./state.ts";
import type { Font } from "./ttf/parser.ts";

export function render(canvas: HTMLCanvasElement, font: Font): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(20, 140);
  ctx.lineTo(100, 300);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 10;
  ctx.stroke();

  const glyphId = state.glyphIndex;
  const glyph = font.getGlyph(glyphId);
  if (!glyph) {
    ctx.fillStyle = "#888";
    ctx.font = "14px monospace";
    ctx.fillText(`Glyph ${glyphId} is empty or composite`, 20, 30);
    return;
  }

  const pixels = rasterize(glyph, {
    fontSize: state.fontSize,
    unitsPerEm: font.head.unitsPerEm,
    antialias: state.antialias,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  });

  const imageData = ctx.createImageData(canvas.width, canvas.height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
}
