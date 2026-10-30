/**
 * Architectural Elevation & Facade Projection Engine (DIN 1356-1)
 * Projects 3D building elements (exterior walls, doors, windows, roof pitches)
 * into exact orthographic 2D facade elevations for North, South, East, and West.
 */

import { Floor, CadProject, Wall, Door, Window } from '../types/cad';
import { distance } from './cadMath';

export type FacadeDirection = 'south' | 'north' | 'east' | 'west';

export interface ProjectedOpening {
  id: string;
  type: 'door' | 'window';
  name: string;
  xM: number; // Position from left edge of facade in meters
  widthM: number;
  bottomM: number; // Height from ground (±0.00) in meters
  heightM: number;
  lintelM: number; // Top height in meters
  parapetM: number; // BRH in meters
  style: string;
  glazing: string;
}

export interface ProjectedElevation {
  direction: FacadeDirection;
  titleDe: string;
  facadeWidthM: number;
  wallHeightM: number;
  roofHeightM: number;
  totalHeightM: number;
  ridgeHeightM: number;
  eavesHeightM: number;
  groundM: number;
  roofType: string;
  roofPitchDeg: number;
  overhangM: number;
  isGableSide: boolean;
  openings: ProjectedOpening[];
  wallMaterial: string;
}

/**
 * Calculates orthographic facade projection for a given direction.
 */
export function projectBuildingElevation(
  project: CadProject,
  floor: Floor,
  direction: FacadeDirection
): ProjectedElevation {
  const walls = floor.walls;
  if (walls.length === 0) {
    return {
      direction,
      titleDe: getDirectionTitle(direction),
      facadeWidthM: 8.0,
      wallHeightM: 2.6,
      roofHeightM: 2.4,
      totalHeightM: 5.0,
      ridgeHeightM: 5.0,
      eavesHeightM: 2.6,
      groundM: 0.0,
      roofType: 'gable',
      roofPitchDeg: 35,
      overhangM: 0.5,
      isGableSide: direction === 'east' || direction === 'west',
      openings: [],
      wallMaterial: 'plaster',
    };
  }

  const minX = Math.min(...walls.flatMap((w) => [w.start.x, w.end.x]));
  const maxX = Math.max(...walls.flatMap((w) => [w.start.x, w.end.x]));
  const minY = Math.min(...walls.flatMap((w) => [w.start.y, w.end.y]));
  const maxY = Math.max(...walls.flatMap((w) => [w.start.y, w.end.y]));

  const buildingWidthX = Math.max(1, maxX - minX);
  const buildingDepthY = Math.max(1, maxY - minY);

  const isNorthSouth = direction === 'south' || direction === 'north';
  const facadeWidthM = isNorthSouth ? buildingWidthX : buildingDepthY;

  // Roof specifications
  const roof = project.roof || floor.roofs?.[0];
  const roofType = roof?.type || 'gable';
  const roofPitchDeg = roof?.pitch || 35;
  const overhangM = roof?.overhang ?? 0.50;

  // Find wall height (average exterior wall height)
  const extWalls = walls.filter((w) => w.isExterior);
  const avgWallHeight = extWalls.length > 0
    ? extWalls.reduce((sum, w) => sum + (w.height || 2.6), 0) / extWalls.length
    : 2.6;

  // Roof height calculation: half span * tan(pitch)
  const spanForPitch = (roofType === 'hip' || roofType === 'gable') ? Math.min(buildingWidthX, buildingDepthY) : facadeWidthM;
  const calculatedRoofHeight = Math.max(1.0, (spanForPitch / 2) * Math.tan((roofPitchDeg * Math.PI) / 180));
  const roofHeightM = roof?.ridgeHeight ? Math.max(0.5, roof.ridgeHeight - avgWallHeight) : calculatedRoofHeight;

  const eavesHeightM = avgWallHeight;
  const ridgeHeightM = avgWallHeight + roofHeightM;
  const totalHeightM = ridgeHeightM;

  // In standard German gable roof houses, ridge runs parallel to the longer side (often East-West)
  // Gable triangles are typically on East/West if widthX >= depthY, or North/South if depthY > widthX
  const isGableSide = roofType === 'gable'
    ? (buildingWidthX >= buildingDepthY ? (direction === 'east' || direction === 'west') : (direction === 'north' || direction === 'south'))
    : false;

  // Project openings (Doors & Windows)
  const projectedOpenings: ProjectedOpening[] = [];

  // Filter walls belonging to this facade
  // South facade: walls with high Y, normal facing +Y
  // North facade: walls with low Y, normal facing -Y
  // East facade: walls with high X, normal facing +X
  // West facade: walls with low X, normal facing -X
  const TOL = 0.8; // tolerance in meters for multi-segment facades

  walls.forEach((wall) => {
    const wMidX = (wall.start.x + wall.end.x) / 2;
    const wMidY = (wall.start.y + wall.end.y) / 2;
    const wDx = wall.end.x - wall.start.x;
    const wDy = wall.end.y - wall.start.y;
    const wLen = distance(wall.start, wall.end);
    if (wLen < 0.1) return;

    let isFacadeWall = false;
    if (direction === 'south' && wMidY >= maxY - TOL && Math.abs(wDx) >= Math.abs(wDy)) isFacadeWall = true;
    if (direction === 'north' && wMidY <= minY + TOL && Math.abs(wDx) >= Math.abs(wDy)) isFacadeWall = true;
    if (direction === 'east' && wMidX >= maxX - TOL && Math.abs(wDy) >= Math.abs(wDx)) isFacadeWall = true;
    if (direction === 'west' && wMidX <= minX + TOL && Math.abs(wDy) >= Math.abs(wDx)) isFacadeWall = true;

    if (!isFacadeWall) return;

    // Find doors on this wall
    floor.doors.filter((d) => d.wallId === wall.id).forEach((d) => {
      const pRatio = d.position;
      const wx = wall.start.x + wDx * pRatio;
      const wy = wall.start.y + wDy * pRatio;

      let xOnFacade = 0;
      if (direction === 'south') xOnFacade = wx - minX;
      else if (direction === 'north') xOnFacade = maxX - wx; // Mirror horizontally for outside view
      else if (direction === 'east') xOnFacade = wy - minY;
      else if (direction === 'west') xOnFacade = maxY - wy; // Mirror horizontally for outside view

      projectedOpenings.push({
        id: d.id,
        type: 'door',
        name: d.name || 'Tür',
        xM: Math.max(0.1, xOnFacade - d.width / 2),
        widthM: d.width,
        bottomM: d.sillHeight || 0.0,
        heightM: d.height,
        lintelM: (d.sillHeight || 0.0) + d.height,
        parapetM: d.sillHeight || 0.0,
        style: d.type,
        glazing: d.material || 'standard',
      });
    });

    // Find windows on this wall
    floor.windows.filter((win) => win.wallId === wall.id).forEach((win) => {
      const pRatio = win.position;
      const wx = wall.start.x + wDx * pRatio;
      const wy = wall.start.y + wDy * pRatio;

      let xOnFacade = 0;
      if (direction === 'south') xOnFacade = wx - minX;
      else if (direction === 'north') xOnFacade = maxX - wx;
      else if (direction === 'east') xOnFacade = wy - minY;
      else if (direction === 'west') xOnFacade = maxY - wy;

      projectedOpenings.push({
        id: win.id,
        type: 'window',
        name: win.name || 'Fenster',
        xM: Math.max(0.1, xOnFacade - win.width / 2),
        widthM: win.width,
        bottomM: win.parapetHeight,
        heightM: win.height,
        lintelM: win.parapetHeight + win.height,
        parapetM: win.parapetHeight,
        style: win.type,
        glazing: win.glazing,
      });
    });
  });

  return {
    direction,
    titleDe: getDirectionTitle(direction),
    facadeWidthM,
    wallHeightM: Math.round(avgWallHeight * 100) / 100,
    roofHeightM: Math.round(roofHeightM * 100) / 100,
    totalHeightM: Math.round(totalHeightM * 100) / 100,
    ridgeHeightM: Math.round(ridgeHeightM * 100) / 100,
    eavesHeightM: Math.round(eavesHeightM * 100) / 100,
    groundM: 0.0,
    roofType,
    roofPitchDeg,
    overhangM,
    isGableSide,
    openings: projectedOpenings,
    wallMaterial: extWalls[0]?.material || 'plaster',
  };
}

function getDirectionTitle(dir: FacadeDirection): string {
  switch (dir) {
    case 'south':
      return 'Südansicht (Garten- & Terrassenseite)';
    case 'north':
      return 'Nordansicht (Eingangsseite)';
    case 'east':
      return 'Ostansicht (Morgensonne)';
    case 'west':
      return 'Westansicht (Abendsonne)';
  }
}
