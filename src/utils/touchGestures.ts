/**
 * Advanced Touch & Apple Pencil Gestures Engine (Procreate-style CAD interactions)
 * 
 * Supports:
 * - 2-finger pan & pinch-zoom
 * - Quick-pinch to fit all
 * - 2-finger rotate with snap to North / 90°
 * - 2-finger tap: Undo (hold: rapid repeat undo)
 * - 3-finger tap: Redo (hold: rapid repeat redo)
 * - 4-finger tap: Toggle Fullscreen / Focus Mode
 * - 3-finger swipe down: Clipboard action sheet (Cut, Copy, Paste, Duplicate)
 * - 1-finger draw -> cancel immediately on 2nd finger touch down
 * - Palm rejection for Apple Pencil
 * - QuickShape geometric shape recognizer (rough stroke -> straight wall / rect room / circle)
 */

import { Point2D } from '../types/cad';

export interface TouchPointerInfo {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  pointerType: string;
  width?: number;
  height?: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
}

export type QuickShapeType = 'line' | 'rect' | 'circle' | 'polygon';

export interface QuickShapeResult {
  type: QuickShapeType;
  confidence: number; // 0..1
  line?: { start: Point2D; end: Point2D };
  rect?: { p1: Point2D; p2: Point2D; width: number; depth: number };
  circle?: { center: Point2D; radius: number };
  polygon?: Point2D[];
  label: string;
}

/**
 * Detects whether the current device is an iPad or touch-capable tablet
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPad Pro in desktop mode
  );
}

/**
 * Detects whether an event is likely an accidental palm touch
 */
export function isPalmTouch(e: React.PointerEvent | PointerEvent, hasActivePen: boolean): boolean {
  if (e.pointerType === 'pen') return false;
  if (e.pointerType === 'mouse') return false;

  // 1. If an Apple Pencil is active, touch contact with larger radius or simultaneous touch is palm
  if (hasActivePen && e.pointerType === 'touch') {
    return true;
  }

  // 2. Large contact surface typically indicates palm or side of hand
  const contactW = (e as any).width || 0;
  const contactH = (e as any).height || 0;
  if (contactW > 38 || contactH > 38) {
    return true;
  }

  return false;
}

/**
 * Calculates distance between two 2D points
 */
export function pointDistance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculates angle between two screen points in radians
 */
export function calculatePinchAngle(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Snaps angle to nearest 90-degree increment if within tolerance
 */
export function snapRotationAngle(angleRad: number, toleranceRad = 0.08): { angle: number; isSnapped: boolean } {
  const norm = ((angleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const increments = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, Math.PI * 2];
  
  for (const inc of increments) {
    if (Math.abs(norm - inc) <= toleranceRad) {
      return { angle: inc % (Math.PI * 2), isSnapped: true };
    }
  }
  return { angle: angleRad, isSnapped: false };
}

/**
 * QuickShape Recognizer: converts freehand strokes into architectural primitives
 * (Straight walls, rectangular rooms, circles) when held steady at the stroke end.
 */
export function recognizeQuickShape(points: Point2D[], minLenM = 0.4): QuickShapeResult | null {
  if (points.length < 5) return null;

  const startPt = points[0];
  const endPt = points[points.length - 1];
  const totalChordDist = pointDistance(startPt, endPt);

  // Calculate cumulative arc length
  let arcLength = 0;
  for (let i = 1; i < points.length; i++) {
    arcLength += pointDistance(points[i - 1], points[i]);
  }

  if (arcLength < minLenM) return null;

  // Bounding box of stroke
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const bbW = maxX - minX;
  const bbH = maxY - minY;

  // Check if stroke is nearly closed (start and end close together)
  const isClosed = totalChordDist <= Math.max(0.6, arcLength * 0.2);

  // 1. RECTANGLE DETECTION (if closed and matches bounding box perimeter)
  if (isClosed && points.length >= 8 && bbW >= 0.6 && bbH >= 0.6) {
    const expectedPerim = 2 * (bbW + bbH);
    const perimRatio = arcLength / expectedPerim;

    if (perimRatio >= 0.75 && perimRatio <= 1.35) {
      // Check corner density or aspect
      return {
        type: 'rect',
        confidence: 0.92,
        rect: {
          p1: { x: minX, y: minY },
          p2: { x: maxX, y: maxY },
          width: bbW,
          depth: bbH,
        },
        label: `Rechteckraum (${bbW.toFixed(2)}m × ${bbH.toFixed(2)}m)`,
      };
    }
  }

  // 2. CIRCLE DETECTION (if closed and distances to centroid are uniform)
  if (isClosed && points.length >= 10 && bbW >= 0.5 && bbH >= 0.5) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const approxRadius = (bbW + bbH) / 4;

    let radVariance = 0;
    for (const p of points) {
      const d = Math.hypot(p.x - cx, p.y - cy);
      radVariance += Math.abs(d - approxRadius);
    }
    const avgRadError = radVariance / points.length;

    if (avgRadError <= approxRadius * 0.22 && Math.abs(bbW - bbH) <= Math.max(bbW, bbH) * 0.3) {
      return {
        type: 'circle',
        confidence: 0.88,
        circle: {
          center: { x: cx, y: cy },
          radius: approxRadius,
        },
        label: `Kreis (Radius: ${approxRadius.toFixed(2)}m)`,
      };
    }
  }

  // 3. STRAIGHT LINE DETECTION (cord length close to arc length)
  const straightnessRatio = totalChordDist / arcLength;
  if (!isClosed && straightnessRatio >= 0.88 && totalChordDist >= 0.5) {
    // Snap to 15° or orthogonal if close
    const ang = Math.atan2(endPt.y - startPt.y, endPt.x - startPt.x);
    const stepRad = (15 * Math.PI) / 180;
    const snappedAng = Math.round(ang / stepRad) * stepRad;

    let finalEnd = endPt;
    if (Math.abs(ang - snappedAng) <= 0.08) {
      finalEnd = {
        x: startPt.x + Math.cos(snappedAng) * totalChordDist,
        y: startPt.y + Math.sin(snappedAng) * totalChordDist,
      };
    }

    return {
      type: 'line',
      confidence: straightnessRatio,
      line: {
        start: startPt,
        end: finalEnd,
      },
      label: `Gerade Wand (${totalChordDist.toFixed(2)}m)`,
    };
  }

  return null;
}
