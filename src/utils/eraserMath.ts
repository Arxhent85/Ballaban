/**
 * eraserMath.ts
 * 
 * Paint-style CAD Segment Eraser Engine.
 * Erases touched wall parts (like an eraser on a line in Paint),
 * rather than deleting the entire wall object.
 */

import { Wall, Point2D } from '../types/cad';
import { distance } from './cadMath';

export interface WallEraseResult {
  action: 'delete' | 'trim_start' | 'trim_end' | 'split';
  updatedWall?: Wall; // Modified original wall
  newWall?: Wall;     // Extra wall segment produced when splitting
}

/**
 * Erases a section of a wall around a contact point.
 * 
 * @param wall The wall to be erased
 * @param contactPoint The coordinates where eraser touched
 * @param ratio Normalized position along wall [0..1]
 * @param eraseBite Total width in meters of the eraser bite (default ~0.60m)
 * @param minKeep Minimum wall length in meters to keep (default 0.15m)
 */
export function eraseWallSegment(
  wall: Wall,
  contactPoint: Point2D,
  ratio: number,
  eraseBite: number = 0.60,
  minKeep: number = 0.15
): WallEraseResult {
  const L = distance(wall.start, wall.end);

  // If wall is already tiny or bite covers whole wall, delete it
  if (L < minKeep || L <= eraseBite) {
    return { action: 'delete' };
  }

  const ux = (wall.end.x - wall.start.x) / L;
  const uy = (wall.end.y - wall.start.y) / L;

  const clickDist = Math.max(0, Math.min(L, ratio * L));
  const halfBite = eraseBite / 2;

  const d1 = clickDist - halfBite;
  const d2 = clickDist + halfBite;

  // Case A: Eraser bite covers both ends -> delete
  if (d1 <= minKeep && d2 >= L - minKeep) {
    return { action: 'delete' };
  }

  // Case B: Erasing near start -> trim start forward
  if (d1 <= minKeep) {
    const newStart: Point2D = {
      x: Math.round((wall.start.x + ux * d2) * 1000) / 1000,
      y: Math.round((wall.start.y + uy * d2) * 1000) / 1000,
    };
    if (distance(newStart, wall.end) < minKeep) {
      return { action: 'delete' };
    }
    return {
      action: 'trim_start',
      updatedWall: {
        ...wall,
        start: newStart,
      },
    };
  }

  // Case C: Erasing near end -> trim end backward
  if (d2 >= L - minKeep) {
    const newEnd: Point2D = {
      x: Math.round((wall.start.x + ux * d1) * 1000) / 1000,
      y: Math.round((wall.start.y + uy * d1) * 1000) / 1000,
    };
    if (distance(wall.start, newEnd) < minKeep) {
      return { action: 'delete' };
    }
    return {
      action: 'trim_end',
      updatedWall: {
        ...wall,
        end: newEnd,
      },
    };
  }

  // Case D: Erasing in the middle -> split wall with a gap
  const endPart1: Point2D = {
    x: Math.round((wall.start.x + ux * d1) * 1000) / 1000,
    y: Math.round((wall.start.y + uy * d1) * 1000) / 1000,
  };
  const startPart2: Point2D = {
    x: Math.round((wall.start.x + ux * d2) * 1000) / 1000,
    y: Math.round((wall.start.y + uy * d2) * 1000) / 1000,
  };

  const newWallId = 'w_' + Date.now() + Math.random().toString(36).substr(2, 4);

  return {
    action: 'split',
    updatedWall: {
      ...wall,
      end: endPart1,
    },
    newWall: {
      ...wall,
      id: newWallId,
      start: startPart2,
      end: wall.end,
    },
  };
}
