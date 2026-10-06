import { describe, it, expect } from 'bun:test';
import { calculateSeamlessWallRenderData } from './cadMath';
import { createHolidayHouse6x8Template } from './templates';

describe('Wall Corner Geometry & Miter Tests', () => {
  it('1. Test Exterior wall corners have zero notches and perfectly matching flush miters', () => {
    const proj = createHolidayHouse6x8Template();
    const exteriorWalls = proj.floors[0].walls.filter((w) => w.isExterior);
    const renderData = calculateSeamlessWallRenderData(exteriorWalls);

    expect(renderData.length).toBe(4);

    const south = renderData.find((r) => r.wall.id === 'w_ext_south')!;
    const east = renderData.find((r) => r.wall.id === 'w_ext_east')!;
    const north = renderData.find((r) => r.wall.id === 'w_ext_north')!;
    const west = renderData.find((r) => r.wall.id === 'w_ext_west')!;

    expect(south).toBeDefined();
    expect(east).toBeDefined();
    expect(north).toBeDefined();
    expect(west).toBeDefined();

    // Exterior corner 1: South/West joint at (2.00, 8.00)
    // Both walls must meet at exact outer corner (1.85, 8.15) and inner corner (2.15, 7.85)
    // South starts at (2, 8): pStartLeft is outer (1.85, 8.15), pStartRight is inner (2.15, 7.85)
    expect(south.poly[0].x).toBeCloseTo(1.85, 2);
    expect(south.poly[0].y).toBeCloseTo(8.15, 2);
    expect(south.poly[3].x).toBeCloseTo(2.15, 2);
    expect(south.poly[3].y).toBeCloseTo(7.85, 2);

    // West ends at (2, 8): pEndLeft is outer (1.85, 8.15), pEndRight is inner (2.15, 7.85)
    expect(west.poly[1].x).toBeCloseTo(1.85, 2);
    expect(west.poly[1].y).toBeCloseTo(8.15, 2);
    expect(west.poly[2].x).toBeCloseTo(2.15, 2);
    expect(west.poly[2].y).toBeCloseTo(7.85, 2);

    // South/East joint at (10.00, 8.00):
    // South ends at (10, 8): pEndLeft is outer (10.15, 8.15), pEndRight is inner (9.85, 7.85)
    expect(south.poly[1].x).toBeCloseTo(10.15, 2);
    expect(south.poly[1].y).toBeCloseTo(8.15, 2);
    expect(south.poly[2].x).toBeCloseTo(9.85, 2);
    expect(south.poly[2].y).toBeCloseTo(7.85, 2);

    // East starts at (10, 8): pStartLeft is outer (10.15, 8.15), pStartRight is inner (9.85, 7.85)
    expect(east.poly[0].x).toBeCloseTo(10.15, 2);
    expect(east.poly[0].y).toBeCloseTo(8.15, 2);
    expect(east.poly[3].x).toBeCloseTo(9.85, 2);
    expect(east.poly[3].y).toBeCloseTo(7.85, 2);

    // East/North joint at (10.00, 2.00):
    // East ends at (10, 2): pEndLeft is outer (10.15, 1.85), pEndRight is inner (9.85, 2.15)
    expect(east.poly[1].x).toBeCloseTo(10.15, 2);
    expect(east.poly[1].y).toBeCloseTo(1.85, 2);
    expect(east.poly[2].x).toBeCloseTo(9.85, 2);
    expect(east.poly[2].y).toBeCloseTo(2.15, 2);

    // North starts at (10, 2): pStartLeft is outer (10.15, 1.85), pStartRight is inner (9.85, 2.15)
    expect(north.poly[0].x).toBeCloseTo(10.15, 2);
    expect(north.poly[0].y).toBeCloseTo(1.85, 2);
    expect(north.poly[3].x).toBeCloseTo(9.85, 2);
    expect(north.poly[3].y).toBeCloseTo(2.15, 2);

    // North/West joint at (2.00, 2.00):
    // North ends at (2, 2): pEndLeft is outer (1.85, 1.85), pEndRight is inner (2.15, 2.15)
    expect(north.poly[1].x).toBeCloseTo(1.85, 2);
    expect(north.poly[1].y).toBeCloseTo(1.85, 2);
    expect(north.poly[2].x).toBeCloseTo(2.15, 2);
    expect(north.poly[2].y).toBeCloseTo(2.15, 2);

    // West starts at (2, 2): pStartLeft is outer (1.85, 1.85), pStartRight is inner (2.15, 2.15)
    expect(west.poly[0].x).toBeCloseTo(1.85, 2);
    expect(west.poly[0].y).toBeCloseTo(1.85, 2);
    expect(west.poly[3].x).toBeCloseTo(2.15, 2);
    expect(west.poly[3].y).toBeCloseTo(2.15, 2);

    // All corners must suppress end caps so no seam lines or cutouts appear
    renderData.forEach((r) => {
      expect(r.hasStartCap).toBe(false);
      expect(r.hasEndCap).toBe(false);
    });
  });
});
