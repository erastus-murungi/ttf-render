import { describe, expect, it } from "vitest";
import { flattenContour, flattenQuadratic } from "../../src/rasterizer/bezier.ts";

describe("flattenQuadratic", () => {
  it("returns steps+1 points", () => {
    const pts = flattenQuadratic({ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }, 8);
    expect(pts.length).toBe(9);
  });

  it("starts at p0 and ends at p2", () => {
    const pts = flattenQuadratic({ x: 10, y: 20 }, { x: 50, y: 80 }, { x: 90, y: 20 });
    expect(pts[0]).toEqual({ x: 10, y: 20 });
    expect(pts[pts.length - 1]).toEqual({ x: 90, y: 20 });
  });

  it("midpoint of symmetric curve is at control point y", () => {
    const pts = flattenQuadratic({ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }, 2);
    const mid = pts[1];
    // t=0.5: 0.25*0 + 2*0.5*0.5*100 + 0.25*0 = 50
    expect(mid.y).toBeCloseTo(50);
  });
});

describe("flattenContour", () => {
  it("passes through on-curve points", () => {
    const points = [
      { x: 0, y: 0, onCurve: true },
      { x: 100, y: 0, onCurve: true },
      { x: 100, y: 100, onCurve: true },
    ];
    const result = flattenContour(points);
    expect(result.some((p) => p.x === 0 && p.y === 0)).toBe(true);
    expect(result.some((p) => p.x === 100 && p.y === 0)).toBe(true);
  });

  it("produces more points when off-curve points are present", () => {
    const straight = [
      { x: 0, y: 0, onCurve: true },
      { x: 100, y: 0, onCurve: true },
    ];
    const curved = [
      { x: 0, y: 0, onCurve: true },
      { x: 50, y: 100, onCurve: false },
      { x: 100, y: 0, onCurve: true },
    ];
    expect(flattenContour(curved).length).toBeGreaterThan(flattenContour(straight).length);
  });
});
