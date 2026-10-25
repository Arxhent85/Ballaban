import { describe, it, expect } from 'bun:test';
import {
  generateStraightSkeletonRoof,
  ensureCCW,
  offsetPolygon2D,
  polygonArea2D,
} from './straightSkeleton';
import { Point2D } from '../types/cad';

describe('Wavefront Straight Skeleton Polygon Roof Engine', () => {
  it('1. Correctly calculates CCW orientation and positive area', () => {
    const cwBox: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
      { x: 0, y: 8 },
    ];
    const ccw = ensureCCW(cwBox);
    expect(polygonArea2D(ccw)).toBeGreaterThan(0);
    expect(polygonArea2D(ccw)).toBeCloseTo(80, 1);
  });

  it('2. Correctly expands roof footprint with overhang', () => {
    const box: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
      { x: 0, y: 8 },
    ];
    const overhang04 = offsetPolygon2D(box, 0.40);
    const areaOriginal = polygonArea2D(box);
    const areaOverhang = polygonArea2D(overhang04);
    // Overhang expands the footprint
    expect(areaOverhang).toBeGreaterThan(areaOriginal);
    // 10.8m x 8.8m = ~95 m2
    expect(areaOverhang).toBeGreaterThan(90);
  });

  it('3. Generates 4 exact sloped facets and a central ridge for a rectangular hip roof', () => {
    const rect: Point2D[] = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 8 },
      { x: 0, y: 8 },
    ];
    const result = generateStraightSkeletonRoof(rect, {
      baseHeight: 2.50,
      pitchDeg: 35,
      overhang: 0.40,
      roofType: 'hip',
    });

    expect(result.facets.length).toBe(4);
    expect(result.totalSurfaceAreaM2).toBeGreaterThan(result.footprintAreaM2);
    expect(result.maxRidgeHeight).toBeGreaterThan(2.50);
    // Height above eaves = span/2 * tan(35) = 4.4 * 0.7002 = ~3.08m => maxRidgeHeight ~ 5.58m
    expect(result.maxRidgeHeight).toBeGreaterThan(5.0);
    expect(result.ridges.some((r) => r.type === 'ridge')).toBe(true);
    expect(result.ridges.some((r) => r.type === 'hip')).toBe(true);
  });

  it('4. Generates sloped planes and triangular gables for a gable roof', () => {
    const rect: Point2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 6 },
      { x: 0, y: 6 },
    ];
    const result = generateStraightSkeletonRoof(rect, {
      baseHeight: 2.60,
      pitchDeg: 40,
      overhang: 0.30,
      roofType: 'gable',
      ridgeDirection: 'horizontal',
    });

    expect(result.facets.length).toBe(4);
    const gableFacets = result.facets.filter((f) => f.isGable);
    const slopedFacets = result.facets.filter((f) => !f.isGable);
    expect(gableFacets.length).toBe(2);
    expect(slopedFacets.length).toBe(2);
    expect(result.totalSurfaceAreaM2).toBeGreaterThan(60);
  });

  it('5. Handles L-shaped and polygonal footprints with reflex corners (valleys and hips)', () => {
    // L-shaped footprint (like BIMCraft test)
    const lShape: Point2D[] = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 10 },
      { x: 0, y: 10 },
    ];

    const result = generateStraightSkeletonRoof(lShape, {
      baseHeight: 2.50,
      pitchDeg: 30,
      overhang: 0.40,
    });

    expect(result.facets.length).toBe(6); // 6 edges of the L-shape
    expect(result.totalSurfaceAreaM2).toBeGreaterThan(0);
    expect(result.footprintAreaM2).toBeGreaterThan(polygonArea2D(lShape));
    expect(result.maxRidgeHeight).toBeGreaterThan(2.50);
  });
});
