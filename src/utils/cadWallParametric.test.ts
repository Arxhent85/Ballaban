import { describe, it, expect } from 'bun:test';
import { resizeWallParametrically } from './cadWallParametric';
import { Wall } from '../types/cad';

describe('Parametric Wall Dimension & Connected Topology Engine', () => {
  it('1. Resizes wall from 4.0m to 6.0m with start anchor (end moves forward)', () => {
    const wall1: Wall = {
      id: 'w1',
      start: { x: 0, y: 0 },
      end: { x: 4, y: 0 },
      thickness: 0.30,
      height: 2.50,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const res = resizeWallParametrically(wall1, 6.0, 'start', [wall1]);
    expect(res.updatedWall.start.x).toBe(0);
    expect(res.updatedWall.start.y).toBe(0);
    expect(res.updatedWall.end.x).toBe(6);
    expect(res.updatedWall.end.y).toBe(0);
  });

  it('2. Resizes wall with connected perpendicular corner wall staying attached', () => {
    // Wall 1: (0,0) to (5,0)
    const wall1: Wall = {
      id: 'w1',
      start: { x: 0, y: 0 },
      end: { x: 5, y: 0 },
      thickness: 0.30,
      height: 2.50,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    // Wall 2 connected at (5,0) going to (5,6)
    const wall2: Wall = {
      id: 'w2',
      start: { x: 5, y: 0 },
      end: { x: 5, y: 6 },
      thickness: 0.30,
      height: 2.50,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    // Resize wall1 from 5.0m to 7.0m (start fixed at 0, end extends to 7,0)
    const res = resizeWallParametrically(wall1, 7.0, 'start', [wall1, wall2], true);

    expect(res.updatedWall.end.x).toBe(7);
    expect(res.updatedWall.end.y).toBe(0);

    // Wall 2 start was at (5,0), now should be pulled to (7,0) so the corner stays closed!
    const updatedWall2 = res.allUpdatedWalls.find((w) => w.id === 'w2')!;
    expect(updatedWall2.start.x).toBe(7);
    expect(updatedWall2.start.y).toBe(0);
    expect(updatedWall2.end.x).toBe(5);
    expect(updatedWall2.end.y).toBe(6);
  });

  it('3. Resizes wall symmetrically with center anchor', () => {
    const wall: Wall = {
      id: 'w1',
      start: { x: 2, y: 0 },
      end: { x: 6, y: 0 }, // Length 4.0m, mid (4, 0)
      thickness: 0.30,
      height: 2.50,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const res = resizeWallParametrically(wall, 8.0, 'center', [wall]);
    expect(res.updatedWall.start.x).toBe(0);
    expect(res.updatedWall.end.x).toBe(8);
  });
});
