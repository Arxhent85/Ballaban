/**
 * CAD Geometry, Snapping, Wall Junctions, and Collision Utilities
 */

import {
  Point2D,
  Wall,
  SnapSettings,
  UnitType,
  BoundingBox2D,
  Door,
  Window,
  Furniture,
  Room,
  PlotBoundary,
  ActiveGuideLine,
  SnapPointType,
} from '../types/cad';
import { calculateSmartSnap, calculateEqualSpacingRatio } from './cadSnapping';

export * from './cadSnapping';
export type { ActiveGuideLine, SnapPointType };

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleDeg(p1: Point2D, p2: Point2D): number {
  const rad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function formatDimension(valInMeters: number, unit: UnitType, decimals = 2): string {
  if (unit === 'cm') {
    return `${(valInMeters * 100).toFixed(decimals > 1 ? 1 : 0)} cm`;
  }
  if (unit === 'mm') {
    return `${Math.round(valInMeters * 1000)} mm`;
  }
  return `${valInMeters.toFixed(decimals)} m`;
}

export function formatArea(m2: number): string {
  return `${m2.toFixed(2)} m²`;
}

export interface SnapResult {
  point: Point2D;
  snapped: boolean;
  type: SnapPointType;
  targetWallId?: string;
  label?: string;
  symbol?: string;
  guideLines?: ActiveGuideLine[];
  candidatesCount?: number;
  activeCandidateIndex?: number;
  matchedWallIds?: string[];
}

export function calculateSnap(
  target: Point2D,
  origin: Point2D | null,
  walls: Wall[],
  settings: SnapSettings,
  zoom: number,
  extraCtx?: {
    doors?: Door[];
    windows?: Window[];
    furniture?: Furniture[];
    rooms?: Room[];
    plot?: PlotBoundary;
    candidateIndex?: number;
    isAltPressed?: boolean;
    isAngleLocked?: boolean;
    ignoredIds?: string[];
    currentTool?: string;
  }
): SnapResult {
  const res = calculateSmartSnap({
    target,
    origin,
    walls,
    doors: extraCtx?.doors,
    windows: extraCtx?.windows,
    furniture: extraCtx?.furniture,
    rooms: extraCtx?.rooms,
    plot: extraCtx?.plot,
    settings,
    zoom,
    candidateIndex: extraCtx?.candidateIndex,
    isAltPressed: extraCtx?.isAltPressed,
    isAngleLocked: extraCtx?.isAngleLocked,
    ignoredIds: extraCtx?.ignoredIds,
    currentTool: extraCtx?.currentTool,
  });

  return {
    point: res.point,
    snapped: res.snapped,
    type: res.type,
    label: res.label,
    symbol: res.symbol,
    guideLines: res.guideLines,
    candidatesCount: res.candidatesCount,
    activeCandidateIndex: res.activeCandidateIndex,
    targetWallId: res.matchedWallIds[0],
    matchedWallIds: res.matchedWallIds,
  };
}

export function lineIntersection(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): Point2D | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-9) return null;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    };
  }
  return null;
}

export function infiniteLineIntersection(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): Point2D | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-9) return null;

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

export function projectPointOntoWall(point: Point2D, wall: Wall): { point: Point2D; ratio: number; dist: number } {
  const p1 = wall.start;
  const p2 = wall.end;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { point: p1, ratio: 0, dist: distance(point, p1) };
  }

  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };

  return {
    point: proj,
    ratio: t,
    dist: distance(point, proj),
  };
}

export function polygonAreaAndPerimeter(points: Point2D[]): { area: number; perimeter: number } {
  if (points.length < 3) return { area: 0, perimeter: 0 };

  let area = 0;
  let perimeter = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
    perimeter += distance(points[i], points[j]);
  }

  area = Math.abs(area) / 2;
  return { area, perimeter };
}

export function getWallNormal(wall: Wall): Point2D {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: -dy / len,
    y: dx / len,
  };
}

/**
 * Computes wall boundary polygon with reference line offset.
 * Standard thicknesses: 30 cm exterior, 11.5 cm interior.
 */
export function getWallPolygon(wall: Wall): Point2D[] {
  const norm = getWallNormal(wall);
  const halfT = (wall.thickness || (wall.isExterior ? 0.30 : 0.115)) / 2;

  let offsetShift = 0;
  if (wall.referenceLine === 'inner') offsetShift = halfT;
  if (wall.referenceLine === 'outer') offsetShift = -halfT;

  const nx = norm.x;
  const ny = norm.y;

  return [
    { x: wall.start.x + nx * (halfT + offsetShift), y: wall.start.y + ny * (halfT + offsetShift) },
    { x: wall.end.x + nx * (halfT + offsetShift), y: wall.end.y + ny * (halfT + offsetShift) },
    { x: wall.end.x - nx * (halfT - offsetShift), y: wall.end.y - ny * (halfT - offsetShift) },
    { x: wall.start.x - nx * (halfT - offsetShift), y: wall.start.y - ny * (halfT - offsetShift) },
  ];
}

/**
 * Checks if a point is inside an axis-aligned bounding box.
 */
export function isPointInAABB(p: Point2D, box: BoundingBox2D): boolean {
  return p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
}

/**
 * Checks if box A completely contains box B (Window selection).
 */
export function aabbContains(outer: BoundingBox2D, inner: BoundingBox2D): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

/**
 * Checks if box A intersects or touches box B (Crossing selection).
 */
export function aabbIntersects(a: BoundingBox2D, b: BoundingBox2D): boolean {
  return !(
    b.minX > a.maxX ||
    b.maxX < a.minX ||
    b.minY > a.maxY ||
    b.maxY < a.minY
  );
}

/**
 * Checks if a 2D point is inside an arbitrary polygon via ray-casting.
 */
export function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes the bounding box of a wall.
 */
export function getWallBoundingBox(wall: Wall): BoundingBox2D {
  const pts = getWallPolygon(wall);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/**
 * Computes bounding box for furniture.
 */
export function getFurnitureBoundingBox(f: Furniture): BoundingBox2D {
  const rad = (f.rotation * Math.PI) / 180;
  const hw = f.width / 2;
  const hd = f.depth / 2;

  // 4 corners rotated
  const corners: Point2D[] = [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ].map((p) => ({
    x: f.x + p.x * Math.cos(rad) - p.y * Math.sin(rad),
    y: f.y + p.x * Math.sin(rad) + p.y * Math.cos(rad),
  }));

  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/**
 * Computes cumulative bounding box for multiple boxes.
 */
export function mergeBoundingBoxes(boxes: BoundingBox2D[]): BoundingBox2D | null {
  if (boxes.length === 0) return null;
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

/**
 * Checks if a piece of furniture intersects with any wall mass.
 */
export function checkFurnitureWallCollision(f: Furniture, walls: Wall[]): boolean {
  const fBox = getFurnitureBoundingBox(f);
  for (const w of walls) {
    const wBox = getWallBoundingBox(w);
    if (aabbIntersects(fBox, wBox)) {
      // Check distance from furniture center to wall segment
      const { dist } = projectPointOntoWall({ x: f.x, y: f.y }, w);
      const halfWallT = w.thickness / 2;
      const minSafeDist = halfWallT + Math.min(f.width, f.depth) * 0.45;
      if (dist < minSafeDist) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if a piece of furniture is within a door's opening swing arc.
 */
export function checkDoorFurnitureCollision(d: Door, wall: Wall, f: Furniture): boolean {
  const wLen = distance(wall.start, wall.end);
  const dx = (wall.end.x - wall.start.x) / wLen;
  const dy = (wall.end.y - wall.start.y) / wLen;

  const centerM = d.position * wLen;
  const halfDoor = d.width / 2;

  const pCenter = {
    x: wall.start.x + dx * centerM,
    y: wall.start.y + dy * centerM,
  };
  const hinge = d.swingDirection === 'left'
    ? { x: pCenter.x - dx * halfDoor, y: pCenter.y - dy * halfDoor }
    : { x: pCenter.x + dx * halfDoor, y: pCenter.y + dy * halfDoor };

  const fDist = distance(hinge, { x: f.x, y: f.y });
  const maxSwingReach = d.width + Math.max(f.width, f.depth) * 0.4;
  return fDist < maxSwingReach;
}

/**
 * Checks if stair pitch satisfies the DIN 18065 comfort formula: 2s + a = 63 cm (59..65)
 */
export function checkStairComfort(stepRiseM: number, stepRunM: number): { isComfortable: boolean; formulaValueCm: number; warning?: string } {
  const sCm = stepRiseM * 100;
  const aCm = stepRunM * 100;
  const val = 2 * sCm + aCm;
  const ok = val >= 59 && val <= 65;
  return {
    isComfortable: ok,
    formulaValueCm: Math.round(val * 10) / 10,
    warning: !ok ? `Steigungsverhältnis 2s + a = ${val.toFixed(1)} cm weicht von Ideal (63 cm) ab!` : undefined,
  };
}

export interface WallRenderData {
  wall: Wall;
  poly: Point2D[];
  hasStartCap: boolean;
  hasEndCap: boolean;
}

/**
 * Computes seamless wall geometry with mitered corner joints and T-junction cap suppression.
 * Eliminates all internal seam lines, gaps, and overshoots.
 */
export function calculateSeamlessWallRenderData(walls: Wall[]): WallRenderData[] {
  const tolerance = 0.08; // 8 cm junction snap tolerance

  return walls.map((wall) => {
    const norm = getWallNormal(wall);
    const halfT = (wall.thickness || (wall.isExterior ? 0.30 : 0.115)) / 2;

    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const dir = { x: dx / len, y: dy / len };

    // Base un-mitered corner offsets
    let pStartLeft = { x: wall.start.x + norm.x * halfT, y: wall.start.y + norm.y * halfT };
    let pStartRight = { x: wall.start.x - norm.x * halfT, y: wall.start.y - norm.y * halfT };
    let pEndLeft = { x: wall.end.x + norm.x * halfT, y: wall.end.y + norm.y * halfT };
    let pEndRight = { x: wall.end.x - norm.x * halfT, y: wall.end.y - norm.y * halfT };

    let hasStartCap = true;
    let hasEndCap = true;

    for (const other of walls) {
      if (other.id === wall.id) continue;
      const otherHalfT = (other.thickness || (other.isExterior ? 0.30 : 0.115)) / 2;
      const otherNorm = getWallNormal(other);
      const otherDx = other.end.x - other.start.x;
      const otherDy = other.end.y - other.start.y;
      const otherLen = Math.sqrt(otherDx * otherDx + otherDy * otherDy) || 1;
      const otherDir = { x: otherDx / otherLen, y: otherDy / otherLen };

      // 1. Check START point connections
      // A. Endpoint to endpoint (Corner L-joint)
      const startToOtherStart = distance(wall.start, other.start) <= tolerance;
      const startToOtherEnd = distance(wall.start, other.end) <= tolerance;

      if (startToOtherStart || startToOtherEnd) {
        hasStartCap = false;

        // Compute miter lines
        const line1A = pStartLeft;
        const line1B = { x: pStartLeft.x + dir.x, y: pStartLeft.y + dir.y };
        const line1RA = pStartRight;
        const line1RB = { x: pStartRight.x + dir.x, y: pStartRight.y + dir.y };

        const otherV = startToOtherStart ? other.start : other.end;
        const oDir = startToOtherStart ? otherDir : { x: -otherDir.x, y: -otherDir.y };
        const oNorm = startToOtherStart ? otherNorm : { x: -otherNorm.x, y: -otherNorm.y };

        const oLeftA = { x: otherV.x + oNorm.x * otherHalfT, y: otherV.y + oNorm.y * otherHalfT };
        const oLeftB = { x: oLeftA.x + oDir.x, y: oLeftA.y + oDir.y };
        const oRightA = { x: otherV.x - oNorm.x * otherHalfT, y: otherV.y - oNorm.y * otherHalfT };
        const oRightB = { x: oRightA.x + oDir.x, y: oRightA.y + oDir.y };

        // Test intersection of left/right combinations
        const interLL = infiniteLineIntersection(line1A, line1B, oLeftA, oLeftB);
        const interRR = infiniteLineIntersection(line1RA, line1RB, oRightA, oRightB);
        const interLR = infiniteLineIntersection(line1A, line1B, oRightA, oRightB);
        const interRL = infiniteLineIntersection(line1RA, line1RB, oLeftA, oLeftB);

        const maxMiterDist = (halfT + otherHalfT) * 2.5;
        if (interLL && distance(wall.start, interLL) <= maxMiterDist) {
          pStartLeft = interLL;
        } else if (interLR && distance(wall.start, interLR) <= maxMiterDist) {
          pStartLeft = interLR;
        }

        if (interRR && distance(wall.start, interRR) <= maxMiterDist) {
          pStartRight = interRR;
        } else if (interRL && distance(wall.start, interRL) <= maxMiterDist) {
          pStartRight = interRL;
        }
      } else {
        // T-junction at start: does wall.start lie on other wall body?
        const proj = projectPointOntoWall(wall.start, other);
        if (proj.dist <= otherHalfT + tolerance && proj.ratio > 0.02 && proj.ratio < 0.98) {
          hasStartCap = false;
        }
      }

      // 2. Check END point connections
      // A. Endpoint to endpoint (Corner L-joint)
      const endToOtherStart = distance(wall.end, other.start) <= tolerance;
      const endToOtherEnd = distance(wall.end, other.end) <= tolerance;

      if (endToOtherStart || endToOtherEnd) {
        hasEndCap = false;

        const line2LA = pEndLeft;
        const line2LB = { x: pEndLeft.x + dir.x, y: pEndLeft.y + dir.y };
        const line2RA = pEndRight;
        const line2RB = { x: pEndRight.x + dir.x, y: pEndRight.y + dir.y };

        const otherV = endToOtherStart ? other.start : other.end;
        const oDir = endToOtherStart ? otherDir : { x: -otherDir.x, y: -otherDir.y };
        const oNorm = endToOtherStart ? otherNorm : { x: -otherNorm.x, y: -otherNorm.y };

        const oLeftA = { x: otherV.x + oNorm.x * otherHalfT, y: otherV.y + oNorm.y * otherHalfT };
        const oLeftB = { x: oLeftA.x + oDir.x, y: oLeftA.y + oDir.y };
        const oRightA = { x: otherV.x - oNorm.x * otherHalfT, y: otherV.y - oNorm.y * otherHalfT };
        const oRightB = { x: oRightA.x + oDir.x, y: oRightA.y + oDir.y };

        const interLL = infiniteLineIntersection(line2LA, line2LB, oLeftA, oLeftB);
        const interRR = infiniteLineIntersection(line2RA, line2RB, oRightA, oRightB);
        const interLR = infiniteLineIntersection(line2LA, line2LB, oRightA, oRightB);
        const interRL = infiniteLineIntersection(line2RA, line2RB, oLeftA, oLeftB);

        const maxMiterDist = (halfT + otherHalfT) * 2.5;
        if (interLL && distance(wall.end, interLL) <= maxMiterDist) {
          pEndLeft = interLL;
        } else if (interLR && distance(wall.end, interLR) <= maxMiterDist) {
          pEndLeft = interLR;
        }

        if (interRR && distance(wall.end, interRR) <= maxMiterDist) {
          pEndRight = interRR;
        } else if (interRL && distance(wall.end, interRL) <= maxMiterDist) {
          pEndRight = interRL;
        }
      } else {
        // T-junction at end: does wall.end lie on other wall body?
        const proj = projectPointOntoWall(wall.end, other);
        if (proj.dist <= otherHalfT + tolerance && proj.ratio > 0.02 && proj.ratio < 0.98) {
          hasEndCap = false;
        }
      }
    }

    return {
      wall,
      poly: [pStartLeft, pEndLeft, pEndRight, pStartRight],
      hasStartCap,
      hasEndCap,
    };
  });
}

/**
 * Offsets a polygon inward by a distance, computing setback / Baugrenze lines.
 */
export function calculatePolygonInwardOffset(polygon: Point2D[], offsetDist: number): Point2D[] {
  if (polygon.length < 3) return [];

  // Determine winding order (positive = counter-clockwise)
  let signedArea = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    signedArea += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
  }
  const isCCW = signedArea > 0;

  // For each edge, compute inward normal
  const lines: { p1: Point2D; p2: Point2D }[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const pA = polygon[i];
    const pB = polygon[(i + 1) % polygon.length];
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const len = Math.hypot(dx, dy) || 1;
    // Inward normal
    const nx = isCCW ? -dy / len : dy / len;
    const ny = isCCW ? dx / len : -dx / len;

    const offsetA = { x: pA.x + nx * offsetDist, y: pA.y + ny * offsetDist };
    const offsetB = { x: pB.x + nx * offsetDist, y: pB.y + ny * offsetDist };
    lines.push({ p1: offsetA, p2: offsetB });
  }

  // Intersect adjacent offset lines
  const offsetPoints: Point2D[] = [];
  for (let i = 0; i < lines.length; i++) {
    const prevLine = lines[(i - 1 + lines.length) % lines.length];
    const currLine = lines[i];
    const inter = infiniteLineIntersection(prevLine.p1, prevLine.p2, currLine.p1, currLine.p2);
    if (inter && distance(inter, polygon[i]) < offsetDist * 3.5) {
      offsetPoints.push(inter);
    } else {
      offsetPoints.push(currLine.p1);
    }
  }

  return offsetPoints;
}

/**
 * Computes plot metrics: GRZ (Grundflächenzahl), GFZ (Geschossflächenzahl), and buildable envelope.
 * Supports both custom drawn polygon boundary lines and rectangular plots.
 */
export function calculatePlotMetrics(
  plot: { width: number; depth: number; setback: number; maxGRZ: number; maxGFZ: number; points?: Point2D[] },
  walls: Wall[],
  floorsCount: number
): {
  plotArea: number;
  footprintArea: number;
  grossFloorArea: number;
  actualGRZ: number;
  actualGFZ: number;
  isGrzValid: boolean;
  isGfzValid: boolean;
  buildableArea: number;
  buildableWidth: number;
  buildableDepth: number;
  setbackPolygon?: Point2D[];
} {
  let plotArea = 0;
  let setbackPolygon: Point2D[] | undefined = undefined;
  let buildableArea = 0;
  const setback = plot.setback ?? 3.0;

  if (plot.points && plot.points.length >= 3) {
    const { area } = polygonAreaAndPerimeter(plot.points);
    plotArea = Math.max(1, Math.round(area * 10) / 10);
    setbackPolygon = calculatePolygonInwardOffset(plot.points, setback);
    if (setbackPolygon.length >= 3) {
      const sbArea = polygonAreaAndPerimeter(setbackPolygon).area;
      buildableArea = Math.round(sbArea * 10) / 10;
    }
  } else {
    const pWidth = plot.width || 20;
    const pDepth = plot.depth || 30;
    plotArea = Math.max(1, Math.round(pWidth * pDepth * 10) / 10);
    const buildableWidth = Math.max(0, pWidth - 2 * setback);
    const buildableDepth = Math.max(0, pDepth - 2 * setback);
    buildableArea = Math.round(buildableWidth * buildableDepth * 10) / 10;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const extWalls = walls.filter((w) => w.isExterior);
  const targetWalls = extWalls.length > 0 ? extWalls : walls;

  targetWalls.forEach((w) => {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  });

  const footprintArea = isFinite(minX) && maxX > minX && maxY > minY
    ? (maxX - minX) * (maxY - minY)
    : 0;

  const grossFloorArea = footprintArea * Math.max(1, floorsCount);
  const actualGRZ = Math.round((footprintArea / plotArea) * 100) / 100;
  const actualGFZ = Math.round((grossFloorArea / plotArea) * 100) / 100;
  const maxGRZ = plot.maxGRZ || 0.40;
  const maxGFZ = plot.maxGFZ || 0.80;

  const pWidth = plot.width || 20;
  const pDepth = plot.depth || 30;
  const buildableWidth = Math.max(0, pWidth - 2 * setback);
  const buildableDepth = Math.max(0, pDepth - 2 * setback);

  return {
    plotArea,
    footprintArea: Math.round(footprintArea * 10) / 10,
    grossFloorArea: Math.round(grossFloorArea * 10) / 10,
    actualGRZ,
    actualGFZ,
    isGrzValid: actualGRZ <= maxGRZ,
    isGfzValid: actualGFZ <= maxGFZ,
    buildableArea,
    buildableWidth,
    buildableDepth,
    setbackPolygon,
  };
}
