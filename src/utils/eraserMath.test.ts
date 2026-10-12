import { describe, it, expect } from 'bun:test';
import { eraseWallSegment } from './eraserMath';
import { Wall } from '../types/cad';

describe('Paint-Style Segment Eraser Engine', () => {
  const baseWall: Wall = {
    id: 'w1',
    start: { x: 0, y: 0 },
    end: { x: 10, y: 0 },
    thickness: 0.24,
    height: 2.8,
    isExterior: true,
  };

  it('1. Erasing in the middle splits wall into two segments with an erased gap', () => {
    // Click at middle (x=5.0, y=0.0), ratio = 0.5, bite = 0.6m
    const res = eraseWallSegment(baseWall, { x: 5, y: 0 }, 0.5, 0.6);
    expect(res.action).toBe('split');
    expect(res.updatedWall).toBeDefined();
    expect(res.newWall).toBeDefined();

    // First segment from 0 to 4.7
    expect(res.updatedWall!.start).toEqual({ x: 0, y: 0 });
    expect(res.updatedWall!.end).toEqual({ x: 4.7, y: 0 });

    // Second segment from 5.3 to 10
    expect(res.newWall!.start).toEqual({ x: 5.3, y: 0 });
    expect(res.newWall!.end).toEqual({ x: 10, y: 0 });
  });

  it('2. Erasing near start trims start of wall forward without splitting', () => {
    // Click near start (x=0.2, y=0.0), ratio = 0.02, bite = 0.6m
    const res = eraseWallSegment(baseWall, { x: 0.2, y: 0 }, 0.02, 0.6);
    expect(res.action).toBe('trim_start');
    expect(res.updatedWall).toBeDefined();
    expect(res.newWall).toBeUndefined();

    // Click at 0.2 + 0.3 = 0.5 -> new start at (0.5, 0)
    expect(res.updatedWall!.start).toEqual({ x: 0.5, y: 0 });
    expect(res.updatedWall!.end).toEqual({ x: 10, y: 0 });
  });

  it('3. Erasing near end trims end of wall backward without splitting', () => {
    // Click near end (x=9.8, y=0.0), ratio = 0.98, bite = 0.6m
    const res = eraseWallSegment(baseWall, { x: 9.8, y: 0 }, 0.98, 0.6);
    expect(res.action).toBe('trim_end');
    expect(res.updatedWall).toBeDefined();
    expect(res.newWall).toBeUndefined();

    // Click at 9.8 - 0.3 = 9.5 -> new end at (9.5, 0)
    expect(res.updatedWall!.start).toEqual({ x: 0, y: 0 });
    expect(res.updatedWall!.end).toEqual({ x: 9.5, y: 0 });
  });

  it('4. Erasing a short wall completely deletes the wall', () => {
    const shortWall: Wall = {
      ...baseWall,
      id: 'w_short',
      start: { x: 0, y: 0 },
      end: { x: 0.4, y: 0 },
    };
    const res = eraseWallSegment(shortWall, { x: 0.2, y: 0 }, 0.5, 0.6);
    expect(res.action).toBe('delete');
  });
});
