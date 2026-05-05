export interface GlyphPoint {
  x: number;
  y: number;
  onCurve: boolean;
}

export interface GlyphContour {
  points: GlyphPoint[];
}

export interface Glyph {
  contours: GlyphContour[];
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export function parseGlyf(view: DataView, offset: number): Glyph | null {
  const numberOfContours = view.getInt16(offset, false);
  const xMin = view.getInt16(offset + 2, false);
  const yMin = view.getInt16(offset + 4, false);
  const xMax = view.getInt16(offset + 6, false);
  const yMax = view.getInt16(offset + 8, false);

  if (numberOfContours < 0) {
    // Composite glyph — not yet supported
    return null;
  }

  const endPtsOfContours: number[] = [];
  for (let i = 0; i < numberOfContours; i++) {
    endPtsOfContours.push(view.getUint16(offset + 10 + i * 2, false));
  }

  const numPoints = endPtsOfContours[endPtsOfContours.length - 1] + 1;
  const instructionLength = view.getUint16(offset + 10 + numberOfContours * 2, false);
  let pos = offset + 10 + numberOfContours * 2 + 2 + instructionLength;

  // Parse flags
  const flags: number[] = [];
  while (flags.length < numPoints) {
    const flag = view.getUint8(pos++);
    flags.push(flag);
    if (flag & 0x08) {
      // repeat flag
      const repeatCount = view.getUint8(pos++);
      for (let r = 0; r < repeatCount; r++) flags.push(flag);
    }
  }

  // Parse x coordinates
  const xs: number[] = new Array(numPoints).fill(0);
  let x = 0;
  for (let i = 0; i < numPoints; i++) {
    const flag = flags[i];
    if (flag & 0x02) {
      const dx = view.getUint8(pos++);
      x += flag & 0x10 ? dx : -dx;
    } else if (!(flag & 0x10)) {
      x += view.getInt16(pos, false);
      pos += 2;
    }
    xs[i] = x;
  }

  // Parse y coordinates
  const ys: number[] = new Array(numPoints).fill(0);
  let y = 0;
  for (let i = 0; i < numPoints; i++) {
    const flag = flags[i];
    if (flag & 0x04) {
      const dy = view.getUint8(pos++);
      y += flag & 0x20 ? dy : -dy;
    } else if (!(flag & 0x20)) {
      y += view.getInt16(pos, false);
      pos += 2;
    }
    ys[i] = y;
  }

  // Build contours with implicit on-curve points inserted
  const contours: GlyphContour[] = [];
  let pointIndex = 0;
  for (let c = 0; c < numberOfContours; c++) {
    const end = endPtsOfContours[c];
    const rawPoints: GlyphPoint[] = [];
    for (; pointIndex <= end; pointIndex++) {
      rawPoints.push({
        x: xs[pointIndex],
        y: ys[pointIndex],
        onCurve: !!(flags[pointIndex] & 0x01),
      });
    }
    contours.push({ points: insertImplicitOnCurvePoints(rawPoints) });
  }

  return { contours, xMin, yMin, xMax, yMax };
}

// TrueType: two consecutive off-curve points imply an on-curve midpoint between them.
function insertImplicitOnCurvePoints(points: GlyphPoint[]): GlyphPoint[] {
  const result: GlyphPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    result.push(curr);
    if (!curr.onCurve && !next.onCurve) {
      result.push({
        x: (curr.x + next.x) / 2,
        y: (curr.y + next.y) / 2,
        onCurve: true,
      });
    }
  }
  return result;
}
