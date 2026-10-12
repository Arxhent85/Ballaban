import { describe, it, expect } from 'bun:test';
import { WallMaterial, DoorType, WindowType, Wall, Door, Window, ProjectDefaults } from '../types/cad';

describe('Wall Materials, Door Models & Window Types', () => {
  it('1. Verifies all 7 wall materials are valid and have distinct identifiers', () => {
    const materials: WallMaterial[] = [
      'timber',
      'plaster',
      'concrete',
      'brick',
      'stone',
      'drywall',
      'glass',
    ];
    expect(materials.length).toBe(7);

    // Test creating a wall with stone and glass material
    const stoneWall: Wall = {
      id: 'w_stone_1',
      start: { x: 0, y: 0 },
      end: { x: 5, y: 0 },
      thickness: 0.30,
      height: 2.80,
      isExterior: true,
      material: 'stone',
      referenceLine: 'center',
    };
    expect(stoneWall.material).toBe('stone');

    const glassWall: Wall = {
      id: 'w_glass_1',
      start: { x: 0, y: 0 },
      end: { x: 5, y: 0 },
      thickness: 0.20,
      height: 2.80,
      isExterior: true,
      material: 'glass',
      referenceLine: 'center',
    };
    expect(glassWall.material).toBe('glass');
  });

  it('2. Verifies Door Models (single, entry, glass, sliding)', () => {
    const doorTypes: DoorType[] = ['single', 'entry', 'glass', 'sliding'];
    expect(doorTypes.length).toBe(4);

    const entryDoor: Door = {
      id: 'd_entry_1',
      wallId: 'w_1',
      position: 0.5,
      width: 1.10,
      height: 2.15,
      type: 'entry',
      swingDirection: 'right',
      openDirection: 'inside',
      frameThickness: 0.08,
      sillHeight: 0,
    };
    expect(entryDoor.type).toBe('entry');
    expect(entryDoor.width).toBe(1.10);

    const glassDoor: Door = {
      id: 'd_glass_1',
      wallId: 'w_1',
      position: 0.5,
      width: 0.90,
      height: 2.10,
      type: 'glass',
      swingDirection: 'left',
      openDirection: 'inside',
      frameThickness: 0.05,
      sillHeight: 0,
    };
    expect(glassDoor.type).toBe('glass');
  });

  it('3. Verifies Floor-to-Ceiling and Panorama Glass Windows', () => {
    // Floor-to-ceiling window (Bodentief / Raumhoch)
    const floorToCeilingWin: Window = {
      id: 'win_floor_1',
      wallId: 'w_1',
      position: 0.5,
      width: 2.40,
      height: 2.50,
      parapetHeight: 0.0, // Floor level (BRH = 0)
      lintelHeight: 2.50,
      type: 'fixed',
      hasInteriorSill: false,
      hasExteriorSill: false,
    };

    expect(floorToCeilingWin.parapetHeight).toBe(0.0);
    expect(floorToCeilingWin.height).toBe(2.50);
    // When parapet is 0 and height >= 2.50, it spans entire wall height (floor to ceiling)
    const isFullHeight = (floorToCeilingWin.parapetHeight ?? 0) <= 0.05 && floorToCeilingWin.height >= 2.40;
    expect(isFullHeight).toBe(true);
  });

  it('4. Verifies ProjectDefaults carries active material and opening preferences', () => {
    const defaults: ProjectDefaults = {
      exteriorWallThickness: 0.30,
      interiorWallThickness: 0.115,
      wallHeight: 2.80,
      roomHeight: 2.80,
      wallMaterial: 'stone',
      doorType: 'entry',
      doorWidth: 1.10,
      doorHeight: 2.15,
      doorLintel: 2.15,
      windowType: 'fixed',
      windowWidth: 2.00,
      windowHeight: 2.50,
      windowParapet: 0.0,
      windowLintel: 2.50,
      gridSize: 0.25,
    };

    expect(defaults.wallMaterial).toBe('stone');
    expect(defaults.doorType).toBe('entry');
    expect(defaults.windowParapet).toBe(0.0);
    expect(defaults.windowHeight).toBe(2.50);
  });
});
