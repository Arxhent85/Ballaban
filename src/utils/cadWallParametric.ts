/**
 * Parametric Wall Dimension & Connected Topology Engine
 * Allows direct resizing of wall lengths with automatic anchor alignment
 * and preservation of connected corner joints (L-corners, T-junctions).
 */

import { Wall, Point2D } from '../types/cad';
import { distance } from './cadMath';

export type ResizeAnchor = 'start' | 'end' | 'center';

export interface ParametricWallResizeResult {
  updatedWall: Wall;
  affectedConnectedWalls: Wall[];
  allUpdatedWalls: Wall[];
}

/**
 * Resizes a wall to a target length and optionally updates any connected walls.
 * @param wall The wall to resize
 * @param newLengthM Target length in meters (must be > 0.10)
 * @param anchor Which point stays fixed: 'start' (extends end), 'end' (extends start), or 'center' (extends symmetrically)
 * @param allWalls All walls on the floor
 * @param keepConnectedAttached Whether to move endpoints of connected walls (within tolerance) to stay joined
 * @param connectionToleranceM Snap radius to consider walls joined at endpoints (default 0.06m)
 */
export function resizeWallParametrically(
  wall: Wall,
  newLengthM: number,
  anchor: ResizeAnchor,
  allWalls: Wall[],
  keepConnectedAttached = true,
  connectionToleranceM = 0.06
): ParametricWallResizeResult {
  const targetLength = Math.max(0.10, newLengthM);
  const currentLength = distance(wall.start, wall.end);
  if (currentLength < 1e-4) {
    return {
      updatedWall: wall,
      affectedConnectedWalls: [],
      allUpdatedWalls: allWalls,
    };
  }

  // Direction vector
  const ux = (wall.end.x - wall.start.x) / currentLength;
  const uy = (wall.end.y - wall.start.y) / currentLength;

  let newStart: Point2D = { ...wall.start };
  let newEnd: Point2D = { ...wall.end };

  const oldStart = { ...wall.start };
  const oldEnd = { ...wall.end };

  if (anchor === 'start') {
    // Start is fixed, End moves
    newEnd = {
      x: oldStart.x + ux * targetLength,
      y: oldStart.y + uy * targetLength,
    };
  } else if (anchor === 'end') {
    // End is fixed, Start moves backwards
    newStart = {
      x: oldEnd.x - ux * targetLength,
      y: oldEnd.y - uy * targetLength,
    };
  } else {
    // Center is fixed, both ends expand/contract symmetrically
    const midX = (oldStart.x + oldEnd.x) / 2;
    const midY = (oldStart.y + oldEnd.y) / 2;
    const halfLen = targetLength / 2;
    newStart = {
      x: midX - ux * halfLen,
      y: midY - uy * halfLen,
    };
    newEnd = {
      x: midX + ux * halfLen,
      y: midY + uy * halfLen,
    };
  }

  const updatedWall: Wall = {
    ...wall,
    start: newStart,
    end: newEnd,
  };

  const affectedConnectedWalls: Wall[] = [];

  const allUpdatedWalls = allWalls.map((w) => {
    if (w.id === wall.id) {
      return updatedWall;
    }

    if (!keepConnectedAttached) {
      return w;
    }

    let modified = false;
    let wStart = { ...w.start };
    let wEnd = { ...w.end };

    // Check if start of other wall was connected to old start
    if (anchor !== 'start' && distance(w.start, oldStart) <= connectionToleranceM) {
      wStart = { ...newStart };
      modified = true;
    }
    // Check if end of other wall was connected to old start
    if (anchor !== 'start' && distance(w.end, oldStart) <= connectionToleranceM) {
      wEnd = { ...newStart };
      modified = true;
    }

    // Check if start of other wall was connected to old end
    if (anchor !== 'end' && distance(w.start, oldEnd) <= connectionToleranceM) {
      wStart = { ...newEnd };
      modified = true;
    }
    // Check if end of other wall was connected to old end
    if (anchor !== 'end' && distance(w.end, oldEnd) <= connectionToleranceM) {
      wEnd = { ...newEnd };
      modified = true;
    }

    if (modified) {
      const updatedOther: Wall = {
        ...w,
        start: wStart,
        end: wEnd,
      };
      affectedConnectedWalls.push(updatedOther);
      return updatedOther;
    }

    return w;
  });

  return {
    updatedWall,
    affectedConnectedWalls,
    allUpdatedWalls,
  };
}
