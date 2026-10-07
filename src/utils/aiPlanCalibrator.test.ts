import { describe, it, expect } from 'bun:test';
import {
  calibrateAndTransformPlan,
  straightenWalls,
  snapWallCorners,
} from './aiPlanCalibrator';
import { convertAiPlanToCadObjects } from './aiPlanToCad';
import { AiPlanAnalysisResult, CalibrationData } from '../types/aiImport';

describe('AI Plan Calibrator & Orthogonal Snapper', () => {
  it('1. Test straightenWalls corrects slightly tilted lines to exact 0° and 90°', () => {
    const walls = [
      // Nearly horizontal wall with a 2° wobble (100 -> 103)
      {
        id: 'w1',
        startX: 0,
        startY: 100,
        endX: 500,
        endY: 104,
        thickness: 0.3,
        isExterior: true,
      },
      // Nearly vertical wall with a 1° wobble (200 -> 203)
      {
        id: 'w2',
        startX: 200,
        startY: 100,
        endX: 204,
        endY: 600,
        thickness: 0.3,
        isExterior: true,
      },
      // 45° diagonal wall (must stay diagonal)
      {
        id: 'w3',
        startX: 0,
        startY: 0,
        endX: 300,
        endY: 300,
        thickness: 0.3,
        isExterior: true,
      },
    ];

    straightenWalls(walls, 12);

    // Horizontal wall should have identical Y for start and end
    expect(walls[0].startY).toBe(walls[0].endY);
    expect(walls[0].startY).toBe(102);

    // Vertical wall should have identical X for start and end
    expect(walls[1].startX).toBe(walls[1].endX);
    expect(walls[1].startX).toBe(202);

    // Diagonal wall unchanged
    expect(walls[2].startX).toBe(0);
    expect(walls[2].endX).toBe(300);
    expect(walls[2].startY).toBe(0);
    expect(walls[2].endY).toBe(300);
  });

  it('2. Test snapWallCorners joins close endpoints into seamless flush corners', () => {
    const walls = [
      // Wall 1 ends at (5.02, 3.01)
      {
        id: 'w1',
        startX: 0,
        startY: 3.0,
        endX: 5.02,
        endY: 3.01,
        thickness: 0.3,
        isExterior: true,
      },
      // Wall 2 starts at (4.98, 2.99) - within 6cm distance
      {
        id: 'w2',
        startX: 4.98,
        startY: 2.99,
        endX: 5.0,
        endY: 8.0,
        thickness: 0.3,
        isExterior: true,
      },
    ];

    snapWallCorners(walls, 0.35);

    // Both points should now match exactly at the cluster centroid (5.0, 3.0)
    expect(walls[0].endX).toBeCloseTo(5.0, 2);
    expect(walls[0].endY).toBeCloseTo(3.0, 2);
    expect(walls[1].startX).toBeCloseTo(5.0, 2);
    expect(walls[1].startY).toBeCloseTo(3.0, 2);
    expect(walls[0].endX).toBe(walls[1].startX);
    expect(walls[0].endY).toBe(walls[1].startY);
  });

  it('3. Test Hierarchy of Scale: Prioritizes labeled plan dimensions over estimates', () => {
    const mockRaw: AiPlanAnalysisResult = {
      imageWidth: 1000,
      imageHeight: 1000,
      confidence: 0.95,
      readDimensions: [
        {
          label: '8.00m',
          valueMeters: 8.0,
          startX: 100,
          startY: 100,
          endX: 900,
          endY: 100,
        },
      ],
      walls: [
        {
          id: 'w1',
          startX: 100,
          startY: 100,
          endX: 900,
          endY: 100,
          thickness: 0.3,
          isExterior: true,
        },
      ],
      doors: [],
      windows: [],
      rooms: [],
      furniture: [],
      stairs: [],
    };

    // Distance between 100 and 900 is 800px. With 8.00m, scale should be 100 px/m.
    const res = calibrateAndTransformPlan(mockRaw, undefined, {
      autoStraighten: true,
      roundDimensions: '5cm',
      useDefaultThickness: true,
    });

    expect(res.scaleSource).toBe('plan_dimension');
    expect(res.scalePixelsPerMeter).toBeCloseTo(100, 1);
    expect(res.realWidthM).toBeCloseTo(10.0, 1);

    // Wall length in meters: (900 - 100) / 100 = 8.00 m
    const calibratedWall = res.calibratedResult.walls[0];
    const wallLen = Math.hypot(
      calibratedWall.endX - calibratedWall.startX,
      calibratedWall.endY - calibratedWall.startY
    );
    expect(wallLen).toBeCloseTo(8.0, 1);
  });

  it('4. Test User Reference Calibration overrides estimates', () => {
    const mockRaw: AiPlanAnalysisResult = {
      imageWidth: 1000,
      imageHeight: 800,
      confidence: 0.9,
      readDimensions: [],
      walls: [
        {
          id: 'w1',
          startX: 0,
          startY: 0,
          endX: 1000,
          endY: 0,
          thickness: 0.3,
          isExterior: true,
        },
      ],
      doors: [],
      windows: [],
      rooms: [],
      furniture: [],
      stairs: [],
    };

    const userCalib: CalibrationData = {
      isCalibrated: true,
      point1: { x: 0, y: 0 },
      point2: { x: 500, y: 0 },
      referenceLengthMeters: 5.0,
      pixelsPerMeter: 100, // 500 px / 5 m = 100 px/m
      calibrationMethod: 'two_point_touch',
    };

    const res = calibrateAndTransformPlan(mockRaw, userCalib);
    expect(res.scaleSource).toBe('user_reference');
    expect(res.realWidthM).toBeCloseTo(10.0, 1);
  });

  it('5. Test convertAiPlanToCadObjects produces valid editable CAD models and diagnostic checks', () => {
    const mockCalibrated: AiPlanAnalysisResult = {
      imageWidth: 1000,
      imageHeight: 1000,
      confidence: 0.9,
      readDimensions: [],
      walls: [
        { id: 'w1', startX: 0, startY: 0, endX: 6.0, endY: 0, thickness: 0.3, isExterior: true },
        { id: 'w2', startX: 6.0, startY: 0, endX: 6.0, endY: 4.0, thickness: 0.3, isExterior: true },
        { id: 'w3', startX: 6.0, startY: 4.0, endX: 0, endY: 4.0, thickness: 0.3, isExterior: true },
        { id: 'w4', startX: 0, startY: 4.0, endX: 0, endY: 0, thickness: 0.3, isExterior: true },
      ],
      doors: [
        { id: 'd1', wallId: 'w1', x: 2.5, y: 0, width: 0.9, swingDirection: 'inside_right', type: 'single' },
      ],
      windows: [
        { id: 'win1', wallId: 'w3', x: 3.0, y: 4.0, width: 1.2, height: 1.25, sillHeight: 0.9, type: 'standard' },
      ],
      rooms: [
        {
          id: 'r1',
          name: 'Wohnbereich',
          type: 'living',
          polygon: [
            { x: 0, y: 0 },
            { x: 6.0, y: 0 },
            { x: 6.0, y: 4.0 },
            { x: 0, y: 4.0 },
          ],
          areaM2: 24.0,
        },
      ],
      furniture: [
        { id: 'f1', type: 'sofa', name: 'Sofa', x: 2.0, y: 2.0, width: 1.8, depth: 0.9, rotationDeg: 0 },
      ],
      stairs: [],
      roof: {
        type: 'gable',
        pitchDeg: 35,
        overhangM: 0.4,
      },
    };

    const cad = convertAiPlanToCadObjects(
      mockCalibrated,
      {
        targetDestination: 'current_floor',
        autoStraighten: true,
        roundDimensions: '5cm',
        useDefaultWallThickness: true,
        replaceWithLibraryFurniture: true,
        underlayOpacity: 0.4,
      },
      {
        exteriorWallThickness: 0.3,
        interiorWallThickness: 0.115,
        wallHeight: 2.6,
        roomHeight: 2.6,
        doorHeight: 2.05,
        windowHeight: 1.25,
        windowParapet: 0.9,
      } as any
    );

    expect(cad.walls.length).toBe(4);
    expect(cad.doors.length).toBe(1);
    expect(cad.windows.length).toBe(1);
    expect(cad.rooms.length).toBe(1);
    expect(cad.furniture.length).toBe(1);
    expect(cad.roof).toBeDefined();
    expect(cad.roof?.type).toBe('gable');
    expect(cad.qualityChecks.length).toBeGreaterThan(0);

    // Wall properties
    expect(cad.walls[0].isExterior).toBe(true);
    expect(cad.walls[0].thickness).toBe(0.3);
    expect(cad.walls[0].height).toBe(2.6);

    // Door properties
    expect(cad.doors[0].width).toBe(0.9);

    // Room properties
    expect(cad.rooms[0].name).toBe('Wohnbereich');
    expect(cad.rooms[0].areaM2).toBe(24.0);
  });
});
