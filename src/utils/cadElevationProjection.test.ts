import { describe, it, expect } from 'bun:test';
import { projectBuildingElevation } from './cadElevationProjection';
import { CadProject, Floor, Wall, Window, Door } from '../types/cad';

describe('Architectural Elevation & Facade Projection Engine', () => {
  it('1. Projects South facade with actual windows and doors', () => {
    // 10m x 8m house
    const southWall: Wall = {
      id: 'w_south',
      start: { x: 0, y: 8 },
      end: { x: 10, y: 8 },
      thickness: 0.365,
      height: 2.70,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const eastWall: Wall = {
      id: 'w_east',
      start: { x: 10, y: 8 },
      end: { x: 10, y: 0 },
      thickness: 0.365,
      height: 2.70,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const northWall: Wall = {
      id: 'w_north',
      start: { x: 10, y: 0 },
      end: { x: 0, y: 0 },
      thickness: 0.365,
      height: 2.70,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const westWall: Wall = {
      id: 'w_west',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 8 },
      thickness: 0.365,
      height: 2.70,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const patioDoor: Door = {
      id: 'd_patio',
      wallId: 'w_south',
      position: 0.7, // at x = 7.0m
      width: 1.80,
      height: 2.15,
      type: 'sliding',
      swingDirection: 'right',
      openDirection: 'outside',
      swingAngle: 90,
      frameThickness: 0.08,
      sillHeight: 0.0,
    };

    const windowLiving: Window = {
      id: 'win_liv',
      wallId: 'w_south',
      position: 0.3, // at x = 3.0m
      width: 1.40,
      height: 1.30,
      parapetHeight: 0.85,
      type: 'double',
      frameColor: '#ffffff',
      glazing: '3',
      hasInteriorSill: true,
      hasExteriorSill: true,
    };

    const floor: Floor = {
      id: 'fl_eg',
      name: 'Erdgeschoss',
      level: 0,
      walls: [southWall, eastWall, northWall, westWall],
      doors: [patioDoor],
      windows: [windowLiving],
      rooms: [],
      stairs: [],
      furniture: [],
      dimensions: [],
      roofs: [],
    };

    const project: CadProject = {
      id: 'proj_1',
      name: 'Musterhaus',
      floors: [floor],
      activeFloorId: 'fl_eg',
      layers: [],
      unit: 'm',
      scale: '1:100',
      roof: {
        id: 'roof_1',
        type: 'gable',
        pitch: 38,
        overhang: 0.50,
      },
    };

    const southProj = projectBuildingElevation(project, floor, 'south');

    expect(southProj.direction).toBe('south');
    expect(southProj.facadeWidthM).toBe(10);
    expect(southProj.wallHeightM).toBe(2.70);
    expect(southProj.openings.length).toBe(2);

    const doorProj = southProj.openings.find((o) => o.type === 'door')!;
    expect(doorProj.widthM).toBe(1.80);
    expect(doorProj.heightM).toBe(2.15);
    // position at ~7.0m - 0.9m = ~6.1m
    expect(doorProj.xM).toBeCloseTo(6.1, 1);

    const winProj = southProj.openings.find((o) => o.type === 'window')!;
    expect(winProj.widthM).toBe(1.40);
    expect(winProj.parapetM).toBe(0.85);
    expect(winProj.xM).toBeCloseTo(2.3, 1);
  });
});
