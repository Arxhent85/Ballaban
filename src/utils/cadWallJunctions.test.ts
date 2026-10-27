import { describe, it, expect } from 'bun:test';
import { calculateCleanWallJunctions, segmentIntersection } from './cadWallJunctions';
import { Wall } from '../types/cad';
import { distance } from './cadMath';

describe('CAD Wall Junction, Miter, and Crossing Cleanup Engine', () => {
  it('1. Segment intersection correctly finds intersection of crossing lines', () => {
    const res = segmentIntersection(
      { x: 0, y: 5 },
      { x: 10, y: 5 },
      { x: 5, y: 0 },
      { x: 5, y: 10 }
    );
    expect(res).not.toBeNull();
    expect(res?.point.x).toBeCloseTo(5, 4);
    expect(res?.point.y).toBeCloseTo(5, 4);
  });

  it('2. X-Crossing: Cleans 4-way intersection so NO lines cross through the central core', () => {
    // Horizontal wall: (0, 5) to (10, 5), thickness 0.30
    // Vertical wall: (5, 0) to (5, 10), thickness 0.30
    const w1: Wall = {
      id: 'w_h',
      start: { x: 0, y: 5 },
      end: { x: 10, y: 5 },
      thickness: 0.30,
      height: 2.6,
      isExterior: false,
      material: 'brick',
      referenceLine: 'center',
    };
    const w2: Wall = {
      id: 'w_v',
      start: { x: 5, y: 0 },
      end: { x: 5, y: 10 },
      thickness: 0.30,
      height: 2.6,
      isExterior: false,
      material: 'brick',
      referenceLine: 'center',
    };

    const res = calculateCleanWallJunctions([w1, w2]);
    expect(res.walls.length).toBe(2);

    // In the intersection core [4.85 .. 5.15] on X and [4.85 .. 5.15] on Y:
    // There must be ZERO segments whose midpoint is inside the intersection!
    for (const seg of res.allBoundarySegments) {
      const mid = { x: (seg.start.x + seg.end.x) / 2, y: (seg.start.y + seg.end.y) / 2 };
      const insideCore = mid.x > 4.86 && mid.x < 5.14 && mid.y > 4.86 && mid.y < 5.14;
      expect(insideCore).toBe(false);
    }

    // Both walls must have multiple clean boundary segments around the arms
    expect(res.allBoundarySegments.length).toBeGreaterThanOrEqual(8);
  });

  it('3. T-Junction: Suppresses incoming wall cap and opens the host wall face', () => {
    // Host horizontal wall: (0, 0) to (10, 0), thickness 0.30 (faces at y = -0.15 and y = +0.15)
    // Incoming vertical wall: (5, 0) to (5, 5), thickness 0.20
    const wHost: Wall = {
      id: 'w_host',
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
      thickness: 0.30,
      height: 2.6,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };
    const wStem: Wall = {
      id: 'w_stem',
      start: { x: 5, y: 0 },
      end: { x: 5, y: 5 },
      thickness: 0.20,
      height: 2.6,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const res = calculateCleanWallJunctions([wHost, wStem]);
    expect(res.walls.length).toBe(2);

    // The start cap of w_stem (at y ~ 0) must be suppressed!
    const stemCapAtZero = res.allBoundarySegments.some(
      (s) => s.wallId === 'w_stem' && Math.abs(s.start.y) < 0.2 && Math.abs(s.end.y) < 0.2
    );
    expect(stemCapAtZero).toBe(false);

    // The host wall edge at the junction (x ~ 5, y ~ 0.15) must be split/opened
    const hostLinePassingThrough = res.allBoundarySegments.some(
      (s) => s.wallId === 'w_host' && s.start.x < 4.8 && s.end.x > 5.2 && Math.abs(s.start.y - 0.15) < 0.05
    );
    expect(hostLinePassingThrough).toBe(false);
  });

  it('4. L-Corner: Miters corner cleanly without interior seam lines', () => {
    const w1: Wall = {
      id: 'w1',
      start: { x: 0, y: 0 },
      end: { x: 6, y: 0 },
      thickness: 0.30,
      height: 2.6,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };
    const w2: Wall = {
      id: 'w2',
      start: { x: 6, y: 0 },
      end: { x: 6, y: 6 },
      thickness: 0.30,
      height: 2.6,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const res = calculateCleanWallJunctions([w1, w2]);
    expect(res.walls.length).toBe(2);

    // At the corner (6, 0), there should be NO dividing cap line
    const dividingSeamAtCorner = res.allBoundarySegments.some(
      (s) =>
        distance(s.start, { x: 6, y: 0 }) < 0.25 &&
        distance(s.end, { x: 6, y: 0 }) < 0.25 &&
        Math.abs(s.start.x - s.end.x) < 0.05
    );
    expect(dividingSeamAtCorner).toBe(false);
  });
});
