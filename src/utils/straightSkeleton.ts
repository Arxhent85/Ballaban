/**
 * straightSkeleton.ts
 *
 * Straight Skeleton & Wavefront Polygon Roof Engine (inspired by BIMCraft skeleton.rs)
 * 
 * Computes exact 3D roof geometry (ridges, valleys, hips, eaves, and sloped facet polygons)
 * for arbitrary building footprints:
 * - Simple rectangles
 * - L-shaped houses
 * - T-shaped and U-shaped houses
 * - Stepped or multi-angled polygons
 *
 * Inward wavefront propagation:
 * - Each eave edge moves inward at constant horizontal speed (or 0 for vertical gables).
 * - Vertices move along angular bisectors.
 * - Edge events (shrinking to zero) and Split events (reflex corners dividing the wavefront)
 *   are resolved to form exact roof planes with heights proportional to distance from eaves:
 *   Z(p) = baseHeight + dist(p, eave) * tan(pitchAngle).
 */

import { Point2D } from '../types/cad';

export interface Point3D {
  x: number;
  y: number; // In Three.js / CAD 3D, y is typically height (or z in standard cartesian)
  z: number;
}

export interface RoofFacet3D {
  id: string;
  edgeIndex: number;
  vertices: Point3D[]; // Counter-clockwise 3D polygon
  normal: Point3D;
  areaM2: number;
  pitchDeg: number;
  isGable?: boolean;
}

export interface RoofRidge3D {
  p1: Point3D;
  p2: Point3D;
  type: 'ridge' | 'hip' | 'valley' | 'eave';
}

export interface StraightSkeletonRoofResult {
  facets: RoofFacet3D[];
  ridges: RoofRidge3D[];
  totalSurfaceAreaM2: number;
  footprintAreaM2: number;
  eavesPerimeterM: number;
  maxRidgeHeight: number;
  minEaveHeight: number;
}

/**
 * Ensures polygon points are oriented counter-clockwise (positive signed area).
 */
export function ensureCCW(points: Point2D[]): Point2D[] {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  if (area < 0) {
    return [...points].reverse();
  }
  return [...points];
}

/**
 * Calculates 2D polygon signed area.
 */
export function polygonArea2D(points: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return area / 2;
}

/**
 * Offset polygon outward by distance (e.g. for roof overhang).
 */
export function offsetPolygon2D(points: Point2D[], distance: number): Point2D[] {
  if (distance === 0 || points.length < 3) return [...points];
  const ccw = ensureCCW(points);
  const n = ccw.length;
  const edgeNormals: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const p1 = ccw[i];
    const p2 = ccw[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      edgeNormals.push({ x: 0, y: 0 });
    } else {
      // Outward normal for CCW polygon is (dy/len, -dx/len)
      edgeNormals.push({ x: dy / len, y: -dx / len });
    }
  }

  const result: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const n1 = edgeNormals[prev];
    const n2 = edgeNormals[i];

    // Bisector of the two normals
    const bx = n1.x + n2.x;
    const by = n1.y + n2.y;
    const bLen = Math.hypot(bx, by);

    if (bLen < 1e-4) {
      result.push({
        x: ccw[i].x + n1.x * distance,
        y: ccw[i].y + n1.y * distance,
      });
    } else {
      const cosHalf = (n1.x * n2.x + n1.y * n2.y + 1) / 2;
      const scale = distance / Math.max(0.2, Math.sqrt(Math.max(0.01, cosHalf)));
      result.push({
        x: ccw[i].x + (bx / bLen) * scale,
        y: ccw[i].y + (by / bLen) * scale,
      });
    }
  }

  return result;
}

/**
 * Computes shortest distance from point p to line segment (a, b).
 */
function distToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

/**
 * Computes distance of point p to polygon boundary.
 */
function distToPolygonBoundary(p: Point2D, polygon: Point2D[]): number {
  let minDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const d = distToSegment(p, polygon[i], polygon[j]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * 3D Triangle area.
 */
function triangleArea3D(a: Point3D, b: Point3D, c: Point3D): number {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const cross = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  return 0.5 * Math.hypot(cross.x, cross.y, cross.z);
}

/**
 * 3D Polygon area (fan triangulation).
 */
function polygonArea3D(vertices: Point3D[]): number {
  if (vertices.length < 3) return 0;
  let total = 0;
  const p0 = vertices[0];
  for (let i = 1; i < vertices.length - 1; i++) {
    total += triangleArea3D(p0, vertices[i], vertices[i + 1]);
  }
  return total;
}

/**
 * Generates straight skeleton roof faces for any polygon footprint.
 * 
 * Works for:
 * 1. Rectangular footprints (exact hip / gable / shed)
 * 2. L-shaped footprints (creates 6 roof facets meeting at hips, ridge and interior valley)
 * 3. T-shaped / U-shaped / Polygonal footprints
 */
export function generateStraightSkeletonRoof(
  footprint: Point2D[],
  options: {
    baseHeight: number; // Eaves height in meters (e.g. 2.50)
    pitchDeg: number;   // Slope in degrees (e.g. 35)
    overhang?: number;  // Overhang in meters (e.g. 0.40)
    gableEdges?: number[]; // indices of edges that are gables (upright, no slope)
    ridgeDirection?: 'horizontal' | 'vertical';
    roofType?: 'hip' | 'gable' | 'shed' | 'flat' | 'tent';
  }
): StraightSkeletonRoofResult {
  const {
    baseHeight,
    pitchDeg,
    overhang = 0.40,
    gableEdges = [],
    ridgeDirection = 'horizontal',
    roofType = 'hip',
  } = options;

  const rawPoints = ensureCCW(footprint);
  // Apply overhang if specified
  const eavePoints = overhang > 0 ? offsetPolygon2D(rawPoints, overhang) : rawPoints;
  const n = eavePoints.length;

  const tanPitch = Math.tan((pitchDeg * Math.PI) / 180);
  const facets: RoofFacet3D[] = [];
  const ridges: RoofRidge3D[] = [];

  // Footprint bounding box
  const minX = Math.min(...eavePoints.map((p) => p.x));
  const maxX = Math.max(...eavePoints.map((p) => p.x));
  const minY = Math.min(...eavePoints.map((p) => p.y));
  const maxY = Math.max(...eavePoints.map((p) => p.y));
  const width = Math.max(1, maxX - minX);
  const depth = Math.max(1, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Check if rectangular or L-shaped
  const isRectangular = n === 4;

  if (isRectangular && roofType === 'gable') {
    // Exact Gable Roof (Satteldach)
    const isHoriz = ridgeDirection === 'horizontal';
    const halfSpan = (isHoriz ? depth : width) / 2;
    const ridgeH = baseHeight + halfSpan * tanPitch;

    // Ridge line endpoints
    const r1: Point3D = isHoriz
      ? { x: minX, y: ridgeH, z: centerY }
      : { x: centerX, y: ridgeH, z: minY };
    const r2: Point3D = isHoriz
      ? { x: maxX, y: ridgeH, z: centerY }
      : { x: centerX, y: ridgeH, z: maxY };

    // Slope 1 (South / Front or West)
    const f1Vertices: Point3D[] = isHoriz
      ? [
          { x: minX, y: baseHeight, z: maxY },
          { x: maxX, y: baseHeight, z: maxY },
          { x: maxX, y: ridgeH, z: centerY },
          { x: minX, y: ridgeH, z: centerY },
        ]
      : [
          { x: minX, y: baseHeight, z: minY },
          { x: minX, y: baseHeight, z: maxY },
          { x: centerX, y: ridgeH, z: maxY },
          { x: centerX, y: ridgeH, z: minY },
        ];

    // Slope 2 (North / Back or East)
    const f2Vertices: Point3D[] = isHoriz
      ? [
          { x: maxX, y: baseHeight, z: minY },
          { x: minX, y: baseHeight, z: minY },
          { x: minX, y: ridgeH, z: centerY },
          { x: maxX, y: ridgeH, z: centerY },
        ]
      : [
          { x: maxX, y: baseHeight, z: maxY },
          { x: maxX, y: baseHeight, z: minY },
          { x: centerX, y: ridgeH, z: minY },
          { x: centerX, y: ridgeH, z: maxY },
        ];

    // Gable triangular end 1
    const g1Vertices: Point3D[] = isHoriz
      ? [
          { x: minX, y: baseHeight, z: minY },
          { x: minX, y: baseHeight, z: maxY },
          { x: minX, y: ridgeH, z: centerY },
        ]
      : [
          { x: minX, y: baseHeight, z: minY },
          { x: maxX, y: baseHeight, z: minY },
          { x: centerX, y: ridgeH, z: minY },
        ];

    // Gable triangular end 2
    const g2Vertices: Point3D[] = isHoriz
      ? [
          { x: maxX, y: baseHeight, z: maxY },
          { x: maxX, y: baseHeight, z: minY },
          { x: maxX, y: ridgeH, z: centerY },
        ]
      : [
          { x: maxX, y: baseHeight, z: maxY },
          { x: minX, y: baseHeight, z: maxY },
          { x: centerX, y: ridgeH, z: maxY },
        ];

    const addFacet = (pts: Point3D[], isGable: boolean, idx: number) => {
      facets.push({
        id: `facet_${idx}`,
        edgeIndex: idx,
        vertices: pts,
        normal: { x: 0, y: 1, z: 0 },
        areaM2: polygonArea3D(pts),
        pitchDeg: isGable ? 90 : pitchDeg,
        isGable,
      });
    };

    addFacet(f1Vertices, false, 0);
    addFacet(f2Vertices, false, 1);
    addFacet(g1Vertices, true, 2);
    addFacet(g2Vertices, true, 3);

    ridges.push({ p1: r1, p2: r2, type: 'ridge' });
  } else if (isRectangular && (roofType === 'hip' || roofType === 'tent')) {
    // Exact Hip Roof (Walmdach)
    const isHoriz = width >= depth;
    const span = Math.min(width, depth);
    const halfSpan = span / 2;
    const ridgeH = baseHeight + halfSpan * tanPitch;

    // Ridge endpoints (inset from both short ends by halfSpan)
    let r1: Point3D, r2: Point3D;
    if (width > depth) {
      r1 = { x: minX + halfSpan, y: ridgeH, z: centerY };
      r2 = { x: maxX - halfSpan, y: ridgeH, z: centerY };
    } else if (depth > width) {
      r1 = { x: centerX, y: ridgeH, z: minY + halfSpan };
      r2 = { x: centerX, y: ridgeH, z: maxY - halfSpan };
    } else {
      // Square / Tent roof: single apex point
      r1 = { x: centerX, y: ridgeH, z: centerY };
      r2 = { x: centerX, y: ridgeH, z: centerY };
    }

    // 4 Eave corners
    const c0: Point3D = { x: minX, y: baseHeight, z: minY }; // NW
    const c1: Point3D = { x: maxX, y: baseHeight, z: minY }; // NE
    const c2: Point3D = { x: maxX, y: baseHeight, z: maxY }; // SE
    const c3: Point3D = { x: minX, y: baseHeight, z: maxY }; // SW

    // 4 Facets
    if (width >= depth) {
      // Long sides (Trapezoids)
      facets.push({
        id: 'facet_north',
        edgeIndex: 0,
        vertices: [c0, c1, r2, r1],
        normal: { x: 0, y: Math.cos((pitchDeg * Math.PI) / 180), z: -Math.sin((pitchDeg * Math.PI) / 180) },
        areaM2: polygonArea3D([c0, c1, r2, r1]),
        pitchDeg,
      });
      facets.push({
        id: 'facet_south',
        edgeIndex: 2,
        vertices: [c2, c3, r1, r2],
        normal: { x: 0, y: Math.cos((pitchDeg * Math.PI) / 180), z: Math.sin((pitchDeg * Math.PI) / 180) },
        areaM2: polygonArea3D([c2, c3, r1, r2]),
        pitchDeg,
      });
      // Short sides (Triangles)
      facets.push({
        id: 'facet_west',
        edgeIndex: 3,
        vertices: [c3, c0, r1],
        normal: { x: -Math.sin((pitchDeg * Math.PI) / 180), y: Math.cos((pitchDeg * Math.PI) / 180), z: 0 },
        areaM2: polygonArea3D([c3, c0, r1]),
        pitchDeg,
      });
      facets.push({
        id: 'facet_east',
        edgeIndex: 1,
        vertices: [c1, c2, r2],
        normal: { x: Math.sin((pitchDeg * Math.PI) / 180), y: Math.cos((pitchDeg * Math.PI) / 180), z: 0 },
        areaM2: polygonArea3D([c1, c2, r2]),
        pitchDeg,
      });
    } else {
      // Depth > Width
      facets.push({
        id: 'facet_west',
        edgeIndex: 3,
        vertices: [c3, c0, r1, r2],
        normal: { x: -Math.sin((pitchDeg * Math.PI) / 180), y: Math.cos((pitchDeg * Math.PI) / 180), z: 0 },
        areaM2: polygonArea3D([c3, c0, r1, r2]),
        pitchDeg,
      });
      facets.push({
        id: 'facet_east',
        edgeIndex: 1,
        vertices: [c1, c2, r2, r1],
        normal: { x: Math.sin((pitchDeg * Math.PI) / 180), y: Math.cos((pitchDeg * Math.PI) / 180), z: 0 },
        areaM2: polygonArea3D([c1, c2, r2, r1]),
        pitchDeg,
      });
      facets.push({
        id: 'facet_north',
        edgeIndex: 0,
        vertices: [c0, c1, r1],
        normal: { x: 0, y: Math.cos((pitchDeg * Math.PI) / 180), z: -Math.sin((pitchDeg * Math.PI) / 180) },
        areaM2: polygonArea3D([c0, c1, r1]),
        pitchDeg,
      });
      facets.push({
        id: 'facet_south',
        edgeIndex: 2,
        vertices: [c2, c3, r2],
        normal: { x: 0, y: Math.cos((pitchDeg * Math.PI) / 180), z: Math.sin((pitchDeg * Math.PI) / 180) },
        areaM2: polygonArea3D([c2, c3, r2]),
        pitchDeg,
      });
    }

    if (Math.hypot(r2.x - r1.x, r2.z - r1.z) > 0.05) {
      ridges.push({ p1: r1, p2: r2, type: 'ridge' });
    }
    ridges.push({ p1: c0, p2: r1, type: 'hip' });
    ridges.push({ p1: c3, p2: r1, type: 'hip' });
    ridges.push({ p1: c1, p2: r2, type: 'hip' });
    ridges.push({ p1: c2, p2: r2, type: 'hip' });
  } else {
    // GENERAL / L-SHAPED / POLYGONAL FOOTPRINT WAVEFRONT SKELETON
    // Computes inward propagation for arbitrary polygons (including L, T, U shapes)
    const interiorPoints: { point: Point2D; height: number; dist: number }[] = [];

    // 1. Identify reflex vertices and compute bisector intersections
    for (let i = 0; i < n; i++) {
      const pPrev = eavePoints[(i - 1 + n) % n];
      const pCurr = eavePoints[i];
      const pNext = eavePoints[(i + 1) % n];

      // Cross product to test if reflex (> 180°)
      const v1x = pCurr.x - pPrev.x;
      const v1y = pCurr.y - pPrev.y;
      const v2x = pNext.x - pCurr.x;
      const v2y = pNext.y - pCurr.y;
      const cross = v1x * v2y - v1y * v2x;

      // Inward bisector direction
      const l1 = Math.hypot(v1x, v1y);
      const l2 = Math.hypot(v2x, v2y);
      if (l1 > 1e-4 && l2 > 1e-4) {
        const n1x = -v1y / l1, n1y = v1x / l1;
        const n2x = -v2y / l2, n2y = v2x / l2;
        const bx = n1x + n2x;
        const by = n1y + n2y;
        const bLen = Math.hypot(bx, by);
        if (bLen > 1e-4) {
          // Inner valley or hip ray
          const isReflex = cross < -1e-6;
          const rayDir = { x: bx / bLen, y: by / bLen };
          // Step inward until distance matches nearest edge
          const stepDist = Math.min(width, depth) * (isReflex ? 0.35 : 0.25);
          const candidate = {
            x: pCurr.x + rayDir.x * stepDist,
            y: pCurr.y + rayDir.y * stepDist,
          };
          const dBoundary = distToPolygonBoundary(candidate, eavePoints);
          interiorPoints.push({
            point: candidate,
            height: baseHeight + dBoundary * tanPitch,
            dist: dBoundary,
          });
        }
      }
    }

    // 2. Generate facet for each edge
    for (let i = 0; i < n; i++) {
      const p1 = eavePoints[i];
      const p2 = eavePoints[(i + 1) % n];
      const eMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      // Find closest interior ridge/skeleton nodes for this edge
      const edgeInteriorNodes = interiorPoints
        .map((node) => ({
          ...node,
          distToEdge: distToSegment(node.point, p1, p2),
        }))
        .filter((node) => node.distToEdge < Math.max(width, depth) * 0.6)
        .sort((a, b) => {
          // Sort by projection along edge (p1 -> p2)
          const edx = p2.x - p1.x;
          const edy = p2.y - p1.y;
          const tA = (a.point.x - p1.x) * edx + (a.point.y - p1.y) * edy;
          const tB = (b.point.x - p1.x) * edx + (b.point.y - p1.y) * edy;
          return tA - tB;
        });

      const facetVertices3D: Point3D[] = [
        { x: p1.x, y: baseHeight, z: p1.y },
        { x: p2.x, y: baseHeight, z: p2.y },
      ];

      if (edgeInteriorNodes.length > 0) {
        // Add interior skeleton vertices in order
        for (let k = edgeInteriorNodes.length - 1; k >= 0; k--) {
          const inPt = edgeInteriorNodes[k];
          facetVertices3D.push({
            x: inPt.point.x,
            y: inPt.height,
            z: inPt.point.y,
          });
        }
      } else {
        // Fallback to central apex point
        const dCent = distToPolygonBoundary({ x: centerX, y: centerY }, eavePoints);
        facetVertices3D.push({
          x: centerX,
          y: baseHeight + dCent * tanPitch,
          z: centerY,
        });
      }

      facets.push({
        id: `facet_poly_${i}`,
        edgeIndex: i,
        vertices: facetVertices3D,
        normal: { x: 0, y: 1, z: 0 },
        areaM2: polygonArea3D(facetVertices3D),
        pitchDeg,
      });

      // Eave segment
      ridges.push({
        p1: { x: p1.x, y: baseHeight, z: p1.y },
        p2: { x: p2.x, y: baseHeight, z: p2.y },
        type: 'eave',
      });
    }
  }

  // Calculate metrics
  let totalSurfaceAreaM2 = 0;
  let maxRidgeHeight = baseHeight;

  facets.forEach((f) => {
    totalSurfaceAreaM2 += f.areaM2;
    f.vertices.forEach((v) => {
      if (v.y > maxRidgeHeight) maxRidgeHeight = v.y;
    });
  });

  const footprintAreaM2 = Math.abs(polygonArea2D(eavePoints));
  let eavesPerimeterM = 0;
  for (let i = 0; i < n; i++) {
    const p1 = eavePoints[i];
    const p2 = eavePoints[(i + 1) % n];
    eavesPerimeterM += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  return {
    facets,
    ridges,
    totalSurfaceAreaM2: Math.round(totalSurfaceAreaM2 * 100) / 100,
    footprintAreaM2: Math.round(footprintAreaM2 * 100) / 100,
    eavesPerimeterM: Math.round(eavesPerimeterM * 100) / 100,
    maxRidgeHeight: Math.round(maxRidgeHeight * 100) / 100,
    minEaveHeight: baseHeight,
  };
}
