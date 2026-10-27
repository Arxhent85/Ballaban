/**
 * Professional Architectural Wall Junction, Miter, and Crossing Cleanup Engine (DIN 1356-1)
 *
 * Implements full 2D boundary extraction and interior segment suppression for:
 * 1. L-Corners (Wandecken): Miters any angle (90°, 45°, arbitrary) without seam lines.
 * 2. T-Junctions (Wandanschlüsse): Suppresses end caps and opens continuous wall faces for seamless flow.
 * 3. X-Crossings (Wandkreuzungen / Vier-Wege-Kreuzungen): Cleans the intersection core completely,
 *    eliminating internal cross lines so walls form a continuous, unified mass.
 * 4. Material Fugen / Separations: Proper joint lines when different materials meet (e.g. drywall to brick).
 */

import { Wall, Point2D } from '../types/cad';
import { distance, getWallNormal, infiniteLineIntersection, isPointInPolygon } from './cadMath';

export interface CleanWallBoundarySegment {
  id: string;
  wallId: string;
  start: Point2D;
  end: Point2D;
  isExterior: boolean;
  material: string;
  isJointLine?: boolean;
}

export interface CleanWallJunctionData {
  wallId: string;
  wall: Wall;
  poly: Point2D[]; // Base mitered polygon
  boundarySegments: CleanWallBoundarySegment[];
}

export interface WallAssemblyCleanResult {
  walls: CleanWallJunctionData[];
  allBoundarySegments: CleanWallBoundarySegment[];
}

/**
 * Line segment intersection in 2D parametric form.
 * Returns intersection point if segments cross or touch (t in [0, 1] and u in [0, 1]).
 */
export function segmentIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D,
  tolerance = 1e-5
): { point: Point2D; t: number; u: number } | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < tolerance) {
    return null; // Parallel or collinear
  }

  const qx = p3.x - p1.x;
  const qy = p3.y - p1.y;

  const t = (qx * d2y - qy * d2x) / cross;
  const u = (qx * d1y - qy * d1x) / cross;

  if (t >= -tolerance && t <= 1 + tolerance && u >= -tolerance && u <= 1 + tolerance) {
    const clampedT = Math.max(0, Math.min(1, t));
    return {
      point: {
        x: p1.x + clampedT * d1x,
        y: p1.y + clampedT * d1y,
      },
      t: clampedT,
      u: Math.max(0, Math.min(1, u)),
    };
  }

  return null;
}

/**
 * Computes base corner miters for a wall, handling endpoint-to-endpoint L-joints.
 */
function computeMiteredWallPolygon(wall: Wall, allWalls: Wall[], snapDist = 0.12): Point2D[] {
  const norm = getWallNormal(wall);
  const halfT = (wall.thickness || (wall.isExterior ? 0.30 : 0.115)) / 2;

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / len, y: dy / len };

  let pStartLeft = { x: wall.start.x + norm.x * halfT, y: wall.start.y + norm.y * halfT };
  let pStartRight = { x: wall.start.x - norm.x * halfT, y: wall.start.y - norm.y * halfT };
  let pEndLeft = { x: wall.end.x + norm.x * halfT, y: wall.end.y + norm.y * halfT };
  let pEndRight = { x: wall.end.x - norm.x * halfT, y: wall.end.y - norm.y * halfT };

  for (const other of allWalls) {
    if (other.id === wall.id) continue;
    const otherHalfT = (other.thickness || (other.isExterior ? 0.30 : 0.115)) / 2;
    const otherDx = other.end.x - other.start.x;
    const otherDy = other.end.y - other.start.y;
    const otherLen = Math.hypot(otherDx, otherDy) || 1;
    const otherDir = { x: otherDx / otherLen, y: otherDy / otherLen };

    // 1. START L-Corner
    const startToOtherStart = distance(wall.start, other.start) <= snapDist;
    const startToOtherEnd = distance(wall.start, other.end) <= snapDist;
    if (startToOtherStart || startToOtherEnd) {
      const v1 = dir;
      const n1 = norm;
      const v2 = startToOtherStart ? otherDir : { x: -otherDir.x, y: -otherDir.y };
      const n2 = { x: -v2.y, y: v2.x };

      const l1PosA = { x: wall.start.x + n1.x * halfT, y: wall.start.y + n1.y * halfT };
      const l1PosB = { x: l1PosA.x + v1.x, y: l1PosA.y + v1.y };
      const l1NegA = { x: wall.start.x - n1.x * halfT, y: wall.start.y - n1.y * halfT };
      const l1NegB = { x: l1NegA.x + v1.x, y: l1NegA.y + v1.y };

      const otherV = startToOtherStart ? other.start : other.end;
      const l2PosA = { x: otherV.x + n2.x * otherHalfT, y: otherV.y + n2.y * otherHalfT };
      const l2PosB = { x: l2PosA.x + v2.x, y: l2PosA.y + v2.y };
      const l2NegA = { x: otherV.x - n2.x * otherHalfT, y: otherV.y - n2.y * otherHalfT };
      const l2NegB = { x: l2NegA.x + v2.x, y: l2NegA.y + v2.y };

      const interPosNeg = infiniteLineIntersection(l1PosA, l1PosB, l2NegA, l2NegB);
      const interNegPos = infiniteLineIntersection(l1NegA, l1NegB, l2PosA, l2PosB);
      const maxMiter = (halfT + otherHalfT) * 2.5;

      if (interPosNeg && distance(wall.start, interPosNeg) <= maxMiter) {
        pStartLeft = interPosNeg;
      }
      if (interNegPos && distance(wall.start, interNegPos) <= maxMiter) {
        pStartRight = interNegPos;
      }
    }

    // 2. END L-Corner
    const endToOtherStart = distance(wall.end, other.start) <= snapDist;
    const endToOtherEnd = distance(wall.end, other.end) <= snapDist;
    if (endToOtherStart || endToOtherEnd) {
      const v1 = { x: -dir.x, y: -dir.y };
      const n1 = { x: -v1.y, y: v1.x };
      const v2 = endToOtherStart ? otherDir : { x: -otherDir.x, y: -otherDir.y };
      const n2 = { x: -v2.y, y: v2.x };

      const l1PosA = { x: wall.end.x + n1.x * halfT, y: wall.end.y + n1.y * halfT };
      const l1PosB = { x: l1PosA.x + v1.x, y: l1PosA.y + v1.y };
      const l1NegA = { x: wall.end.x - n1.x * halfT, y: wall.end.y - n1.y * halfT };
      const l1NegB = { x: l1NegA.x + v1.x, y: l1NegA.y + v1.y };

      const otherV = endToOtherStart ? other.start : other.end;
      const l2PosA = { x: otherV.x + n2.x * otherHalfT, y: otherV.y + n2.y * otherHalfT };
      const l2PosB = { x: l2PosA.x + v2.x, y: l2PosA.y + v2.y };
      const l2NegA = { x: otherV.x - n2.x * otherHalfT, y: otherV.y - n2.y * otherHalfT };
      const l2NegB = { x: l2NegA.x + v2.x, y: l2NegA.y + v2.y };

      const interPosNeg = infiniteLineIntersection(l1PosA, l1PosB, l2NegA, l2NegB);
      const interNegPos = infiniteLineIntersection(l1NegA, l1NegB, l2PosA, l2PosB);
      const maxMiter = (halfT + otherHalfT) * 2.5;

      if (interNegPos && distance(wall.end, interNegPos) <= maxMiter) {
        pEndLeft = interNegPos;
      }
      if (interPosNeg && distance(wall.end, interPosNeg) <= maxMiter) {
        pEndRight = interPosNeg;
      }
    }
  }

  return [pStartLeft, pEndLeft, pEndRight, pStartRight];
}

/**
 * Tests if a point lies strictly inside another wall's body polygon (with a small margin).
 */
function isPointStrictlyInsideWall(pt: Point2D, wallPoly: Point2D[], margin = 0.005): boolean {
  if (wallPoly.length < 3) return false;
  if (!isPointInPolygon(pt, wallPoly)) return false;

  // Verify distance from polygon edges to avoid discarding legitimate collinear boundaries
  for (let i = 0; i < wallPoly.length; i++) {
    const a = wallPoly[i];
    const b = wallPoly[(i + 1) % wallPoly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lSq = dx * dx + dy * dy;
    if (lSq > 1e-6) {
      const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lSq));
      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      const d = Math.hypot(pt.x - projX, pt.y - projY);
      if (d < margin) {
        return false; // On or extremely close to edge
      }
    }
  }

  return true;
}

/**
 * Master Wall Cleanup & Seamless Junction Generator.
 * Resolves all L-corners, T-junctions, and X-crossings into clean, uninterrupted boundary strokes.
 */
export function calculateCleanWallJunctions(walls: Wall[]): WallAssemblyCleanResult {
  if (!walls || walls.length === 0) {
    return { walls: [], allBoundarySegments: [] };
  }

  // Step 1: Pre-compute base mitered polygons for all walls
  const wallPolys = walls.map((w) => ({
    wall: w,
    poly: computeMiteredWallPolygon(w, walls),
  }));

  const cleanWalls: CleanWallJunctionData[] = [];
  const allBoundarySegments: CleanWallBoundarySegment[] = [];

  // Step 2: Extract, split, and filter edge segments for each wall
  wallPolys.forEach(({ wall, poly }) => {
    // 4 base boundary segments:
    // 0: Left side (pStartLeft -> pEndLeft)
    // 1: End Cap (pEndLeft -> pEndRight)
    // 2: Right side (pEndRight -> pStartRight)
    // 3: Start Cap (pStartRight -> pStartLeft)
    const rawEdges: { start: Point2D; end: Point2D; isCap: boolean }[] = [
      { start: poly[0], end: poly[1], isCap: false },
      { start: poly[1], end: poly[2], isCap: true },
      { start: poly[2], end: poly[3], isCap: false },
      { start: poly[3], end: poly[0], isCap: true },
    ];

    const wallBoundarySegments: CleanWallBoundarySegment[] = [];

    rawEdges.forEach((edge, edgeIdx) => {
      const eLen = distance(edge.start, edge.end);
      if (eLen < 0.02) return;

      // Find all split parameters t in [0, 1] from intersections with ALL other walls
      const splitTs = new Set<number>([0, 1]);

      wallPolys.forEach(({ wall: otherWall, poly: otherPoly }) => {
        if (otherWall.id === wall.id) return;

        // Check intersections with other wall's 4 edges
        for (let j = 0; j < 4; j++) {
          const op1 = otherPoly[j];
          const op2 = otherPoly[(j + 1) % 4];
          const inter = segmentIntersection(edge.start, edge.end, op1, op2);
          if (inter && inter.t > 0.005 && inter.t < 0.995) {
            splitTs.add(inter.t);
          }
        }
      });

      // Sort split points
      const sortedTs = Array.from(splitTs).sort((a, b) => a - b);

      // Evaluate each sub-segment
      for (let i = 0; i < sortedTs.length - 1; i++) {
        const t1 = sortedTs[i];
        const t2 = sortedTs[i + 1];
        if (t2 - t1 < 0.008) continue; // Skip tiny slivers

        const subStart: Point2D = {
          x: edge.start.x + t1 * (edge.end.x - edge.start.x),
          y: edge.start.y + t1 * (edge.end.y - edge.start.y),
        };
        const subEnd: Point2D = {
          x: edge.start.x + t2 * (edge.end.x - edge.start.x),
          y: edge.start.y + t2 * (edge.end.y - edge.start.y),
        };

        const midPoint: Point2D = {
          x: (subStart.x + subEnd.x) / 2,
          y: (subStart.y + subEnd.y) / 2,
        };

        // Check if midPoint is inside any other wall
        let isInsideOtherWall = false;
        let isJointWithDifferentMaterial = false;

        for (const { wall: otherWall, poly: otherPoly } of wallPolys) {
          if (otherWall.id === wall.id) continue;

          if (isPointStrictlyInsideWall(midPoint, otherPoly, 0.006)) {
            // It is inside another wall!
            isInsideOtherWall = true;
            break;
          }

          // If this is an end/start cap touching another wall with different material,
          // keep it as a neat dividing joint line (Fuge)
          if (edge.isCap) {
            const d1 = distance(subStart, otherWall.start);
            const d2 = distance(subStart, otherWall.end);
            const d3 = distance(subEnd, otherWall.start);
            const d4 = distance(subEnd, otherWall.end);
            if (d1 < 0.15 || d2 < 0.15 || d3 < 0.15 || d4 < 0.15) {
              // At junction: if materials differ, keep joint line
              if (wall.material !== otherWall.material || wall.isExterior !== otherWall.isExterior) {
                isJointWithDifferentMaterial = true;
              }
            }
          }
        }

        // If inside another wall of same priority/mass, SUPPRESS IT!
        // This is the core magic that opens up T-junctions, L-corners, and X-crossings!
        if (isInsideOtherWall && !isJointWithDifferentMaterial) {
          continue; // Suppressed: internal to the wall assembly
        }

        const seg: CleanWallBoundarySegment = {
          id: `seg_${wall.id}_${edgeIdx}_${i}`,
          wallId: wall.id,
          start: subStart,
          end: subEnd,
          isExterior: wall.isExterior,
          material: wall.material || 'brick',
          isJointLine: isJointWithDifferentMaterial,
        };

        wallBoundarySegments.push(seg);
        allBoundarySegments.push(seg);
      }
    });

    cleanWalls.push({
      wallId: wall.id,
      wall,
      poly,
      boundarySegments: wallBoundarySegments,
    });
  });

  return {
    walls: cleanWalls,
    allBoundarySegments,
  };
}
