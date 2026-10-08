/**
 * Architectural Plan Calibrator & Orthogonal Snapper
 * 
 * Handles:
 * - Hierarchy of Scale: Labeled dimensions > User reference measurement > Plausible estimate
 * - Coordinate mapping from image pixels/ratios to real-world meters
 * - "Wände begradigen" (Orthogonalization & Gap Closure)
 * - "Maße runden" (to 1cm or 5cm)
 */

import { Point2D } from '../types/cad';
import { AiPlanAnalysisResult, CalibrationData, AiDetectedWall } from '../types/aiImport';

export interface CalibratedPlanResult {
  scalePixelsPerMeter: number;
  scaleSource: 'plan_dimension' | 'user_reference' | 'plausible_estimate';
  realWidthM: number;
  realDepthM: number;
  calibratedResult: AiPlanAnalysisResult;
}

/**
 * Computes optimal scale and transforms detected plan into real-world meter coordinates.
 */
export function calibrateAndTransformPlan(
  rawResult: AiPlanAnalysisResult,
  userCalibration?: CalibrationData,
  options: {
    autoStraighten: boolean;
    roundDimensions: 'none' | '1cm' | '5cm';
    useDefaultThickness: boolean;
    defaultExteriorThickness?: number;
    defaultInteriorThickness?: number;
    targetBuildingWidthM?: number;
  } = {
    autoStraighten: true,
    roundDimensions: '5cm',
    useDefaultThickness: true,
    defaultExteriorThickness: 0.24,
    defaultInteriorThickness: 0.115,
  }
): CalibratedPlanResult {
  const imgW = rawResult.imageWidth || 1000;
  const imgH = rawResult.imageHeight || 1000;

  // Calculate actual bounding box of walls in normalized space (0..1000)
  let minWallX = 1000;
  let maxWallX = 0;
  if (rawResult.walls && rawResult.walls.length > 0) {
    for (const w of rawResult.walls) {
      minWallX = Math.min(minWallX, w.startX, w.endX);
      maxWallX = Math.max(maxWallX, w.startX, w.endX);
    }
  } else {
    minWallX = 0;
    maxWallX = 1000;
  }
  const wallSpanNormX = (maxWallX > minWallX + 40) ? (maxWallX - minWallX) / 1000 : 1.0;

  // 1. Calculate Pixels per Meter based on Hierarchy of Scale (Teil 3)
  let scalePxPerMeter = 100;
  let scaleSource: CalibratedPlanResult['scaleSource'] = 'plausible_estimate';

  // Check 0: Explicit user target building width (highest priority if set in Review)
  if (options.targetBuildingWidthM && options.targetBuildingWidthM >= 2.0 && options.targetBuildingWidthM <= 40.0) {
    const realWidthM = options.targetBuildingWidthM / wallSpanNormX;
    scalePxPerMeter = imgW / realWidthM;
    scaleSource = 'user_reference';
  } else {
    // Check Rank 1: In Plan beschriftete Maße
    const validPlanDims = rawResult.readDimensions.filter(
      (d) => d.valueMeters > 0.5 && d.startX !== undefined && d.endX !== undefined && d.startY !== undefined && d.endY !== undefined
    );

    if (validPlanDims.length > 0) {
      // Pick the longest labeled dimension for maximum accuracy
      validPlanDims.sort((a, b) => b.valueMeters - a.valueMeters);
      const bestDim = validPlanDims[0];
      const pxDist = Math.hypot((bestDim.endX! - bestDim.startX!) * (imgW / 1000), (bestDim.endY! - bestDim.startY!) * (imgH / 1000));
      if (pxDist > 30) {
        scalePxPerMeter = pxDist / bestDim.valueMeters;
        scaleSource = 'plan_dimension';
      }
    }

    // Check Rank 2: Benutzer-Referenzmaß (overrides estimate if user calibrated)
    if (userCalibration && userCalibration.isCalibrated && userCalibration.pixelsPerMeter > 1) {
      scalePxPerMeter = userCalibration.pixelsPerMeter;
      scaleSource = 'user_reference';
    } else if (scaleSource === 'plausible_estimate') {
      // Check Rank 3: Plausible architectural estimate
      // If we have an unanchored large dimension from readDimensions (e.g. 9.00 m from plan title), consider it
      const unanchoredLargeDim = rawResult.readDimensions
        .filter((d) => d.valueMeters >= 4.0 && d.valueMeters <= 35.0)
        .sort((a, b) => b.valueMeters - a.valueMeters)[0];

      const estBuildingWidthM = unanchoredLargeDim ? unanchoredLargeDim.valueMeters : (rawResult.detectedTotalWidthM || 9.0);

      if (estBuildingWidthM >= 4 && estBuildingWidthM <= 35) {
        // Adjust for building occupying only wallSpanNormX portion of the image
        const realWidthM = estBuildingWidthM / wallSpanNormX;
        scalePxPerMeter = imgW / realWidthM;
      } else {
        // Estimate house as approx 10.0 meters wide
        scalePxPerMeter = imgW / 10.0;
      }
    }
  }

  // Calculate real building extent
  const realWidthM = imgW / scalePxPerMeter;
  const realDepthM = imgH / scalePxPerMeter;

  // Scale function: converts 0..1000 normalized coordinate to meters
  const toMetersX = (valNorm: number) => (valNorm / 1000) * realWidthM;
  const toMetersY = (valNorm: number) => (valNorm / 1000) * realDepthM;

  const extThickness = options.defaultExteriorThickness ?? 0.24;
  const intThickness = options.defaultInteriorThickness ?? 0.115;

  // 2. Clone and convert items to meter space
  const walls: AiDetectedWall[] = rawResult.walls.map((w) => ({
    ...w,
    startX: toMetersX(w.startX),
    startY: toMetersY(w.startY),
    endX: toMetersX(w.endX),
    endY: toMetersY(w.endY),
    thickness: options.useDefaultThickness
      ? (w.isExterior ? extThickness : intThickness)
      : (w.thickness ? Math.min(w.thickness, w.isExterior ? 0.30 : 0.15) : (w.isExterior ? extThickness : intThickness)),
  }));

  // 3. Begradigen (Orthogonalize Wände & schließen Ecken)
  if (options.autoStraighten) {
    straightenWalls(walls);
    snapWallCorners(walls, 0.35); // 35 cm snap radius for corner joints
  }

  // 4. Maße runden
  if (options.roundDimensions !== 'none') {
    const step = options.roundDimensions === '5cm' ? 0.05 : 0.01;
    for (const w of walls) {
      w.startX = Math.round(w.startX / step) * step;
      w.startY = Math.round(w.startY / step) * step;
      w.endX = Math.round(w.endX / step) * step;
      w.endY = Math.round(w.endY / step) * step;
    }
  }

  // Convert Doors
  const doors = rawResult.doors.map((d) => ({
    ...d,
    x: toMetersX(d.x),
    y: toMetersY(d.y),
    width: options.roundDimensions !== 'none' ? Math.round(d.width / 0.05) * 0.05 : d.width,
  }));

  // Convert Windows
  const windows = rawResult.windows.map((win) => ({
    ...win,
    x: toMetersX(win.x),
    y: toMetersY(win.y),
    width: options.roundDimensions !== 'none' ? Math.round(win.width / 0.05) * 0.05 : win.width,
  }));

  // Convert Rooms
  const rooms = rawResult.rooms.map((r) => {
    const poly: Point2D[] = r.polygon.map((p) => ({
      x: toMetersX(p.x),
      y: toMetersY(p.y),
    }));
    return {
      ...r,
      polygon: poly,
      areaM2: r.areaM2 || calculatePolygonArea(poly),
    };
  });

  // Convert Furniture
  const furniture = rawResult.furniture.map((f) => ({
    ...f,
    x: toMetersX(f.x),
    y: toMetersY(f.y),
  }));

  // Convert Stairs
  const stairs = rawResult.stairs.map((s) => ({
    ...s,
    x: toMetersX(s.x),
    y: toMetersY(s.y),
  }));

  const calibratedResult: AiPlanAnalysisResult = {
    ...rawResult,
    walls,
    doors,
    windows,
    rooms,
    furniture,
    stairs,
    scalePxPerMeter,
    detectedTotalWidthM: realWidthM,
    detectedTotalDepthM: realDepthM,
  };

  return {
    scalePixelsPerMeter: scalePxPerMeter,
    scaleSource,
    realWidthM,
    realDepthM,
    calibratedResult,
  };
}

/**
 * Straightens walls that are nearly horizontal (0°) or vertical (90°).
 */
export function straightenWalls(walls: AiDetectedWall[], thresholdDeg = 12): void {
  for (const w of walls) {
    const dx = w.endX - w.startX;
    const dy = w.endY - w.startY;
    const len = Math.hypot(dx, dy);
    if (len < 0.1) continue;

    const angleDeg = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;

    // Nearly Horizontal (0°)
    if (angleDeg < thresholdDeg) {
      const avgY = (w.startY + w.endY) / 2;
      w.startY = avgY;
      w.endY = avgY;
    }
    // Nearly Vertical (90°)
    else if (Math.abs(angleDeg - 90) < thresholdDeg) {
      const avgX = (w.startX + w.endX) / 2;
      w.startX = avgX;
      w.endX = avgX;
    }
  }
}

/**
 * Snaps nearby wall endpoints together so corners become 100% flush closed joints.
 */
export function snapWallCorners(walls: AiDetectedWall[], snapRadiusM = 0.35): void {
  const points: { wall: AiDetectedWall; isStart: boolean; x: number; y: number }[] = [];
  for (const w of walls) {
    points.push({ wall: w, isStart: true, x: w.startX, y: w.startY });
    points.push({ wall: w, isStart: false, x: w.endX, y: w.endY });
  }

  // Group points within snapRadiusM
  const visited = new Set<number>();
  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;
    const cluster = [points[i]];
    visited.add(i);

    for (let j = i + 1; j < points.length; j++) {
      if (visited.has(j)) continue;
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (dist <= snapRadiusM) {
        cluster.push(points[j]);
        visited.add(j);
      }
    }

    if (cluster.length > 1) {
      // Calculate cluster centroid
      const avgX = cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
      const avgY = cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;

      for (const p of cluster) {
        if (p.isStart) {
          p.wall.startX = avgX;
          p.wall.startY = avgY;
        } else {
          p.wall.endX = avgX;
          p.wall.endY = avgY;
        }
      }
    }
  }
}

/**
 * Calculates net polygon area using surveyor's formula.
 */
function calculatePolygonArea(pts: Point2D[]): number {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}
