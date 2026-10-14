/**
 * roofAnalysis.ts
 * 
 * Intelligent Architectural Roof & Wall Slope Analysis Engine.
 * 
 * Automatically analyzes building envelope, wall corner heights, slope angles,
 * and pitch directions from CAD walls.
 * Ensures roofs (especially Pultdach / Shed and Satteldach / Gable) sit 100%
 * flush on top of the walls with zero floating in the air.
 */

import { Wall, Roof, RoofType, RoofSlopeDirection } from '../types/cad';

export interface RoofWallAnalysis {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number; // East-West span (X)
  depth: number; // North-South span (Y)
  centerX: number;
  centerZ: number;

  // Height envelope
  minHeight: number;
  maxHeight: number;
  deltaHeight: number;
  avgHeight: number;

  // Slope classification
  hasSlope: boolean; // deltaHeight > 0.05 m
  slopeType: 'none' | 'monopitch' | 'gable';

  // Monopitch (Pultdach) optimal parameters
  monopitchBaseHeight: number;
  monopitchHeight: number;
  monopitchPitchDeg: number;
  slopeDirection: 'front' | 'back' | 'left' | 'right';
  slopeAxis: 'x' | 'y';

  // Gable (Satteldach) optimal parameters
  gableBaseHeight: number;
  gableHeight: number;
  gablePitchDeg: number;
  gableRidgeDirection: 'horizontal' | 'vertical';

  // Overall recommendation
  recommendedType: RoofType;
}

/**
 * Analyze an array of walls to determine building bounds, slope, and flush roof parameters.
 */
export function analyzeWallsForRoof(walls: Wall[]): RoofWallAnalysis {
  const extWalls = walls.filter((w) => w.isExterior);
  const targetWalls = extWalls.length > 0 ? extWalls : walls;

  if (targetWalls.length === 0) {
    return {
      minX: 2,
      maxX: 10,
      minY: 2,
      maxY: 8,
      width: 8,
      depth: 6,
      centerX: 6,
      centerZ: 5,
      minHeight: 2.5,
      maxHeight: 2.5,
      deltaHeight: 0,
      avgHeight: 2.5,
      hasSlope: false,
      slopeType: 'none',
      monopitchBaseHeight: 2.5,
      monopitchHeight: 1.5,
      monopitchPitchDeg: 14.0,
      slopeDirection: 'front',
      slopeAxis: 'y',
      gableBaseHeight: 2.5,
      gableHeight: 2.1,
      gablePitchDeg: 35.0,
      gableRidgeDirection: 'horizontal',
      recommendedType: 'gable',
    };
  }

  // 1. Envelope Bounds (2D X and Y, where 2D Y corresponds to 3D Z)
  const minX = Math.min(...targetWalls.flatMap((w) => [w.start.x, w.end.x]));
  const maxX = Math.max(...targetWalls.flatMap((w) => [w.start.x, w.end.x]));
  const minY = Math.min(...targetWalls.flatMap((w) => [w.start.y, w.end.y]));
  const maxY = Math.max(...targetWalls.flatMap((w) => [w.start.y, w.end.y]));

  const width = Math.max(1.0, maxX - minX);
  const depth = Math.max(1.0, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minY + maxY) / 2;

  // 2. Vertex Heights Collection
  interface VertexSample {
    x: number;
    y: number; // 2D Y
    h: number;
  }
  const vertices: VertexSample[] = [];

  targetWalls.forEach((w) => {
    const hStart = w.height || 2.5;
    const hEnd = w.endHeight ?? hStart;
    vertices.push({ x: w.start.x, y: w.start.y, h: hStart });
    vertices.push({ x: w.end.x, y: w.end.y, h: hEnd });
  });

  const allHeights = vertices.map((v) => v.h);
  const minHeight = Math.min(...allHeights);
  const maxHeight = Math.max(...allHeights);
  const deltaHeight = Math.max(0, maxHeight - minHeight);
  const avgHeight = Math.round((allHeights.reduce((a, b) => a + b, 0) / allHeights.length) * 100) / 100;

  const hasSlope = deltaHeight > 0.05;

  // 3. Slope Direction Analysis
  // Divide bounding box into quadrants / side zones (North = min Y, South = max Y, West = min X, East = max X)
  const northSamples = vertices.filter((v) => v.y <= minY + depth * 0.35);
  const southSamples = vertices.filter((v) => v.y >= maxY - depth * 0.35);
  const westSamples = vertices.filter((v) => v.x <= minX + width * 0.35);
  const eastSamples = vertices.filter((v) => v.x >= maxX - width * 0.35);

  const avgH = (samples: VertexSample[], fallback: number) =>
    samples.length > 0
      ? samples.reduce((acc, s) => acc + s.h, 0) / samples.length
      : fallback;

  const hNorth = avgH(northSamples, minHeight);
  const hSouth = avgH(southSamples, minHeight);
  const hWest = avgH(westSamples, minHeight);
  const hEast = avgH(eastSamples, minHeight);

  const diffY = hNorth - hSouth; // > 0 means North is higher (slopes down towards South/front)
  const diffX = hWest - hEast;   // > 0 means West is higher (slopes down towards East/right)

  let slopeDirection: 'front' | 'back' | 'left' | 'right' = 'front';
  let slopeAxis: 'x' | 'y' = 'y';
  let slopeSpan = depth;

  if (Math.abs(diffY) >= Math.abs(diffX)) {
    slopeAxis = 'y';
    slopeSpan = depth;
    if (diffY >= 0) {
      // North (back) is higher, South (front) is lower -> slopes down to front
      slopeDirection = 'front';
    } else {
      // South (front) is higher, North (back) is lower -> slopes down to back
      slopeDirection = 'back';
    }
  } else {
    slopeAxis = 'x';
    slopeSpan = width;
    if (diffX >= 0) {
      // West (left) is higher, East (right) is lower -> slopes down to right
      slopeDirection = 'right';
    } else {
      // East (right) is higher, West (left) is lower -> slopes down to left
      slopeDirection = 'left';
    }
  }

  // Calculate actual pitch angle from slope
  const monopitchHeight = hasSlope ? deltaHeight : Math.max(0.5, Math.round(slopeSpan * Math.tan((15 * Math.PI) / 180) * 100) / 100);
  const monopitchPitchDeg = hasSlope
    ? Math.round((Math.atan2(deltaHeight, slopeSpan) * 180 / Math.PI) * 10) / 10
    : 15.0;
  const monopitchBaseHeight = minHeight;

  // 4. Gable (Satteldach) Analysis
  const isGableAlongX = width >= depth;
  const gableRidgeDirection: 'horizontal' | 'vertical' = isGableAlongX ? 'horizontal' : 'vertical';
  const gableSpan = isGableAlongX ? depth : width;
  const gableHalfSpan = gableSpan / 2;

  // Check if middle samples are higher than both ends (true gable wall)
  const midXSamples = vertices.filter((v) => Math.abs(v.x - centerX) <= width * 0.2);
  const midYSamples = vertices.filter((v) => Math.abs(v.y - centerZ) <= depth * 0.2);
  const hMid = Math.max(avgH(midXSamples, 0), avgH(midYSamples, 0));

  let slopeType: 'none' | 'monopitch' | 'gable' = 'none';
  if (hasSlope) {
    if (hMid > minHeight + 0.2 && Math.abs(hNorth - hSouth) < 0.2 && Math.abs(hWest - hEast) < 0.2) {
      slopeType = 'gable';
    } else {
      slopeType = 'monopitch';
    }
  }

  const gableHeight = slopeType === 'gable'
    ? deltaHeight
    : Math.max(0.6, Math.round(gableHalfSpan * Math.tan((35 * Math.PI) / 180) * 100) / 100);
  const gablePitchDeg = slopeType === 'gable'
    ? Math.round((Math.atan2(deltaHeight, gableHalfSpan) * 180 / Math.PI) * 10) / 10
    : 35.0;
  const gableBaseHeight = minHeight;

  // Recommended roof type
  const recommendedType: RoofType = slopeType === 'monopitch'
    ? 'shed'
    : slopeType === 'gable'
    ? 'gable'
    : width >= depth ? 'gable' : 'shed';

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    depth,
    centerX,
    centerZ,
    minHeight,
    maxHeight,
    deltaHeight,
    avgHeight,
    hasSlope,
    slopeType,
    monopitchBaseHeight,
    monopitchHeight,
    monopitchPitchDeg,
    slopeDirection,
    slopeAxis,
    gableBaseHeight,
    gableHeight,
    gablePitchDeg,
    gableRidgeDirection,
    recommendedType,
  };
}

/**
 * Creates or updates a Roof object with flush, mathematically fitted parameters
 * based on actual building walls.
 */
export function createAutoFittedRoof(
  walls: Wall[],
  existingRoof?: Partial<Roof> | null,
  targetType?: RoofType
): Roof {
  const analysis = analyzeWallsForRoof(walls);
  const type: RoofType = targetType ?? existingRoof?.type ?? analysis.recommendedType;

  let baseHeight = analysis.avgHeight;
  let height = 2.20;
  let pitchDegrees = 35;
  let slopeDirection: RoofSlopeDirection = analysis.slopeDirection;
  let ridgeDirection: 'horizontal' | 'vertical' = analysis.gableRidgeDirection;

  if (type === 'shed') {
    // Pultdach: Sits flush on low wall, rises to high wall
    baseHeight = analysis.monopitchBaseHeight;
    height = analysis.monopitchHeight;
    pitchDegrees = analysis.monopitchPitchDeg;
    slopeDirection = analysis.slopeDirection;
  } else if (type === 'gable') {
    // Satteldach: Eaves sit at baseHeight
    baseHeight = analysis.gableBaseHeight;
    height = analysis.gableHeight;
    pitchDegrees = analysis.gablePitchDeg;
    ridgeDirection = analysis.gableRidgeDirection;
  } else if (type === 'flat') {
    // Flachdach: Sits at wall height
    baseHeight = analysis.maxHeight;
    height = 0.35;
    pitchDegrees = 0;
  } else {
    // Other shapes (hip, tent, mansard, etc.)
    baseHeight = analysis.minHeight;
    const span = Math.min(analysis.width, analysis.depth);
    pitchDegrees = existingRoof?.pitchDegrees ?? 30;
    height = Math.max(0.5, Math.round((span / 2) * Math.tan((pitchDegrees * Math.PI) / 180) * 100) / 100);
  }

  const isLinked = existingRoof?.isOverhangLinked ?? true;
  const defOverhang = type === 'flat' ? 0.15 : 0.40;
  const masterOverhang = existingRoof?.overhang ?? existingRoof?.overhangEaves ?? defOverhang;
  const eaves = isLinked ? masterOverhang : (existingRoof?.overhangEaves ?? masterOverhang);
  const gable = isLinked ? masterOverhang : (existingRoof?.overhangGable ?? masterOverhang);

  return {
    id: existingRoof?.id || 'roof_' + Date.now(),
    type,
    pitchDegrees,
    pitchLeft: pitchDegrees,
    pitchRight: pitchDegrees,
    isPitchLinked: true,
    overhang: masterOverhang,
    overhangEaves: eaves,
    overhangGable: gable,
    isOverhangLinked: isLinked,
    ridgeDirection,
    slopeDirection,
    ridgeOffset: existingRoof?.ridgeOffset ?? 0,
    pitchMode: 'follow_walls',
    height,
    baseHeight,
    material: existingRoof?.material || 'tiles_anthracite',
    hasChimney: existingRoof?.hasChimney ?? false,
    skylightsCount: existingRoof?.skylightsCount ?? 0,
    accessories: existingRoof?.accessories ?? [],
    customBounds: {
      minX: analysis.minX,
      maxX: analysis.maxX,
      minY: analysis.minY,
      maxY: analysis.maxY,
    },
  };
}
