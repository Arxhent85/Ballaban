import { describe, it, expect } from 'bun:test';
import {
  calculateSmartSnap,
  calculateEqualSpacingRatio,
} from './cadSnapping';
import { Wall, DEFAULT_SNAP_SETTINGS, Window } from '../types/cad';

describe('CAD Snapping & Intelligent Guidelines Engine', () => {
  const baseWalls: Wall[] = [
    // Horizontal wall at y = 5, length 6m (from x=2 to x=8)
    {
      id: 'w1',
      start: { x: 2, y: 5 },
      end: { x: 8, y: 5 },
      thickness: 0.3,
      height: 2.5,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    },
    // Slanted 30-degree wall from (10, 10) to (10 + 4*cos(30°), 10 + 4*sin(30°))
    {
      id: 'w_slanted',
      start: { x: 10, y: 10 },
      end: {
        x: 10 + 4 * Math.cos((30 * Math.PI) / 180),
        y: 10 + 4 * Math.sin((30 * Math.PI) / 180),
      },
      thickness: 0.3,
      height: 2.5,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    },
  ];

  it('1. Test Parallel-Fang: erkennt parallele Wand und rastet ein', () => {
    // Drawing a new wall starting at (2, 2), moving cursor parallel to w_slanted (30°)
    const drawStart = { x: 2, y: 2 };
    const rad30 = (30 * Math.PI) / 180;
    const rawPos = {
      x: drawStart.x + 4.5 * Math.cos(rad30) + 0.03,
      y: drawStart.y + 4.5 * Math.sin(rad30) + 0.02,
    };
    const res = calculateSmartSnap({
      target: rawPos,
      origin: drawStart,
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
      currentTool: 'wall',
    });

    expect(res.snapped).toBe(true);
    expect(res.type).toBe('parallel');
    expect(res.symbol).toBe('//');
    expect(res.label).toContain('Parallel');
  });

  it('2. Test Rechtwinklig-Fang an schräger Wand (z. B. 30° / 120°)', () => {
    // Slanted wall is at 30°. Perpendicular angle is 30° + 90° = 120°.
    // Starting at (12, 12), cursor moving along 120° (dx = -2, dy = 3.464)
    const drawStart = { x: 12, y: 12 };
    const targetAngleRad = (120 * Math.PI) / 180;
    const rawPos = {
      x: drawStart.x + 3 * Math.cos(targetAngleRad) + 0.04,
      y: drawStart.y + 3 * Math.sin(targetAngleRad) + 0.03,
    };

    const res = calculateSmartSnap({
      target: rawPos,
      origin: drawStart,
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
      currentTool: 'wall',
    });

    expect(res.snapped).toBe(true);
    expect(res.type).toBe('right_angle');
    expect(res.symbol).toBe('⟂');
    expect(res.label).toContain('Rechtwinklig');
  });

  it('3. Test Gleiche Länge: 4. Wand rastet auf Länge der gegenüberliegenden Wand ein (6.00 m)', () => {
    // Start at (8, 10). Opposite wall w1 has length 6.00m.
    // Cursor is at (2.05, 10) ~ close to length 6.00m
    const drawStart = { x: 8, y: 10 };
    const rawPos = { x: 2.05, y: 10 };

    const res = calculateSmartSnap({
      target: rawPos,
      origin: drawStart,
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
      currentTool: 'wall',
    });

    expect(res.snapped).toBe(true);
    expect(res.type).toBe('equal_length');
    expect(res.symbol).toBe('=');
    expect(res.label).toContain('6.00m');
    const wallLen = Math.hypot(res.point.x - drawStart.x, res.point.y - drawStart.y);
    expect(Math.abs(wallLen - 6.00)).toBeLessThan(0.001);
  });

  it('4. Test Fluchtend / Verlängerungslinie: rastet auf Verlängerung einer Wand ein', () => {
    // Wall w1 ends at (8, 5). Cursor is at (12.0, 5.04) ~ near the horizontal extension line y=5.
    const rawPos = { x: 12.0, y: 5.04 };
    const res = calculateSmartSnap({
      target: rawPos,
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
    });

    expect(res.snapped).toBe(true);
    expect(['extension', 'alignment']).toContain(res.type);
    expect(Math.abs(res.point.y - 5.0)).toBeLessThan(0.01);
  });

  it('5. Test Gleiche Abstände für Türen & Fenster', () => {
    // Wall of length 10m from x=0 to x=10.
    const testWall: Wall = {
      id: 'tw1',
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
      thickness: 0.3,
      height: 2.5,
      isExterior: true,
      material: 'timber',
      referenceLine: 'center',
    };

    // Exactly center placement (ratio 0.49 close to 0.50)
    const snapCenter = calculateEqualSpacingRatio(testWall, 0.49, 1.0, [], [], 50);
    expect(snapCenter).not.toBeNull();
    expect(snapCenter.ratio).toBe(0.5);
    expect(snapCenter.label).toContain('mitte');

    // With an existing window at ratio 0.25 (2.5m from start)
    const existingWindows: Window[] = [
      {
        id: 'win1',
        wallId: 'tw1',
        position: 0.25,
        width: 1.0,
        height: 1.2,
        parapetHeight: 0.9,
        type: 'turn_tilt',
        frameColor: '#ffffff',
        glazing: '3',
        hasInteriorSill: true,
        hasExteriorSill: true,
      },
    ];
    // Dragging near equal distance from other corner (1.0 - 0.25 = 0.75)
    const snapSymmetric = calculateEqualSpacingRatio(testWall, 0.76, 1.0, [], existingWindows, 50);
    expect(snapSymmetric).not.toBeNull();
    expect(snapSymmetric.ratio).toBe(0.75);
    expect(snapSymmetric.label).toContain('Randabstand');
  });

  it('6. Test Ausrichtungslinie: erkennt vertikale / horizontale Flucht an Objekten', () => {
    // Wall w1 start is at x=2, y=5. Cursor at x=2.03, y=14.0 (fluchtet vertikal mit Startpunkt)
    const rawPos = { x: 2.03, y: 14.0 };
    const res = calculateSmartSnap({
      target: rawPos,
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
    });

    expect(res.snapped).toBe(true);
    expect(res.type).toBe('alignment');
    expect(Math.abs(res.point.x - 2.0)).toBeLessThan(0.01);
  });

  it('7. Test Mittelpunkt, Schnittpunkt und Lotpunkt', () => {
    // 7a: Midpoint of w1 (2,5) to (8,5) is (5, 5)
    const midRes = calculateSmartSnap({
      target: { x: 5.03, y: 5.02 },
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
    });
    expect(midRes.snapped).toBe(true);
    expect(midRes.type).toBe('midpoint');
    expect(midRes.point.x).toBe(5);
    expect(midRes.point.y).toBe(5);

    // 7b: Perpendicular foot (Lotpunkt) from drawStart (5, 9) dropping onto w1 (y=5)
    const lotRes = calculateSmartSnap({
      target: { x: 5.02, y: 5.01 },
      origin: { x: 5, y: 9 },
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
      currentTool: 'wall',
    });
    expect(lotRes.snapped).toBe(true);
    expect(['lot', 'midpoint', 'endpoint']).toContain(lotRes.type);

    // 7c: Endpoint of w1 (2, 5)
    const endRes = calculateSmartSnap({
      target: { x: 2.04, y: 5.02 },
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
    });
    expect(endRes.snapped).toBe(true);
    expect(endRes.type).toBe('endpoint');
    expect(endRes.point.x).toBe(2);
    expect(endRes.point.y).toBe(5);
  });

  it('8. Test Versatz-Fang: parallel in 2.50m Abstand', () => {
    // Wall w1 is at y=5. Parallel offset of 2.50m is at y=7.50m.
    // Cursor at x=4.0, y=7.53
    const offsetRes = calculateSmartSnap({
      target: { x: 4.0, y: 7.53 },
      settings: { ...DEFAULT_SNAP_SETTINGS, offsetDistance: 2.50 },
      walls: baseWalls,
      zoom: 50,
    });

    expect(offsetRes.snapped).toBe(true);
    expect(offsetRes.type).toBe('offset');
    expect(Math.abs(offsetRes.point.y - 7.5)).toBeLessThan(0.01);
    expect(offsetRes.label).toContain('Versatz');
  });

  it('9. Test Tab-Taste / Kandidaten-Umschaltung', () => {
    // Near (5, 5), there are multiple candidates: midpoint of w1, edge, offset/alignment lines
    const cand1 = calculateSmartSnap({
      target: { x: 5.02, y: 5.02 },
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
      candidateIndex: 0,
    });

    const cand2 = calculateSmartSnap({
      target: { x: 5.02, y: 5.02 },
      settings: DEFAULT_SNAP_SETTINGS,
      walls: baseWalls,
      zoom: 50,
      candidateIndex: 1,
    });

    expect(cand1.snapped).toBe(true);
    expect(cand1.candidatesCount).toBeGreaterThanOrEqual(1);
    expect(cand2.snapped).toBe(true);
  });

  it('10. Test Magnetische Höhenübertragung an gegenüberliegende Wand (Pultdach 2.50m -> 4.50m) und Eckhöhe', () => {
    // Sloped wall w_slope: (2, 0) -> (8, 0), height: 2.50, endHeight: 4.50
    const slopedWall: Wall = {
      id: 'w_slope',
      start: { x: 2, y: 0 },
      end: { x: 8, y: 0 },
      thickness: 0.3,
      height: 2.50,
      endHeight: 4.50,
      isExterior: true,
      material: 'timber',
      referenceLine: 'center',
    };

    // 10a: Drawing parallel wall from (2, 5) heading to (8, 5)
    // Cursor at (7.9, 5.05), parallel to w_slope
    const parRes = calculateSmartSnap({
      target: { x: 7.9, y: 5.05 },
      origin: { x: 2, y: 5 },
      settings: DEFAULT_SNAP_SETTINGS,
      walls: [slopedWall],
      zoom: 50,
      currentTool: 'wall',
    });

    expect(parRes.snapped).toBe(true);
    // Should attach matchedHeights from w_slope
    expect(parRes.matchedHeights).toBeDefined();
    expect(parRes.matchedHeights?.height).toBe(2.50);
    expect(parRes.matchedHeights?.endHeight).toBe(4.50);

    // 10b: Corner snap to endpoint (8, 0) which is at 4.50m
    const cornerRes = calculateSmartSnap({
      target: { x: 8.02, y: 0.02 },
      settings: DEFAULT_SNAP_SETTINGS,
      walls: [slopedWall],
      zoom: 50,
      currentTool: 'wall',
    });

    expect(cornerRes.snapped).toBe(true);
    expect(cornerRes.type).toBe('endpoint');
    expect(cornerRes.matchedHeights).toBeDefined();
    expect(cornerRes.matchedHeights?.height).toBe(4.50);
  });
});
