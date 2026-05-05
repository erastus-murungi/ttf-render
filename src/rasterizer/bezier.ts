export interface Point {
  x: number
  y: number
}

// Flatten a quadratic Bézier (p0 → p1 control → p2) into line segments.
export function flattenQuadratic(p0: Point, p1: Point, p2: Point, steps = 16): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    pts.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    })
  }
  return pts
}

// Flatten a TrueType contour (mix of on-curve and off-curve points) into a polyline.
export function flattenContour(points: { x: number; y: number; onCurve: boolean }[]): Point[] {
  const result: Point[] = []
  const n = points.length
  for (let i = 0; i < n; i++) {
    const curr = points[i]
    const next = points[(i + 1) % n]
    if (curr.onCurve) {
      result.push({ x: curr.x, y: curr.y })
    } else {
      const prev = points[(i - 1 + n) % n]
      if (prev.onCurve) {
        const segments = flattenQuadratic(prev, curr, next)
        // skip first point (already added as prev on-curve)
        for (let s = 1; s < segments.length; s++) result.push(segments[s])
      }
    }
  }
  return result
}
